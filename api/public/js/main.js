const initialLat = -12.97; 
const initialLon = -38.50; 
const initialZoom = 13;

const map = L.map('map', {
    zoomControl: false 
}).setView([initialLat, initialLon], initialZoom);


window.map = map;
window.allMarkers = []; 

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

async function loadHistoricPoints() {
    try {
        let points = [];
        try {
            const response = await fetch('/api/points');
            if (response.ok) points = await response.json();
            else throw new Error("API Offline");
        } catch (e) {
            console.warn("Usando dados de exemplo (Mock)");
            points = [
                { name: "Elevador Lacerda", description: "Conexão histórica.", latitude: -12.9696, longitude: -38.5113 },
                { name: "Bonfim", description: "Igreja sagrada.", latitude: -12.9248, longitude: -38.5042 },
                { name: "Casa Branca", description: "Terreiro antigo.", latitude: -12.9922, longitude: -38.4877 }
            ];
        }

        points.forEach(point => {
            const lat = point.latitude || point.lat || point._latitude;
            const lng = point.longitude || point.lng || point._longitude;

            if (lat && lng) {
                const marker = L.marker([lat, lng]).addTo(map);
                
                marker.bindPopup(`
                    <div style="text-align:center">
                        <b>${point.name || point.title}</b><br>
                        ${point.description || point.info}
                    </div>
                `);
                // 2. Adiciona o evento de mouseover para abrir o popup
                marker.on('mouseover', function () {
                    this.openPopup();
                });

                // 3. Adiciona o evento de mouseout para fechar o popup
                marker.on('mouseout', function () {
                    this.closePopup();

                 });
                
                window.allMarkers.push(marker);
            }
        });

        const countEl = document.querySelector('.count-box .count');
        if(countEl) countEl.textContent = points.length;
        const footerCount = document.querySelector('.footer-count');
        if(footerCount) footerCount.textContent = `${points.length} locais carregados`;

    } catch (err) {
        console.error("ERRO:", err);
    }
}

loadHistoricPoints();