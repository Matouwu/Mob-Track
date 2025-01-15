"use strict";

function createLayer(data, selectedCircuit = null) {
    return L.geoJSON(data, {
        filter: function(feature) {
            if (!selectedCircuit) return true;
            return feature.properties.name === selectedCircuit;
        },
        style: function(feature) {
            return {
                color: '#2c5282',
                weight: 3,
                opacity: 1,
                fillColor: '#4299e1',
                fillOpacity: 0.7
            };
        },
        onEachFeature: function(feature, layer) {
            const popupContent = `
                <div class="circuit-popup">
                    <h3>${feature.properties.name}</h3>
                    <p>Length: ${feature.properties.length || 'N/A'}</p>
                </div>
            `;
            layer.bindPopup(popupContent);

            layer.on({
                mouseover: function(e) {
                    const layer = e.target;
                    layer.setStyle({
                        weight: 5,
                        color: '#2b6cb0',
                        fillOpacity: 0.9
                    });
                    layer.bringToFront();
                },
                mouseout: function(e) {
                    const layer = e.target;
                    layer.setStyle({
                        weight: 3,
                        color: '#2c5282',
                        fillOpacity: 0.7
                    });
                }
            });
        }
    });
}

function createAccidentMarker(feature, latlng) {
    return L.circleMarker(latlng, {
        radius: 8,
        fillColor: "#ff4444",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    }).bindPopup(`
        <strong>Détails de l'accident</strong><br>
        ${feature.properties.description || 'Pas de description disponible'}
    `);
}

function getRiskZoneStyle() {
    return {
        fillColor: '#ff6b6b',
        weight: 2,
        opacity: 0.7,
        color: '#c92a2a',
        fillOpacity: 0.35
    };
}

let accidentsLayer = null;
let riskZonesLayer = null;
let circuitsLayer = null;

window.onload = async () => {
    let map = L.map('map', {
        center: [30.135, -97.633],
        zoom: 17
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 15,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
    }).addTo(map);

    try {
        // Chargement des données GeoJSON
        const [circuitsResponse, accidentsResponse, riskZonesResponse] = await Promise.all([
            fetch("f1-circuits.geojson"),
            fetch("accidents.geojson"),
            fetch("risk-zones.geojson")
        ]);

        const circuitsData = await circuitsResponse.json();
        const accidentsData = await accidentsResponse.json();
        const riskZonesData = await riskZonesResponse.json();

        // Initialisation des couches
        circuitsLayer = createLayer(circuitsData).addTo(map);

        accidentsLayer = L.geoJSON(accidentsData, {
            pointToLayer: createAccidentMarker
        }).addTo(map);

        riskZonesLayer = L.geoJSON(riskZonesData, {
            style: getRiskZoneStyle,
            onEachFeature: (feature, layer) => {
                layer.bindPopup(`
                    <strong>Zone à risque</strong><br>
                    ${feature.properties.description || 'Zone à haut risque'}
                `);
            }
        }).addTo(map);

        // Gestion de la sélection des circuits
        let select = document.getElementById("cir_f1");
        select.onchange = e => {
            const selectedCircuit = e.target.value;

            if (circuitsLayer) {
                map.removeLayer(circuitsLayer);
            }

            circuitsLayer = createLayer(circuitsData, selectedCircuit);

            circuitsLayer.addTo(map);
            circuitsLayer.eachLayer(layer => {
                layer.getElement().style.transition = 'opacity 0.5s';
                layer.getElement().style.opacity = '0';
                setTimeout(() => {
                    layer.getElement().style.opacity = '1';
                }, 50);
            });

            const bounds = circuitsLayer.getBounds();
            map.flyToBounds(bounds, {
                padding: [50, 50],
                duration: 1
            });

            if (accidentsLayer && riskZonesLayer) {
                const circuitBounds = circuitsLayer.getBounds();

                accidentsLayer.eachLayer(layer => {
                    const isNearCircuit = circuitBounds.contains(layer.getLatLng());
                    layer.getElement().style.transition = 'opacity 0.5s';
                    layer.getElement().style.opacity = isNearCircuit ? '1' : '0.3';
                });

                riskZonesLayer.eachLayer(layer => {
                    const isOverlapping = circuitBounds.overlaps(layer.getBounds());
                    layer.getElement().style.transition = 'opacity 0.5s';
                    layer.getElement().style.opacity = isOverlapping ? '1' : '0.3';
                });
            }
        };

    } catch (error) {
        console.error("Erreur lors du chargement des données GeoJSON:", error);
        alert("Erreur lors du chargement des données de la carte. Veuillez réessayer plus tard.");
    }
};
