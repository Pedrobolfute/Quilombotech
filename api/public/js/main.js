const initialLat = -12.97; 
const initialLon = -38.50; 
const initialZoom = 13;

window.allMarkers = []; 
window.map = null;

const map = L.map('map', { zoomControl: false }).setView([initialLat, initialLon], initialZoom);
window.map = map; 

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

async function loadHistoricPoints() {
    try {
        let points = [];
        try {
            const response = await fetch('http://localhost:3000/api/points'); 
            
            if (response.ok) {
                points = await response.json();
                console.log("Dados recebidos (Verifique os nomes dos campos):", points);
            } else {
                throw new Error("API retornou erro");
            }
        } catch (apiError) {
            console.warn("API Offline. Usando dados de backup.");
            points = [
                {
                    name: "API Desconectada",
                    year: 2024,
                    latitude: -12.97,
                    longitude: -38.50,
                    description: "Verifique se o backend está rodando."
                }
            ];
        }

        const sidebarList = document.querySelector('.hero-list');
        if (sidebarList) sidebarList.innerHTML = '';

        window.allMarkers.forEach(marker => map.removeLayer(marker));
        window.allMarkers = [];

        points.forEach(point => {

            const lat = point.latitude || point.lat || point._latitude || point.location?._latitude;
            const lng = point.longitude || point.lng || point._longitude || point.location?._longitude;

            const name = point.name || point.title || point.nome || point.titulo || "Local sem nome";
            const description = point.description || point.desc || point.info || point.descricao || "Sem descrição.";
            
            const rawYear = point.year || point.ano || point.data;
            const displayYear = rawYear || "";

            if (lat && lng) {
                const marker = L.marker([parseFloat(lat), parseFloat(lng)]).addTo(map);

                marker.bindPopup(`
                    <div class="quilombo-popup">
                        <h3>${name}</h3>
                        <div class="popup-meta">
                            <span class="popup-year">${displayYear}</span>
                        </div>
                        <p>${description}</p>
                    </div>
                `);

                window.allMarkers.push(marker);

                if (sidebarList) {
                    const card = document.createElement('div');
                    card.className = 'hero-card interactive-card'; 
                    
                    card.innerHTML = `
                        <div class="card-header">
                            <span class="card-year">${displayYear}</span>
                            <h3>${name}</h3>
                        </div>
                        <p>${description.substring(0, 80) + (description.length > 80 ? '...' : '')}</p>
                    `;

                    card.addEventListener('click', () => {
                        map.closePopup();

                        map.flyTo([lat, lng], 15, { duration: 1.5 });

                        map.once('moveend', () => {
                            marker.openPopup();
                        });

                        document.querySelectorAll('.hero-card').forEach(c => c.classList.remove('selected'));
                        card.classList.add('selected');
                    });
                    
                    sidebarList.appendChild(card);
                }
            }
        });

        const countEl = document.querySelector('.count-box .count');
        if(countEl) countEl.textContent = points.length;
        const footerCount = document.querySelector('.footer-count');
        if(footerCount) footerCount.textContent = `${points.length} locais carregados`;

    } catch (err) {
        console.error("ERRO GERAL:", err);
    }
}

loadHistoricPoints();