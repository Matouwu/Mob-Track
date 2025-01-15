"use strict";

function getCircuitRiskLevel(accidents) {
    if (accidents === 0) return { level: 'low', text: 'Risque faible' };
    if (accidents === 1) return { level: 'moderate', text: 'Risque modéré' };
    if (accidents === 2) return { level: 'high', text: 'Risque élevé' };
    return { level: 'extreme', text: 'Risque extrême' };
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
        <strong>Accident Details</strong><br>
        ${feature.properties.description || 'No description available'}
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

function findNearestCircuit(accidentCoords, circuits) {
    let nearestCircuit = null;
    let minDistance = Infinity;

    circuits.features.forEach(circuit => {
        // Convertir les coordonnées du circuit en tableau de points
        const circuitPoints = circuit.geometry.coordinates.map(coord => L.latLng(coord[1], coord[0]));

        // Créer un point pour l'accident
        const accidentPoint = L.latLng(accidentCoords[1], accidentCoords[0]);

        // Trouver le point le plus proche sur le circuit
        let minDistToCircuit = Infinity;
        circuitPoints.forEach(point => {
            const dist = accidentPoint.distanceTo(point);
            if (dist < minDistToCircuit) {
                minDistToCircuit = dist;
            }
        });

        if (minDistToCircuit < minDistance) {
            minDistance = minDistToCircuit;
            nearestCircuit = circuit;
        }
    });

    // Si la distance est inférieure à 1km (1000m), considérer que l'accident est lié à ce circuit
    return minDistance < 1000 ? nearestCircuit : null;
}

function populateCircuitSelector(circuits, selectedRisk = 'all') {
    const select = document.getElementById("cir_f1");
    select.innerHTML = '<option value="">Sélectionnez un circuit</option>';

    const filteredCircuits = circuits.features.filter(feature => {
        if (selectedRisk === 'all') return true;
        const accidents = feature.properties.accidents || 0;
        return getCircuitRiskLevel(accidents).level === selectedRisk;
    });

    const circuitNames = filteredCircuits
        .map(feature => ({
            name: feature.properties.Name,
            accidents: feature.properties.accidents || 0
        }))
        .sort((a, b) => b.accidents - a.accidents);

    circuitNames.forEach(circuit => {
        const option = document.createElement('option');
        option.value = circuit.name;
        option.textContent = `${circuit.name} (${circuit.accidents} accident${circuit.accidents !== 1 ? 's' : ''})`;
        select.appendChild(option);
    });
}

function createLayer(data, selectedCircuit = null, selectedRisk = 'all') {
    return L.geoJSON(data, {
        filter: function(feature) {
            if (selectedCircuit && feature.properties.Name !== selectedCircuit) return false;

            if (selectedRisk !== 'all') {
                const accidents = feature.properties.accidents || 0;
                const risk = getCircuitRiskLevel(accidents).level;
                if (risk !== selectedRisk) return false;
            }

            return true;
        },
        style: function(feature) {
            const accidents = feature.properties.accidents || 0;
            const risk = getCircuitRiskLevel(accidents);

            let color;
            switch (risk.level) {
                case 'low': color = '#10b981'; break;
                case 'moderate': color = '#f59e0b'; break;
                case 'high': color = '#ef4444'; break;
                case 'extreme': color = '#7f1d1d'; break;
                default: color = '#2c5282';
            }

            return {
                color: color,
                weight: 3,
                opacity: 1,
                fillColor: color,
                fillOpacity: 0.7
            };
        },
        onEachFeature: function(feature, layer) {
            const accidents = feature.properties.accidents || 0;
            const risk = getCircuitRiskLevel(accidents);

            const popupContent = `
                <div class="circuit-popup">
                    <h3>${feature.properties.Name}</h3>
                    <p>Longueur : ${feature.properties.length || 'N/A'}</p>
                    <p>Accidents : ${accidents}</p>
                    <p class="risk-${risk.level}">${risk.text}</p>
                </div>
            `;
            layer.bindPopup(popupContent);

            layer.on({
                mouseover: function(e) {
                    const layer = e.target;
                    layer.setStyle({
                        weight: 5,
                        fillOpacity: 0.9
                    });
                    layer.bringToFront();
                },
                mouseout: function(e) {
                    const layer = e.target;
                    circuitsLayer.resetStyle(layer);
                }
            });
        }
    });
}

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
        const [circuitsResponse, accidentsResponse, riskZonesResponse] = await Promise.all([
            fetch("f1-circuits.geojson"),
            fetch("accidents.geojson"),
            fetch("risk-zones.geojson")
        ]);

        const circuitsData = await circuitsResponse.json();
        const accidentsData = await accidentsResponse.json();
        const riskZonesData = await riskZonesResponse.json();

        // Réinitialiser le compteur d'accidents pour chaque circuit
        circuitsData.features.forEach(circuit => {
            circuit.properties.accidents = 0;
        });

        // Compter les accidents pour chaque circuit
        accidentsData.features.forEach(accident => {
            const nearestCircuit = findNearestCircuit(accident.geometry.coordinates, circuitsData);
            if (nearestCircuit) {
                nearestCircuit.properties.accidents = (nearestCircuit.properties.accidents || 0) + 1;
                // Ajouter l'ID du circuit à l'accident
                accident.properties.circuit_id = nearestCircuit.properties.id;
            }
        });

        let selectedCircuit = '';
        let selectedRisk = 'all';
        let circuitsLayer = createLayer(circuitsData).addTo(map);

        // Ajoute la couche des accidents
        let accidentsLayer = L.geoJSON(accidentsData, {
            pointToLayer: createAccidentMarker
        }).addTo(map);

        // Ajoute la couche des zones de risque
        let riskZonesLayer = L.geoJSON(riskZonesData, {
            style: getRiskZoneStyle,
            onEachFeature: (feature, layer) => {
                layer.bindPopup(`
                    <strong>Zone à risque</strong><br>
                    ${feature.properties.description || 'Zone dangereuse'}
                `);
            }
        }).addTo(map);

        // Initialise les sélecteurs
        populateCircuitSelector(circuitsData, selectedRisk);

        // Risk filter event
        document.getElementById("risk-filter").onchange = e => {
            selectedRisk = e.target.value;
            populateCircuitSelector(circuitsData, selectedRisk);
            updateMap();
        };

        // Circuit selector event
        document.getElementById("cir_f1").onchange = e => {
            selectedCircuit = e.target.value;
            updateMap();
        };

        function updateMap() {
            if (circuitsLayer) {
                map.removeLayer(circuitsLayer);
            }

            circuitsLayer = createLayer(circuitsData, selectedCircuit, selectedRisk).addTo(map);

            const bounds = circuitsLayer.getBounds();
            if (bounds.isValid()) {
                map.flyToBounds(bounds, {
                    padding: [50, 50],
                    duration: 1
                });
            }

            // Met à jour la visibilité des accidents et zones de risque
            if (selectedCircuit) {
                accidentsLayer.eachLayer(layer => {
                    const isNearSelectedCircuit = circuitsData.features.some(circuit =>
                        circuit.properties.Name === selectedCircuit &&
                        layer.feature.properties.circuit_id === circuit.properties.id
                    );
                    layer.setStyle({ opacity: isNearSelectedCircuit ? 1 : 0.3, fillOpacity: isNearSelectedCircuit ? 0.8 : 0.2 });
                });

                riskZonesLayer.eachLayer(layer => {
                    const circuitBounds = bounds;
                    const isOverlapping = circuitBounds.overlaps(layer.getBounds());
                    layer.setStyle({ opacity: isOverlapping ? 0.7 : 0.3, fillOpacity: isOverlapping ? 0.35 : 0.1 });
                });
            } else {
                accidentsLayer.eachLayer(layer => layer.setStyle({ opacity: 1, fillOpacity: 0.8 }));
                riskZonesLayer.eachLayer(layer => layer.setStyle(getRiskZoneStyle()));
            }
        }

    } catch (error) {
        console.error("Error loading GeoJSON data:", error);
        alert("Error loading map data. Please try again later");
    }
};
