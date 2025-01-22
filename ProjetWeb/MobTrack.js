// Variables globales pour la gestion de la carte et des couches
let mapInstance;
let circuitMarker;
let circuitsLayer;
let accidentsLayer;
let riskZonesLayer;

// Constantes pour les niveaux de risque
const RISK_LEVELS = {
    low: { text: 'Risque faible', color: '#10b981', min: 0, max: 0 },
    moderate: { text: 'Risque modéré', color: '#f59e0b', min: 1, max: 1 },
    high: { text: 'Risque élevé', color: '#ef4444', min: 2, max: 2 },
    extreme: { text: 'Risque extrême', color: '#7f1d1d', min: 3, max: Infinity }
};

// Fonction principale d'initialisation
window.onload = async function() {
    // Initialisation de la carte
    mapInstance = L.map('map').setView([30.135, -97.633], 4);

    // Ajout du fond de carte OpenStreetMap
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 15,
        attribution: 'Map data © OpenStreetMap'
    }).addTo(mapInstance);

    try {
        // Chargement des données
        const [circuits, accidents, riskZones, countries, locations] = await Promise.all([
            fetch("f1-circuits.geojson").then(res => res.json()),
            fetch("accidents.geojson").then(res => res.json()),
            fetch("risk-zones.geojson").then(res => res.json()),
            fetch("countries-FR.json").then(res => res.json()),
            fetch("f1-locations.geojson").then(res => res.json())
        ]);

        // Fusion des données
        const enhancedData = enhanceData(circuits, locations, accidents);

        // Initialisation
        initializeSelectors(enhancedData, countries);
        displayMapLayers(enhancedData, accidents, riskZones);
        setupEventListeners(enhancedData, accidents);

        // Mise à jour interface
        updateStatistics(accidents);
        updatePilotsList(accidents);
        setupFilters(accidents);

    } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        alert("Une erreur est survenue lors du chargement des données");
    }
};

// Fusion des données GeoJSON
function enhanceData(circuits, locations, accidents) {
    return {
        type: "FeatureCollection",
        features: circuits.features.map(circuit => {
            const location = locations.features.find(f => f.properties.id === circuit.properties.id);
            const accidentCount = countCircuitAccidents(circuit, accidents);

            return {
                ...circuit,
                properties: {
                    ...circuit.properties,
                    ...location?.properties,
                    accidents: accidentCount,
                    riskLevel: getRiskLevel(accidentCount)
                }
            };
        })
    };
}

function countCircuitAccidents(circuit, accidents) {
    return accidents.features.filter(accident =>
        isAccidentNearCircuit(accident.geometry.coordinates, circuit)
    ).length;
}

function isAccidentNearCircuit([lon, lat], circuit) {
    const circuitPoints = circuit.geometry.coordinates;
    const maxDistance = 1000; // 1km

    return circuitPoints.some(([clon, clat]) =>
        calculateDistance(lat, lon, clat, clon) < maxDistance
    );
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2 - lat1) * Math.PI/180;
    const Δλ = (lon2 - lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ/2) * Math.sin(Δλ/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Gestion des sélecteurs
function initializeSelectors(circuits, countries) {
    const countrySelect = document.getElementById("countF1");
    countrySelect.innerHTML = '<option value="">Tous les pays</option>';

    Array.from(new Set(circuits.features.map(f => f.properties.id.slice(0, 2))))
        .sort()
        .forEach(code => {
            const option = document.createElement("option");
            option.value = code;
            option.textContent = countries[code.toUpperCase()];
            countrySelect.appendChild(option);
        });

    updateCircuitList(circuits);
}

function updateCircuitList(circuits, selectedCountry = '', selectedRisk = 'all') {
    const circuitSelect = document.getElementById("trackF1");
    circuitSelect.innerHTML = '<option value="">Sélectionner un circuit</option>';

    circuits.features.filter(circuit => {
        const countryMatch = !selectedCountry || circuit.properties.id.startsWith(selectedCountry);
        const riskMatch = selectedRisk === 'all' || circuit.properties.riskLevel === selectedRisk;
        return countryMatch && riskMatch;
    }).forEach(circuit => {
        const option = document.createElement("option");
        option.value = circuit.properties.id;
        option.textContent = circuit.properties.name;
        circuitSelect.appendChild(option);
    });
}

function getRiskLevel(accidents) {
    for (const [level, config] of Object.entries(RISK_LEVELS)) {
        if (accidents >= config.min && accidents <= config.max) {
            return level;
        }
    }
    return 'low';
}

// Affichage carte
function displayMapLayers(circuits, accidents, riskZones) {
    displayCircuits(circuits);
    displayAccidents(accidents);
    displayRiskZones(riskZones);
}

function displayCircuits(circuits) {
    circuitsLayer = L.geoJSON(circuits, {
        style: getCircuitStyle,
        onEachFeature: bindCircuitPopup
    }).addTo(mapInstance);
}

function getCircuitStyle(feature) {
    return {
        color: RISK_LEVELS[feature.properties.riskLevel].color,
        weight: 3,
        opacity: 0.8
    };
}

function bindCircuitPopup(feature, layer) {
    layer.bindPopup(`
        <div class="circuit-popup">
            <h3>${feature.properties.name}</h3>
            <p>Pays: ${feature.properties.country}</p>
            <p>Accidents: ${feature.properties.accidents}</p>
            <p>Niveau de risque: ${RISK_LEVELS[feature.properties.riskLevel].text}</p>
        </div>
    `);
}

function displayAccidents(accidents) {
    accidentsLayer = L.geoJSON(accidents, {
        pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
            radius: 6,
            fillColor: '#dc2626',
            color: '#000',
            weight: 1,
            fillOpacity: 0.7
        })
    }).bindPopup(feature => `
        <div class="accident-popup">
            <h3>${feature.properties.pilot}</h3>
            <p>Date: ${feature.properties.date}</p>
            <p>Session: ${feature.properties.typesession}</p>
        </div>
    `).addTo(mapInstance);
}

function displayRiskZones(riskZones) {
    riskZonesLayer = L.geoJSON(riskZones, {
        style: {
            fillColor: '#ef4444',
            weight: 1,
            opacity: 0.5,
            fillOpacity: 0.2
        }
    }).addTo(mapInstance);
}

// Statistiques
function updateStatistics(accidents) {
    document.getElementById('total-accidents').textContent = accidents.features.length;

    const yearStats = countByProperty(accidents, 'date', d => d.split('-')[0]);
    const [mostYear, yearCount] = getMaxEntry(yearStats);
    document.getElementById('most-dangerous-year').textContent = `${mostYear} (${yearCount})`;

    updateWeatherStats(accidents);
}

function countByProperty(data, prop, transform = v => v) {
    return data.features.reduce((stats, feature) => {
        const key = transform(feature.properties[prop]);
        stats[key] = (stats[key] || 0) + 1;
        return stats;
    }, {});
}

function getMaxEntry(obj) {
    return Object.entries(obj).reduce((max, entry) => entry[1] > max[1] ? entry : max, ['', 0]);
}

function updateWeatherStats(accidents) {
    const weatherChart = document.getElementById('weather-chart');
    weatherChart.innerHTML = Object.entries(countByProperty(accidents, 'meteo'))
        .sort((a, b) => b[1] - a[1])
        .map(([weather, count]) => `
            <div class="weather-bar">
                <span class="weather-label">${weather}</span>
                <span class="weather-count">${count}</span>
            </div>
        `).join('');
}

// Pilotes
function updatePilotsList(accidents, yearFilter = 'all', sessionFilter = 'all') {
    const filtered = filterAccidents(accidents, yearFilter, sessionFilter);
    const pilotStats = computePilotStats(filtered);
    displayPilotCards(pilotStats);
}

function filterAccidents(accidents, year, session) {
    return accidents.features.filter(f => {
        const accidentYear = f.properties.date.split('-')[0];
        return (year === 'all' || accidentYear === year) &&
            (session === 'all' || f.properties.typesession === session);
    });
}

function computePilotStats(accidents) {
    return accidents.reduce((stats, accident) => {
        const pilot = accident.properties.pilot;
        if (!stats[pilot]) {
            stats[pilot] = {
                accidents: 0,
                years: new Set(),
                sessions: new Set()
            };
        }
        stats[pilot].accidents++;
        stats[pilot].years.add(accident.properties.date.split('-')[0]);
        stats[pilot].sessions.add(accident.properties.typesession);
        return stats;
    }, {});
}

function displayPilotCards(stats) {
    const pilotsGrid = document.getElementById('pilots-grid');
    pilotsGrid.innerHTML = Object.entries(stats)
        .sort((a, b) => b[1].accidents - a[1].accidents)
        .map(([name, data]) => `
            <div class="pilot-card">
                <h4>${name}</h4>
                <p>Accidents: ${data.accidents}</p>
                <p>Années: ${data.years.size}</p>
                <p>Sessions: ${data.sessions.size}</p>
            </div>
        `).join('');
}

// Filtres
function setupFilters(accidents) {
    setupYearFilter(accidents);
    setupSessionFilter(accidents);
}

function setupYearFilter(accidents) {
    const years = [...new Set(accidents.features.map(f => f.properties.date.split('-')[0]))].sort();
    const select = document.getElementById('year-filter');
    select.innerHTML = '<option value="all">Toutes années</option>' +
        years.map(y => `<option value="${y}">${y}</option>`).join('');
}

function setupSessionFilter(accidents) {
    const sessions = [...new Set(accidents.features.map(f => f.properties.typesession))].sort();
    const select = document.getElementById('session-filter');
    select.innerHTML = '<option value="all">Toutes sessions</option>' +
        sessions.map(s => `<option value="${s}">${s}</option>`).join('');
}

// Gestion des événements
function setupEventListeners(circuits, accidents) {
    document.getElementById("countF1").addEventListener("change", e => {
        const country = e.target.value;
        const risk = document.getElementById("risk-filter").value;
        updateCircuitList(circuits, country, risk);
        updateCircuitDisplay(circuits, risk);
    });

    document.getElementById("risk-filter").addEventListener("change", e => {
        const risk = e.target.value;
        const country = document.getElementById("countF1").value;
        updateCircuitList(circuits, country, risk);
        updateCircuitDisplay(circuits, risk);
    });

    document.getElementById("trackF1").addEventListener("change", e => {
        const circuit = circuits.features.find(f => f.properties.id === e.target.value);
        if (circuit) {
            mapInstance.flyTo([circuit.properties.lat, circuit.properties.lon], 14);
            if (circuitMarker) mapInstance.removeLayer(circuitMarker);
            circuitMarker = L.marker([circuit.properties.lat, circuit.properties.lon]).addTo(mapInstance);
        }
    });

    document.getElementById("year-filter").addEventListener("change", e => {
        updatePilotsList(accidents, e.target.value, document.getElementById("session-filter").value);
    });

    document.getElementById("session-filter").addEventListener("change", e => {
        updatePilotsList(accidents, document.getElementById("year-filter").value, e.target.value);
    });
}

// Initialisation des filtres de risque
function setupRiskFilter() {
    const riskFilter = document.getElementById("risk-filter");
    riskFilter.innerHTML = [
        '<option value="all">Tous risques</option>',
        ...Object.entries(RISK_LEVELS).map(([key, val]) =>
            `<option value="${key}">${val.text} (${val.min === val.max ? val.min : `${val.min}+`} accident${val.min > 1 ? 's' : ''})</option>`
        )
    ].join('');
}
setupRiskFilter();
