// Localização inicial focada em Salvador/Bahia
const initialLat = -12.97; 
const initialLon = -38.50; 
const initialZoom = 13;

// Dados de Exemplo (MOCK DATA) para testar o mapa e os marcadores
const mockPoints = [
    {
        name: "Elevador Lacerda",
        description: "Ponto de conexão entre Cidade Baixa e Cidade Alta.",
        latitude: -12.9696,
        longitude: -38.5113
    },
    {
        name: "Igreja de Nosso Senhor do Bonfim",
        description: "Famosa igreja de devoção popular.",
        latitude: -12.9248,
        longitude: -38.5042
    },
    {
        name: "Terreiro Casa Branca",
        description: "Um dos mais antigos terreiros de Candomblé do Brasil.",
        latitude: -12.9922, 
        longitude: -38.4877
    }
];

// Inicializa o mapa Leaflet
const map = L.map('map').setView([initialLat, initialLon], initialZoom);

// Adiciona uma camada de Tiles (OpenStreetMap é o padrão)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Função para carregar os pontos históricos (AGORA USA DADOS MOCKADOS)
async function loadHistoricPoints() {
    try {
        const response = await fetch('/api/points');

        if (!response.ok) {
            throw new Error("Erro ao carregar pontos");
        }

        const points = await response.json();

        points.forEach(point => {
            if (point.latitude && point.longitude) {
                const marker = L.marker([point.latitude, point.longitude]).addTo(map);

                marker.bindPopup(`
                    <b>${point.title}</b><br>
                    ${point.info}
                `);
            }
        });

        // Atualiza contagem
        document.querySelector('.count-box .count').textContent = points.length;

    } catch (err) {
        console.error("ERRO AO BUSCAR PONTOS:", err);
    }
}


// Chama a função ao carregar o script
loadHistoricPoints();