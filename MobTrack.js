// Global variables for map and layer management
let mapInstance;
let circuitMarker;
let circuitsLayer;
let accidentsLayer;
let riskZonesLayer;

// Risk level definitions with color coding and thresholds
const RISK_LEVELS = {
    low: { text: 'Low Risk', color: '#10b981', min: 0, max: 0 },
    moderate: { text: 'Moderate Risk', color: '#f59e0b', min: 1, max: 1 },
    high: { text: 'High Risk', color: '#ef4444', min: 2, max: 2 },
    extreme: { text: 'Extreme Risk', color: '#7f1d1d', min: 3, max: Infinity }
};

// Main initialization function
window.onload = async function() {
    // Initialize map with default view
    mapInstance = L.map('map').setView([30.135, -97.633], 4);

    // Add OpenStreetMap tile layer
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 15,
        attribution: 'Map data © OpenStreetMap'
    }).addTo(mapInstance);

    try {
        // Load all required data files
        const [circuits, accidents, riskZones, countries, locations] = await Promise.all([
            fetch("f1-circuits.geojson").then(res => res.json()),
            fetch("accidents.geojson").then(res => res.json()),
            fetch("risk-zones.geojson").then(res => res.json()),
            fetch("countries-FR.json").then(res => res.json()),
            fetch("f1-locations.geojson").then(res => res.json())
        ]);

        // Enhance circuit data with location information and accident counts
        const enhancedCircuits = enhanceCircuitData(circuits, locations, accidents);

        // Initialize UI and display data
        initializeSelectors(enhancedCircuits, countries);
        displayMapLayers(enhancedCircuits, accidents, riskZones);
        setupEventListeners(enhancedCircuits, accidents);
        updateStatistics(accidents);
        updatePilotsList(accidents);
        setupFilters(accidents);

    } catch (error) {
        console.error("Error loading data:", error);
        alert("An error occurred while loading data");
    }
};

// Enhance circuit data with additional information
function enhanceCircuitData(circuits, locations, accidents) {
    return {
        type: "FeatureCollection",
        features: circuits.features.map(circuit => {
            const location = locations.features.find(loc => loc.properties.id === circuit.properties.id);
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

// Count accidents for a specific circuit
function countCircuitAccidents(circuit, accidents) {
    return accidents.features.filter(accident =>
        isAccidentNearCircuit(accident.geometry.coordinates, circuit)
    ).length;
}

// Check if an accident is near a circuit
function isAccidentNearCircuit([lon, lat], circuit) {
    const circuitPoints = circuit.geometry.coordinates;
    const maxDistance = 1000; // 1km radius

    return circuitPoints.some(([clon, clat]) =>
        calculateDistance(lat, lon, clat, clon) < maxDistance
    );
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2 - lat1) * Math.PI/180;
    const Δλ = (lon2 - lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ/2) * Math.sin(Δλ/2);

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Initialize country and circuit selectors
function initializeSelectors(circuits, countries) {
    const countrySelect = document.getElementById("countF1");
    countrySelect.innerHTML = '<option value="">All countries</option>';

    // Get unique country codes and sort them
    const countryCodes = Array.from(new Set(
        circuits.features.map(circuit => circuit.properties.id.slice(0, 2))
    )).sort();

    // Add country options
    countryCodes.forEach(code => {
        const option = document.createElement("option");
        option.value = code;
        option.textContent = countries[code.toUpperCase()];
        countrySelect.appendChild(option);
    });

    updateCircuitList(circuits);
}

// Update circuit list based on filters
function updateCircuitList(circuits, selectedCountry = '', selectedRisk = 'all') {
    const circuitSelect = document.getElementById("trackF1");
    circuitSelect.innerHTML = '<option value="">Select a circuit</option>';

    circuits.features
        .filter(circuit => {
            const countryMatch = !selectedCountry ||
                circuit.properties.id.startsWith(selectedCountry);
            const riskMatch = selectedRisk === 'all' ||
                circuit.properties.riskLevel === selectedRisk;
            return countryMatch && riskMatch;
        })
        .forEach(circuit => {
            const option = document.createElement("option");
            option.value = circuit.properties.id;
            option.textContent = circuit.properties.name;
            circuitSelect.appendChild(option);
        });
}

// Get risk level based on accident count
function getRiskLevel(accidents) {
    for (const [level, config] of Object.entries(RISK_LEVELS)) {
        if (accidents >= config.min && accidents <= config.max) {
            return level;
        }
    }
    return 'low';
}

// Display all map layers
function displayMapLayers(circuits, accidents, riskZones) {
    // Display circuits with styling and popups
    circuitsLayer = L.geoJSON(circuits, {
        style: getCircuitStyle,
        onEachFeature: bindCircuitPopup
    }).addTo(mapInstance);

    // Display accidents as circle markers
    accidentsLayer = L.geoJSON(accidents, {
        pointToLayer: (feature, latlng) => {
            return L.circleMarker(latlng, {
                radius: 6,
                fillColor: '#dc2626',
                color: '#000',
                weight: 1,
                fillOpacity: 0.7
            }).bindPopup(createAccidentPopup(feature));
        }
    }).addTo(mapInstance);

    // Display risk zones
    riskZonesLayer = L.geoJSON(riskZones, {
        style: {
            fillColor: '#ef4444',
            weight: 1,
            opacity: 0.5,
            fillOpacity: 0.2
        }
    }).addTo(mapInstance);
}

// Create accident popup content
function createAccidentPopup(feature) {
    return `
        <div class="accident-popup">
            <h3>Accident Details</h3>
            <p><strong>Pilot:</strong> ${feature.properties.pilot}</p>
            <p><strong>Date:</strong> ${feature.properties.date}</p>
            <p><strong>Circuit:</strong> ${feature.properties.circuit}</p>
            <p><strong>Session:</strong> ${feature.properties.typesession}</p>
            <p><strong>Weather:</strong> ${feature.properties.meteo}</p>
            <p><strong>Description:</strong> ${feature.properties.description || 'No description available'}</p>
        </div>
    `;
}

// Get circuit style based on risk level
function getCircuitStyle(feature) {
    const riskLevel = feature.properties.riskLevel || 'low';
    return {
        color: RISK_LEVELS[riskLevel].color,
        weight: 3,
        opacity: 0.8
    };
}

// Bind popup to circuit
function bindCircuitPopup(feature, layer) {
    const riskLevel = feature.properties.riskLevel || 'low';
    layer.bindPopup(`
        <div class="circuit-popup">
            <h3>${feature.properties.name}</h3>
            <p>Country: ${feature.properties.country}</p>
            <p>Accidents: ${feature.properties.accidents || 0}</p>
            <p>Risk Level: ${RISK_LEVELS[riskLevel].text}</p>
        </div>
    `);
}

// Update statistics display
function updateStatistics(accidents) {
    document.getElementById('total-accidents').textContent = accidents.features.length;

    const yearStats = countByProperty(accidents, 'date', d => d.split('-')[0]);
    const [mostYear, yearCount] = getMaxEntry(yearStats);
    document.getElementById('most-dangerous-year').textContent = `${mostYear} (${yearCount})`;

    updateWeatherStats(accidents);
}

// Count property occurrences
function countByProperty(data, prop, transform = v => v) {
    return data.features.reduce((stats, feature) => {
        const key = transform(feature.properties[prop]);
        stats[key] = (stats[key] || 0) + 1;
        return stats;
    }, {});
}

// Get entry with maximum value
function getMaxEntry(obj) {
    return Object.entries(obj).reduce((max, entry) =>
        entry[1] > max[1] ? entry : max, ['', 0]
    );
}

// Update weather statistics chart
function updateWeatherStats(accidents) {
    const weatherChart = document.getElementById('weather-chart');
    const weatherStats = countByProperty(accidents, 'meteo');

    weatherChart.innerHTML = Object.entries(weatherStats)
        .sort((a, b) => b[1] - a[1])
        .map(([weather, count]) => `
            <div class="weather-bar">
                <span class="weather-label">${weather}</span>
                <span class="weather-count">${count}</span>
            </div>
        `).join('');
}

// Update pilots list with filters
function updatePilotsList(accidents, yearFilter = 'all', sessionFilter = 'all') {
    const filtered = accidents.features.filter(accident => {
        const year = accident.properties.date.split('-')[0];
        const session = accident.properties.typesession;
        return (yearFilter === 'all' || year === yearFilter) &&
            (sessionFilter === 'all' || session === sessionFilter);
    });

    // Compute pilot statistics
    const pilotStats = filtered.reduce((stats, accident) => {
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

    // Create and display pilot cards
    const pilotsGrid = document.getElementById('pilots-grid');
    pilotsGrid.innerHTML = Object.entries(pilotStats)
        .sort((a, b) => b[1].accidents - a[1].accidents)
        .map(([name, data]) => {
            const wikiUrl = `https://fr.wikipedia.org/wiki/${name.replace(/ /g, '_')}`;
            return `
                <div class="pilot-card">
                    <a href="${wikiUrl}" target="_blank" class="pilot-link">
                        <div class="pilot-image" id="pilot-img-${name.replace(/ /g, '-')}">
                            <div class="no-image">Photo unavailable</div>
                        </div>
                        <div class="pilot-info">
                            <div class="pilot-name">${name}</div>
                            <div class="pilot-stats">
                                Accidents: ${data.accidents}<br>
                                Years: ${data.years.size}<br>
                                Sessions: ${data.sessions.size}
                            </div>
                        </div>
                    </a>
                </div>
            `;
        }).join('');

    // Load pilot images
    Object.keys(pilotStats).forEach(loadPilotImage);
}

// Load pilot image from Wikipedia
async function loadPilotImage(pilotName) {
    try {
        const response = await fetch(
            `https://fr.wikipedia.org/w/api.php?action=query&titles=${
                encodeURIComponent(pilotName)
            }&prop=pageimages&format=json&pithumbsize=100&origin=*`
        );
        const data = await response.json();
        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];
        const thumbnail = pages[pageId].thumbnail;

        if (thumbnail) {
            const imgElement = document.getElementById(`pilot-img-${pilotName.replace(/ /g, '-')}`);
            imgElement.innerHTML = `<img src="${thumbnail.source}" alt="${pilotName}" class="wiki-image">`;
        }
    } catch (error) {
        console.error(`Error loading image for ${pilotName}:`, error);
    }
}

// Setup filters
function setupFilters(accidents) {
    setupYearFilter(accidents);
    setupSessionFilter(accidents);
    setupRiskFilter();
}

// Setup year filter
function setupYearFilter(accidents) {
    const years = [...new Set(
        accidents.features.map(f => f.properties.date.split('-')[0])
    )].sort();

    const select = document.getElementById('year-filter');
    select.innerHTML = '<option value="all">All years</option>' +
        years.map(y => `<option value="${y}">${y}</option>`).join('');
}

// Setup session filter
function setupSessionFilter(accidents) {
    const sessions = [...new Set(
        accidents.features.map(f => f.properties.typesession)
    )].sort();

    const select = document.getElementById('session-filter');
    select.innerHTML = '<option value="all">All sessions</option>' +
        sessions.map(s => `<option value="${s}">${s}</option>`).join('');
}

// Setup risk filter
function setupRiskFilter() {
    const riskFilter = document.getElementById("risk-filter");
    riskFilter.innerHTML = [
        '<option value="all">All risks</option>',
        ...Object.entries(RISK_LEVELS).map(([key, val]) =>
            `<option value="${key}">${val.text} (${val.min === val.max ? val.min : `${val.min}+`} accident${val.min > 1 ? 's' : ''})</option>`
        )
    ].join('');
}

// Setup event listeners
function setupEventListeners(circuits, accidents) {
    // Country selector
    document.getElementById("countF1").addEventListener("change", e => {
        const country = e.target.value;
        const risk = document.getElementById("risk-filter").value;
        updateCircuitList(circuits, country, risk);
    });

    // Risk filter
    document.getElementById("risk-filter").addEventListener("change", e => {
        const risk = e.target.value;
        const country = document.getElementById("countF1").value;
        updateCircuitList(circuits, country, risk);
    });

    // Circuit selector
    document.getElementById("trackF1").addEventListener("change", e => {
        const selectedCircuit = circuits.features.find(
            f => f.properties.id === e.target.value
        );

        if (selectedCircuit && selectedCircuit.properties) {
            mapInstance.flyTo(
                [selectedCircuit.properties.lat, selectedCircuit.properties.lon],
                14
            );

            if (circuitMarker) {
                mapInstance.removeLayer(circuitMarker);
            }

            circuitMarker = L.marker([
                selectedCircuit.properties.lat,
                selectedCircuit.properties.lon
            ]).addTo(mapInstance);
        }
    });

    // Year filter
    document.getElementById("year-filter").addEventListener("change", e => {
        updatePilotsList(
            accidents,
            e.target.value,
            document.getElementById("session-filter").value
        );
    });

    // Session filter
    document.getElementById("session-filter").addEventListener("change", e => {
        updatePilotsList(
            accidents,
            document.getElementById("year-filter").value,
            e.target.value
        );
    });
}