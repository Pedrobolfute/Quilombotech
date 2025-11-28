import { FilesetResolver, HandLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/+esm";

let handLandmarker;
let lastVideoTime = -1;
let lastActionTime = 0;
const ZOOM_COOLDOWN = 1200; 
const NAV_INTERVAL = 50;    
let lastNavTime = 0;
const MOVE_STEP = 30; 

const video = document.getElementById("webcam");
const statusText = document.getElementById("status-text");
const statusLight = document.getElementById("status-light");
const fingerTracker = document.getElementById("finger-tracker");

const arrows = {
    up: document.getElementById("arrow-up"),
    down: document.getElementById("arrow-down"),
    left: document.getElementById("arrow-left"),
    right: document.getElementById("arrow-right")
};

function checkCrosshairCollision() {
    if (!window.map || !window.allMarkers) return;

    const map = window.map;
    const crosshairEl = document.getElementById('center-crosshair');
    const mapDiv = document.getElementById('map');

    if (!crosshairEl || !mapDiv) return;
    const crossRect = crosshairEl.getBoundingClientRect();
    const crossX = crossRect.left + crossRect.width / 2;
    const crossY = crossRect.top + crossRect.height / 2;

    const mapRect = mapDiv.getBoundingClientRect();
    const targetPoint = L.point(
        crossX - mapRect.left,
        crossY - mapRect.top
    );

    const ACTIVATION_RADIUS = 60; 

    window.allMarkers.forEach(marker => {
        const markerPoint = map.latLngToContainerPoint(marker.getLatLng());

        const distance = targetPoint.distanceTo(markerPoint);

        if (distance < ACTIVATION_RADIUS) {
            if (!marker.isPopupOpen()) {
                marker.openPopup();
                
                if(statusText) {
                    statusText.innerText = "📍 Info Aberta";
                    statusText.style.color = "#d63384"; 
                }
            }
        } else {
            if (marker.isPopupOpen()) {
                marker.closePopup();
                
                if(statusText && statusText.innerText === "📍 Info Aberta") {
                    statusText.innerText = "Navegando...";
                    statusText.style.color = "";
                }
            }
        }
    });
}

async function setupVision() {
    try {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 1
        });
        startCamera();
    } catch (e) {
        if(statusText) statusText.innerText = "Erro ao carregar IA";
    }
}

function startCamera() {
    if(!video) return;
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
        video.srcObject = stream;
        video.addEventListener("loadeddata", predictWebcam);
        if(statusText) statusText.innerText = "Sistema Pronto";
        if(statusLight) statusLight.className = "indicator nav";
    });
}

async function predictWebcam() {
    let startTimeMs = performance.now();
    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        
        checkCrosshairCollision();

        if (handLandmarker) {
            const results = handLandmarker.detectForVideo(video, startTimeMs);
            if (results.landmarks && results.landmarks.length > 0) {
                processGestures(results.landmarks[0]);
            } else {
                if(fingerTracker) fingerTracker.style.display = 'none';
                resetArrows();
                if(statusText) statusText.innerText = "Nenhuma mão";
                if(statusLight) statusLight.className = "indicator";
            }
        }
    }
    window.requestAnimationFrame(predictWebcam);
}

function resetArrows() {
    Object.values(arrows).forEach(el => el?.classList.remove('active'));
}

function getHandState(landmarks) {
    const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
    const wrist = landmarks[0];
    let extendedCount = 0;
    const fingers = [[8,6], [12,10], [16,14], [20,18]];
    
    for (let f of fingers) {
        const tip = landmarks[f[0]];
        const pip = landmarks[f[1]];
        if (dist(wrist, tip) > dist(wrist, pip) * 1.0) extendedCount++;
    }

    if (extendedCount === 0) return 'CLOSED'; 
    if (extendedCount >= 3) return 'OPEN';   
    
    const indexExtended = dist(wrist, landmarks[8]) > dist(wrist, landmarks[6]);
    const middleFolded = dist(wrist, landmarks[12]) < dist(wrist, landmarks[10]) * 1.3;
    
    if (indexExtended && middleFolded && extendedCount <= 2) return 'INDEX_ONLY';
    return 'NEUTRAL';
}

function processGestures(landmarks) {
    const now = Date.now();
    const state = getHandState(landmarks);
    const indexTip = landmarks[8];
    const map = window.map; 

    if(fingerTracker) {
        fingerTracker.style.display = 'block';
        fingerTracker.style.left = `${(1 - indexTip.x) * 100}%`; 
        fingerTracker.style.top = `${indexTip.y * 100}%`;
    }
    
    resetArrows();

    if (now - lastActionTime > ZOOM_COOLDOWN) {
        if (state === 'CLOSED') {
            if (map) map.zoomIn();
            if(statusText) statusText.innerText = "ZOOM IN (+)";
            if(statusLight) statusLight.className = "indicator zoom";
            lastActionTime = now;
            return;
        }
        if (state === 'OPEN') {
            if (map) map.zoomOut();
            if(statusText) statusText.innerText = "ZOOM OUT (-)";
            if(statusLight) statusLight.className = "indicator zoom";
            lastActionTime = now;
            return;
        }
    } else if (state === 'CLOSED' || state === 'OPEN') {
        if(statusText) statusText.innerText = "Aguardando Zoom...";
        if(statusLight) statusLight.className = "indicator wait";
        return;
    }

    if (state === 'INDEX_ONLY' && now - lastNavTime > NAV_INTERVAL) {
        let dx = 0;
        let dy = 0;
        const margin = 0.35; 

        if (indexTip.x < margin) { 
            if(arrows.right) arrows.right.classList.add('active'); 
            dx = MOVE_STEP; 
            if(statusText) statusText.innerText = "Movendo Direita";
        } else if (indexTip.x > (1 - margin)) {
            if(arrows.left) arrows.left.classList.add('active'); 
            dx = -MOVE_STEP; 
            if(statusText) statusText.innerText = "Movendo Esquerda";
        }

        if (indexTip.y < margin) {
            if(arrows.up) arrows.up.classList.add('active'); 
            dy = -MOVE_STEP; 
            if(statusText) statusText.innerText = "Movendo Cima";
        } else if (indexTip.y > (1 - margin)) {
            if(arrows.down) arrows.down.classList.add('active'); 
            dy = MOVE_STEP; 
            if(statusText) statusText.innerText = "Movendo Baixo";
        }

        if ((dx !== 0 || dy !== 0) && map) {
            map.panBy([dx, dy]);
            if(statusLight) statusLight.className = "indicator nav";
            lastNavTime = now;
            
        } else {
            if(statusText) statusText.innerText = "Navegar (Centro)";
            if(statusLight) statusLight.className = "indicator nav";
        }
    } else if (state === 'NEUTRAL') {
        if(statusText) statusText.innerText = "Neutro";
        if(statusLight) statusLight.className = "indicator";
    }
}

setupVision();