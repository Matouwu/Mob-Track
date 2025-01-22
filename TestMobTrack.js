"use strict";

// Best lap times data
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

const countryMapping = {
    "Albert Park Circuit": "Australie",
    "Bahrain International Circuit": "Bahreïn",
    "Shanghai International Circuit": "Chine",
    "Baku City Circuit": "Azerbaïdjan",
    // Ajoutez les autres circuits avec leurs pays
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

function populateCircuitSelector(circuits, selectedRisk = 'all', selectedSession = 'all', selectedCountry = 'all') {
    const select = document.getElementById("cir_f1");
    select.innerHTML = '<option value="">Sélectionnez un circuit</option>';

    const filteredCircuits = circuits.features.filter(feature => {
        if (selectedRisk !== 'all') {
            const accidents = feature.properties.accidents || 0;
            if (getCircuitRiskLevel(accidents).level !== selectedRisk) return false;
        }

        if (selectedCountry !== 'all') {
            if (countryMapping[feature.properties.Name] !== selectedCountry) return false;
        }

        return true;
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

function populateCountryFilter(circuits) {
    const select = document.getElementById("country-filter");
    const countries = new Set();

    circuits.features.forEach(circuit => {
        const country = countryMapping[circuit.properties.Name];
        if (country) countries.add(country);
    });

    const sortedCountries = Array.from(countries).sort();

    sortedCountries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        select.appendChild(option);
    });
}

function updatePilotsList(accidents) {
    const pilotsGrid = document.getElementById('pilots-grid');
    pilotsGrid.innerHTML = '';

    const uniquePilots = new Set();
    accidents.features.forEach(accident => {
        uniquePilots.add(accident.properties.pilot);
    });

    const sortedPilots = Array.from(uniquePilots).sort();

    sortedPilots.forEach(pilot => {
        const pilotCard = document.createElement('div');
        pilotCard.className = 'pilot-card';

        const wikiName = pilot.replace(/ /g, '_');
        const wikiLink = `https://fr.wikipedia.org/wiki/${wikiName}`;

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
        pilotCard.appendChild(tooltip);
        pilotsGrid.appendChild(pilotCard);
    });
}

function populateBestTimes() {
    const tbody = document.getElementById('best-times-body');
    tbody.innerHTML = '';

    bestTimes.forEach(record => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><a href="#" class="circuit-link" data-circuit="${record.circuit}">${record.circuit}</a></td>
            <td>${record.time}</td>
            <td>${record.pilot}</td>
            <td>${record.car}</td>
            <td>${record.session}</td>
        `;
        tbody.appendChild(row);
    });

    // Ajout des événements pour les liens de circuit
    document.querySelectorAll('.circuit-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const circuitName = e.target.dataset.circuit;
            document.getElementById('cir_f1').value = circuitName;
            // Déclencher l'événement change pour mettre à jour la carte
            document.getElementById('cir_f1').dispatchEvent(new Event('change'));
        });
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

        // Initialiser la liste des pilotes et les meilleurs temps
        updatePilotsList(accidentsData);
        populateBestTimes();
        populateCountryFilter(circuitsData);

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
        let selectedSession = 'all';
        let selectedCountry = 'all';
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

        populateCircuitSelector(circuitsData, selectedRisk, selectedSession, selectedCountry);

        document.getElementById("risk-filter").onchange = e => {
            selectedRisk = e.target.value;
            populateCircuitSelector(circuitsData, selectedRisk, selectedSession, selectedCountry);
            updateMap();
        };

        document.getElementById("session-filter").onchange = e => {
            selectedSession = e.target.value;
            updateMap();
        };

        document.getElementById("country-filter").onchange = e => {
            selectedCountry = e.target.value;
            populateCircuitSelector(circuitsData, selectedRisk, selectedSession, selectedCountry);
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

            // Filtrer les accidents par session si nécessaire
            accidentsLayer.eachLayer(layer => {
                const isSessionMatch = selectedSession === 'all' || layer.feature.properties.typesession === selectedSession;
                const isNearSelectedCircuit = !selectedCircuit || circuitsData.features.some(circuit =>
                    circuit.properties.Name === selectedCircuit &&
                    layer.feature.properties.circuit_id === circuit.properties.id
                );

                const shouldShow = isSessionMatch && (!selectedCircuit || isNearSelectedCircuit);
                layer.setStyle({
                    opacity: shouldShow ? 1 : 0.3,
                    fillOpacity: shouldShow ? 0.8 : 0.2
                });
            });

            if (selectedCircuit) {
                riskZonesLayer.eachLayer(layer => {
                    const circuitBounds = bounds;
                    const isOverlapping = circuitBounds.overlaps(layer.getBounds());
                    layer.setStyle({ opacity: isOverlapping ? 0.7 : 0.3, fillOpacity: isOverlapping ? 0.35 : 0.1 });
                });
            } else {
                riskZonesLayer.eachLayer(layer => layer.setStyle(getRiskZoneStyle()));
            }
        }

    } catch (error) {
        console.error("Error loading GeoJSON data:", error);
        alert("Error loading map data. Please try again later");
    }
};