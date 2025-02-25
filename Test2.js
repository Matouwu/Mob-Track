"use strict";

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

function updateStatistics(accidents, circuits) {
    // Total des accidents
    document.getElementById('total-accidents').textContent = accidents.features.length;

    // Circuit le plus dangereux
    const circuitAccidents = {};
    accidents.features.forEach(accident => {
        const circuit = accident.properties.circuit;
        circuitAccidents[circuit] = (circuitAccidents[circuit] || 0) + 1;
    });
    const mostDangerousCircuit = Object.entries(circuitAccidents)
        .sort((a, b) => b[1] - a[1])[0];
    document.getElementById('most-dangerous-circuit').textContent =
        `${mostDangerousCircuit[0]} (${mostDangerousCircuit[1]})`;

    // Année la plus accidentée
    const yearAccidents = {};
    accidents.features.forEach(accident => {
        const year = accident.properties.date.split('-')[0];
        yearAccidents[year] = (yearAccidents[year] || 0) + 1;
    });
    const mostDangerousYear = Object.entries(yearAccidents)
        .sort((a, b) => b[1] - a[1])[0];
    document.getElementById('most-dangerous-year').textContent =
        `${mostDangerousYear[0]} (${mostDangerousYear[1]})`;

    // Type de session le plus risqué
    const sessionAccidents = {};
    accidents.features.forEach(accident => {
        const session = accident.properties.typesession;
        sessionAccidents[session] = (sessionAccidents[session] || 0) + 1;
    });
    const mostDangerousSession = Object.entries(sessionAccidents)
        .sort((a, b) => b[1] - a[1])[0];
    document.getElementById('most-dangerous-session').textContent =
        `${mostDangerousSession[0]} (${mostDangerousSession[1]})`;

    // Mise à jour du graphique météo
    updateWeatherChart(accidents);

    // Mise à jour de la timeline
    updateAccidentsTimeline(accidents);
}

function updateWeatherChart(accidents) {
    const weatherStats = {};
    accidents.features.forEach(accident => {
        const weather = accident.properties.meteo;
        weatherStats[weather] = (weatherStats[weather] || 0) + 1;
    });

    const weatherChart = document.getElementById('weather-chart');
    weatherChart.innerHTML = '';

    Object.entries(weatherStats).forEach(([weather, count]) => {
        const percentage = (count / accidents.features.length) * 100;
        weatherChart.innerHTML += `
            <div class="weather-bar">
                <div class="weather-label">${weather}</div>
                <div class="weather-value" style="width: ${percentage}%">${count}</div>
            </div>
        `;
    });
}

function updateAccidentsTimeline(accidents) {
    const timeline = document.getElementById('accidents-timeline');
    const sortedAccidents = accidents.features
        .sort((a, b) => new Date(b.properties.date) - new Date(a.properties.date));

    timeline.innerHTML = sortedAccidents.map(accident => `
        <div class="timeline-item">
            <div class="timeline-date">${accident.properties.date}</div>
            <div class="timeline-content">
                <strong>${accident.properties.pilot}</strong>
                <p>${accident.properties.circuit} - ${accident.properties.typesession}</p>
            </div>
        </div>
    `).join('');
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

function updatePilotsList(accidents, yearFilter = 'all', sessionFilter = 'all') {
    const pilotsGrid = document.getElementById('pilots-grid');
    pilotsGrid.innerHTML = '';

    const filteredAccidents = accidents.features.filter(accident => {
        const year = accident.properties.date.split('-')[0];
        const session = accident.properties.typesession;
        return (yearFilter === 'all' || year === yearFilter) &&
            (sessionFilter === 'all' || session === sessionFilter);
    });

    const pilotStats = new Map();
    filteredAccidents.forEach(accident => {
        const pilot = accident.properties.pilot;
        if (!pilotStats.has(pilot)) {
            pilotStats.set(pilot, {
                accidents: 0,
                sessions: new Set(),
                years: new Set(),
                lastAccident: accident.properties.date
            });
        }
        const stats = pilotStats.get(pilot);
        stats.accidents++;
        stats.sessions.add(accident.properties.typesession);
        stats.years.add(accident.properties.date.split('-')[0]);
        if (new Date(accident.properties.date) > new Date(stats.lastAccident)) {
            stats.lastAccident = accident.properties.date;
        }
    });

    const sortedPilots = Array.from(pilotStats.entries())
        .sort((a, b) => b[1].accidents - a[1].accidents);

    sortedPilots.forEach(([pilot, stats]) => {
        const pilotCard = document.createElement('div');
        pilotCard.className = 'pilot-card';

        const wikiName = pilot.replace(/ /g, '_');
        const wikiLink = `https://fr.wikipedia.org/wiki/${wikiName}`;
        const wikiImageUrl = `https://fr.wikipedia.org/w/api.php?action=query&titles=${wikiName}&prop=pageimages&format=json&pithumbsize=100&origin=*`;

        pilotCard.innerHTML = `
            <a href="${wikiLink}" target="_blank" class="pilot-link">
                <div class="pilot-info">
                    <div class="pilot-name">${pilot}</div>
                    <div class="pilot-stats">
                        ${stats.accidents} accident${stats.accidents > 1 ? 's' : ''}<br>
                        ${stats.years.size} année${stats.years.size > 1 ? 's' : ''}<br>
                        ${stats.sessions.size} type${stats.sessions.size > 1 ? 's' : ''} de session<br>
                        Dernier accident: ${stats.lastAccident}
                    </div>
                </div>
                <div class="pilot-image" data-pilot="${pilot}">
                    <span class="loading-text">Chargement...</span>
                </div>
            </a>
        `;

        pilotsGrid.appendChild(pilotCard);

        // Charger l'image Wikipedia
        fetch(wikiImageUrl)
            .then(response => response.json())
            .then(data => {
                const pages = data.query.pages;
                const pageId = Object.keys(pages)[0];
                const imageContainer = pilotCard.querySelector(`.pilot-image[data-pilot="${pilot}"]`);

                if (pages[pageId].thumbnail) {
                    const imgUrl = pages[pageId].thumbnail.source;
                    imageContainer.innerHTML = `<img src="${imgUrl}" alt="${pilot}" class="wiki-image">`;
                } else {
                    imageContainer.innerHTML = '<span class="no-image">Aucune photo disponible</span>';
                }
            })
            .catch(() => {
                const imageContainer = pilotCard.querySelector(`.pilot-image[data-pilot="${pilot}"]`);
                imageContainer.innerHTML = '<span class="no-image">Aucune photo disponible</span>';
            });
    });
}

function populateFilters(accidents) {
    const yearFilter = document.getElementById('year-filter');
    const sessionFilter = document.getElementById('session-filter');

    // Années uniques
    const years = new Set(accidents.features.map(a => a.properties.date.split('-')[0]));
    const sortedYears = Array.from(years).sort((a, b) => b - a);

    yearFilter.innerHTML = '<option value="all">Toutes les années</option>';
    sortedYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearFilter.appendChild(option);
    });

    // Sessions uniques
    const sessions = new Set(accidents.features.map(a => a.properties.typesession));
    const sortedSessions = Array.from(sessions).sort();

    sessionFilter.innerHTML = '<option value="all">Tous types de sessions</option>';
    sortedSessions.forEach(session => {
        const option = document.createElement('option');
        option.value = session;
        option.textContent = session;
        sessionFilter.appendChild(option);
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

        // Initialiser les statistiques
        updateStatistics(accidentsData, circuitsData);

        // Initialiser les filtres
        populateFilters(accidentsData);

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

        document.getElementById("year-filter").onchange = e => {
            const yearFilter = e.target.value;
            const sessionFilter = document.getElementById("session-filter").value;
            updatePilotsList(accidentsData, yearFilter, sessionFilter);
        };

        document.getElementById("session-filter").onchange = e => {
            const yearFilter = document.getElementById("year-filter").value;
            const sessionFilter = e.target.value;
            updatePilotsList(accidentsData, yearFilter, sessionFilter);
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