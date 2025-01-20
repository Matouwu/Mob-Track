"use strict";
//Toutes les données sont récupérées depuis wikipédia et sont donc libre d'accès, la gestion des circuits quand à elle est disponible également librement sur github.
// Meilleurs temps à ce jour sur les circuits du fichier geojson ( FONCTION FUTURE TAB AVEC MEILLEURS TEMPS).
const bestTimes = [
    { circuit: "Albert Park Circuit", time: "1:20.235", pilot: "Charles Leclerc", car: "Ferrari", session: "Course", year: 2022 },
    { circuit: "Bahrain International Circuit", time: "1:31.447", pilot: "Pedro de la Rosa", car: "McLaren", session: "Course", year: 2005 },
    { circuit: "Shanghai International Circuit", time: "1:32.238", pilot: "Michael Schumacher", car: "Ferrari", session: "Course", year: 2004 },
    { circuit: "Baku City Circuit", time: "1:43.009", pilot: "Charles Leclerc", car: "Ferrari", session: "Qualifications", year: 2019 },
    { circuit: "Circuit de Barcelona-Catalunya", time: "1:18.149", pilot: "Max Verstappen", car: "Red Bull", session: "Course", year: 2021 },
    { circuit: "Circuit Gilles-Villeneuve", time: "1:13.078", pilot: "Valtteri Bottas", car: "Mercedes", session: "Course", year: 2019 },
    { circuit: "Red Bull Ring", time: "1:05.619", pilot: "Carlos Sainz", car: "Ferrari", session: "Course", year: 2020 },
    { circuit: "Silverstone Circuit", time: "1:27.097", pilot: "Max Verstappen", car: "Red Bull", session: "Course", year: 2020 },
    { circuit: "Hungaroring", time: "1:16.627", pilot: "Lewis Hamilton", car: "Mercedes", session: "Course", year: 2020 },
    { circuit: "Circuit de Spa-Francorchamps", time: "1:46.286", pilot: "Valtteri Bottas", car: "Mercedes", session: "Course", year: 2018 },
    { circuit: "Circuit Zandvoort", time: "1:11.097", pilot: "Lewis Hamilton", car: "Mercedes", session: "Course", year: 2021 },
    { circuit: "Autodromo Nazionale Monza", time: "1:21.046", pilot: "Rubens Barrichello", car: "Ferrari", session: "Course", year: 2004 },
    { circuit: "Marina Bay Street Circuit", time: "1:41.905", pilot: "Kevin Magnussen", car: "Haas", session: "Course", year: 2018 },
    { circuit: "Suzuka International Racing Course", time: "1:30.983", pilot: "Lewis Hamilton", car: "Mercedes", session: "Course", year: 2019 },
    { circuit: "Circuit of the Americas", time: "1:36.169", pilot: "Charles Leclerc", car: "Ferrari", session: "Course", year: 2019 },
    { circuit: "Autódromo Hermanos Rodríguez", time: "1:18.741", pilot: "Valtteri Bottas", car: "Mercedes", session: "Course", year: 2021 },
    { circuit: "Interlagos Circuit", time: "1:10.540", pilot: "Valtteri Bottas", car: "Mercedes", session: "Course", year: 2018 },
    { circuit: "Yas Marina Circuit", time: "1:39.283", pilot: "Lewis Hamilton", car: "Mercedes", session: "Course", year: 2019 }
];

// Ajout des pays liés aux circuits pour filtre de pays. ( FONCTION FUTURE ) 
const countryMapping = {
    "Albert Park Circuit": "Australie",
    "Bahrain International Circuit": "Bahreïn",
    "Shanghai International Circuit": "Chine",
    "Baku City Circuit": "Azerbaïdjan",
    "Circuit de Barcelona-Catalunya": "Espagne",
    "Circuit Gilles-Villeneuve": "Canada",
    "Red Bull Ring": "Autriche",
    "Silverstone Circuit": "Royaume-Uni",
    "Hungaroring": "Hongrie",
    "Circuit de Spa-Francorchamps": "Belgique",
    "Circuit Zandvoort": "Pays-Bas",
    "Autodromo Nazionale Monza": "Italie",
    "Marina Bay Street Circuit": "Singapour",
    "Suzuka International Racing Course": "Japon",
    "Circuit of the Americas": "États-Unis",
    "Autódromo Hermanos Rodríguez": "Mexique",
    "Interlagos Circuit": "Brésil",
    "Yas Marina Circuit": "Émirats Arabes Unis"
};

function getCircuitRiskLevel(accidents) {
    if (accidents === 0) return { level: 'low', text: 'Risque faible' };
    if (accidents === 1) return { level: 'moderate', text: 'Risque modéré' };
    if (accidents === 2) return { level: 'high', text: 'Risque élevé' };
    return { level: 'extreme', text: 'Risque extrême' };
}

function createAccidentMarker(feature, latlng) {
    const popupContent = `
        <div class="accident-popup">
            <h3>Détails de l'accident</h3>
            <p class="pilot">Pilote : ${feature.properties.pilot}</p>
            <p class="details">Date : ${feature.properties.date}</p>
            <p class="details">Circuit : ${feature.properties.circuit}</p>
            <p class="details">Type de session : ${feature.properties.typesession}</p>
            <p class="details">Conditions météo : ${feature.properties.meteo}</p>
            <p class="details">Description : ${feature.properties.description}</p>
        </div>
    `;

    return L.circleMarker(latlng, {
        radius: 8,
        fillColor: "#ff4444",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    }).bindPopup(popupContent);
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


//Fonction pour ajouter les accidents aux circuits relatifs.
// Explication : Circuit à moins de 1000m = accident relié au circuit (pour eviter les erreurs de localisation)
function findNearestCircuit(accidentCoords, circuits) {
    let nearestCircuit = null;
    let minDistance = Infinity;

    circuits.features.forEach(circuit => {
        const circuitPoints = circuit.geometry.coordinates.map(coord => L.latLng(coord[1], coord[0]));
        const accidentPoint = L.latLng(accidentCoords[1], accidentCoords[0]);

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

    return minDistance < 1000 ? nearestCircuit : null;
}


// Selection de circuit dynamique utilisant le fichier html directement.
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

function updatePilotsList(accidents) {
    const pilotsGrid = document.getElementById('pilots-grid');
    pilotsGrid.innerHTML = '';

    // Créer un Set pour avoir des pilotes uniques
    const uniquePilots = new Set();
    accidents.features.forEach(accident => {
        uniquePilots.add(accident.properties.pilot);
    });

    // Convertir les noms en tableau et trier par ordre alphabétique
    const sortedPilots = Array.from(uniquePilots).sort();

    sortedPilots.forEach(pilot => {
        const pilotCard = document.createElement('div');
        pilotCard.className = 'pilot-card';

        // Créer le lien Wikipedia en formatant le nom du pilote
        const wikiName = pilot.replace(/ /g, '_');
        const wikiLink = `https://fr.wikipedia.org/wiki/${wikiName}`;

        //Petit ajout pour qur la navigation soit plus dynamique et agréable :
        const tooltip = document.createElement('div');
        tooltip.className = 'pilot-image-tooltip';

        // Chargement asynchrone de l'image du pilote
        fetch(`https://fr.wikipedia.org/w/api.php?action=query&titles=${wikiName}&prop=pageimages&format=json&pithumbsize=200&origin=*`)
            .then(response => response.json())
            .then(data => {
                const pages = data.query.pages;
                const pageId = Object.keys(pages)[0];
                if (pages[pageId].thumbnail) {
                    const img = document.createElement('img');
                    img.src = pages[pageId].thumbnail.source;
                    img.alt = pilot;
                    tooltip.appendChild(img);
                } else {
                    tooltip.innerHTML = '<p class="no-image-text">Photo non disponible</p>';
                }
            })
            .catch(() => {
                tooltip.innerHTML = '<p class="no-image-text">Photo non disponible</p>';
            });

        pilotCard.innerHTML = `<a href="${wikiLink}" target="_blank">${pilot}</a>`;
        pilotsGrid.appendChild(pilotCard);
        pilotCard.appendChild(tooltip);
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

        // Initialiser la liste des pilotes
        updatePilotsList(accidentsData);

        // Réinitialiser le compteur d'accidents pour chaque circuit
        circuitsData.features.forEach(circuit => {
            circuit.properties.accidents = 0;
        });

        // Compter les accidents pour chaque circuit
        accidentsData.features.forEach(accident => {
            const nearestCircuit = findNearestCircuit(accident.geometry.coordinates, circuitsData);
            if (nearestCircuit) {
                nearestCircuit.properties.accidents = (nearestCircuit.properties.accidents || 0) + 1;
                accident.properties.circuit_id = nearestCircuit.properties.id;
            }
        });

        let selectedCircuit = '';
        let selectedRisk = 'all';
        let circuitsLayer = createLayer(circuitsData).addTo(map);

        let accidentsLayer = L.geoJSON(accidentsData, {
            pointToLayer: createAccidentMarker
        }).addTo(map);

        let riskZonesLayer = L.geoJSON(riskZonesData, {
            style: getRiskZoneStyle,
            onEachFeature: (feature, layer) => {
                layer.bindPopup(`
                    <strong>Zone à risque</strong><br>
                    ${feature.properties.description || 'Zone dangereuse'}
                `);
            }
        }).addTo(map);

        populateCircuitSelector(circuitsData, selectedRisk);

        document.getElementById("risk-filter").onchange = e => {
            selectedRisk = e.target.value;
            populateCircuitSelector(circuitsData, selectedRisk);
            updateMap();
        };

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
