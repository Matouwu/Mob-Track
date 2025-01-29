"use strict";

let selectedCountry='';  //Country selected by the user
let selectedTrack;            //Track selected by the user
let selectedRisk="all";

let yearFilter;
let sessionFilter;
let map;
let data;
let listTrackstat ={};

let trackLayer;
let accidentsLayer;
let riskZonesLayer;




/* ==========================
 *     Selector section
 * ========================== */

function loadCountry(locationData, countriesData,selectedRisk) {
    const select = document.getElementById("countF1");
    for (let i=0; i <= 27; i++) {   //Remove all option selected before
        select.remove(1);
    }
    let countCo = 0;

    if(selectedRisk === "all"){
        const countryNames = [...new Set(locationData.features.map(feature =>
            feature.properties.id.slice(0,2)).sort())];
        countryNames.forEach(country => {
            countCo++;
            const option = document.createElement("option");
            option.value = country;
            option.textContent = countriesData[country.toUpperCase()];
            select.appendChild(option);
        })
    }
    else{
        //list of track who have same value with "selectedRisk"
        let listCountry = {};

        for(let k in listTrackstat) {
            if(listTrackstat[k] == selectedRisk){
                listCountry[k] = listTrackstat[k];
            }
        }
        console.log(listTrackstat);
        for(let k in listCountry) {
            const countryK = locationData.features.find(feature =>
                feature.properties.name === k);
            countCo++;
            console.log("countryK :",countryK);
            const option = document.createElement("option");
            option.value = countryK.properties.id.slice(0,2).toUpperCase();
            option.textContent = countriesData[countryK.properties.id.slice(0,2).toUpperCase()];
            select.appendChild(option);
        }
    }
    const countryCo = document.getElementById("countryCo");
    countryCo.textContent ="Choisir un pays (" + countCo + ")";
}

function loadTrack(locationData) {
    const select = document.getElementById("trackF1");
    for (let i=0; i <= 35; i++) {   //Remove all option selected before
        select.remove(1);
    }
    let countTra = 0;  //count the number of track
    if(selectedRisk === "all"){
        if(selectedCountry === ''){
            const trac = locationData.features.map(feature => feature.properties);
            trac.forEach(track => {
                countTra++;
                const option = document.createElement("option");
                option.value = track.id;
                option.textContent = track.name;
                select.appendChild(option);
            })
            const trackCo = document.getElementById("trackCo");
            trackCo.textContent = "Choisir un circuit (" + countTra + ")";
        }
        else{
            const tra = locationData.features.filter(e => e.properties.id.slice(0,2) === selectedCountry);
            tra.forEach(track => {
                countTra++;
                const option = document.createElement("option");
                option.value = track.properties.id;
                option.textContent = track.properties.name;
                select.appendChild(option);
            })
            const trackCo = document.getElementById("trackCo");
            trackCo.textContent = "Choisir un circuit (" + countTra + ")";
        }
    }
    else{
        let listTrack = {};
        for(let k in listTrackstat) {
            if(listTrackstat[k] == selectedRisk){
                listTrack[k] = listTrackstat[k];
            }
        }
        if(selectedCountry === ''){
            for(let k in listTrack){
                const tracK = locationData.features.find(feature =>feature.properties.name === k);
                countTra++;
                const option = document.createElement("option");
                option.value = tracK.properties.id;
                option.textContent = tracK.properties.name;
                select.appendChild(option);
            }
            const trackCo = document.getElementById("trackCo");
            trackCo.textContent = "Choisir un circuit (" + countTra + ")";
        }
        else{
            for(let k in listTrack){
                const tracK = locationData.features.find(feature =>feature.properties.name === k);
                if(tracK.properties.id.slice(0,2).toUpperCase() === selectedCountry){
                    countTra++;
                    const option = document.createElement("option");
                    option.value = tracK.properties.id;
                    option.textContent = tracK.properties.name;
                    select.appendChild(option);
                }
            }
            const trackCo = document.getElementById("trackCo");
            trackCo.textContent = "Choisir un circuit (" + countTra + ")";
        }
    }
}

/*
 * change the center of the map depend on the selectedTrack
 */
function goToTrack(locationData, selectedTrack) {
    const tra = locationData.features.find(e => e.properties.id === selectedTrack);
    console.log('cir:' ,tra);
    let lat = tra.properties.lat;
    let lon = tra.properties.lon;
    map.flyTo([lat, lon], 15);
}

function selectRisk(locationData,accidentsData, countriesData){
    let selectRisk = document.getElementById("riskFilter");
    selectRisk.onchange = e=>{
        selectedRisk = e.target.value;
        loadCountry(locationData, countriesData,selectedRisk);
        loadTrack(locationData);
    }
}

function selectCountry(locationData) {
    let selectCountry = document.getElementById("countF1");
    selectCountry.onchange = e=>{
        selectedCountry = e.target.value;
        loadTrack(locationData);
        console.log('selectedCountry:', selectedCountry);
    }
}

function selectTrack(locationData) {
    let selectTrack = document.getElementById("trackF1");
    selectTrack.onchange = e=>{
        selectedTrack = e.target.value;
        console.log("selectedTrack:", selectedTrack);
        goToTrack(locationData, selectedTrack);
    }
}



/* ==========================
 *   Statistic information
 * ========================== */

function statistics(accidentsData, tracksData) {
    document.getElementById("totalAccidents").innerText = accidentsData.features.length;

    //list the number of accident for each track
    let trackAccidents = {};
    tracksData.features.forEach(feature => {
        trackAccidents[feature.properties.Name] = 0;
    });
    accidentsData.features.forEach(accident => {
        const track = accident.properties.circuit;
        trackAccidents[track] = (trackAccidents[track] || 0) + 1;
    });

    //find the most dangerous one
    const mostDangerousTrack = Object.entries(trackAccidents)
        .sort((a, b) => b[1] - a[1])[0];
    document.getElementById("mostDangerousTrack").textContent =
        `${mostDangerousTrack[0]} (${mostDangerousTrack[1]})`;

    // find the year with the most accidents
    const yearAccidents = {};
    accidentsData.features.forEach(accident => {
        const year = accident.properties.date.split('-')[0];
        yearAccidents[year] = (yearAccidents[year] || 0) + 1;
    });
    const mostDangerousYear = Object.entries(yearAccidents)
        .sort((a, b) => b[1] - a[1])[0];
    document.getElementById("mostDangerousYear").textContent =
        `${mostDangerousYear[0]} (${mostDangerousYear[1]})`;

    // type of the most risky session
    const sessionAccidents = {};
    accidentsData.features.forEach(accident => {
        const session = accident.properties.eventType;
        sessionAccidents[session] = (sessionAccidents[session] || 0) + 1;
    });
    const mostDangerousSession = Object.entries(sessionAccidents)
        .sort((a, b) => b[1] - a[1])[0];
    document.getElementById("mostDangerousSession").textContent =
        `${mostDangerousSession[0]} (${mostDangerousSession[1]})`;

    // update the weather graphic
    updateWeatherChart(accidentsData);
    // update timeline
    updateAccidentsTimeline(accidentsData);

    return trackAccidents;
}

function updateWeatherChart(accidentsData) {
    const weatherStats = {};
    accidentsData.features.forEach(accident => {
        const weather = accident.properties.weather;
        weatherStats[weather] = (weatherStats[weather] || 0) + 1;
    });

    const weatherChart = document.getElementById("weatherChart");
    weatherChart.innerHTML = '';

    Object.entries(weatherStats).forEach(([weather, count]) => {
        const percentage = (count / accidentsData.features.length) * 100;
        weatherChart.innerHTML += `
            <div class="weatherBar">
                <div class="weatherLabel">${weather}</div>
                <div class="weatherValue" style="width: ${percentage}%">${count}</div>
            </div>
        `;
    });
}

function updateAccidentsTimeline(accidentsData) {
    const timeline = document.getElementById("accidentsTimeline");
    const sortedAccidents = accidentsData.features
        .sort((a, b) => new Date(b.properties.date) - new Date(a.properties.date));

    timeline.innerHTML = sortedAccidents.map(accident => `
        <div class="timelineItem">
            <div class="timelineDate">${accident.properties.date}</div>
            <div class="timelineContent">
                <strong>${accident.properties.pilot}</strong>
                <p>${accident.properties.circuit} - ${accident.properties.eventType}</p>
            </div>
        </div>
    `).join('');
}

/* ==============================
 *       Pilot List section
 * ============================== */
function loadYear(accidentsData, sessionFilter) {
    let selectedYear = document.getElementById("yearFilter");
    for (let i=0; i <= 27; i++) {   //Remove all option selected before
        selectedYear.remove(1);
    }
    if(sessionFilter == null){
        const years = [...new Set(accidentsData.features.map(e =>
            e.properties.date.slice(0,3)+'0')
        )].sort();
        console.log("year: ",years);
        years.forEach(year => {
            const option = document.createElement("option");
            option.value = year;
            option.textContent = year;
            selectedYear.appendChild(option);
        })
    }
    else{
        const years = [...new Set(accidentsData.features
            .filter(e => e.properties.eventType === sessionFilter)
            .map(el => el.properties.date.slice(0,3))
        )].sort();
        console.log("year: ",years);
        years.forEach(year => {
            const y = accidentsData.features.find(e => e.properties.date.slice(0,3) === year);
            const option = document.createElement("option");
            option.value = y.properties.date.slice(0,4);
            option.textContent = y.properties.date.slice(0,4);
            selectedYear.appendChild(option);
        })

    }
}
function loadSession(accidentsData, yearFilter) {
    let selectSession = document.getElementById("sessionFilter");
    for (let i=0; i <= 52; i++) {   //Remove all option selected before
        selectSession.remove(1);
    }
    if(yearFilter == null){
        const session = [...new Set(accidentsData.features.map(e =>
            e.properties.eventType)
        )];

        session.forEach(sess => {
            const option = document.createElement("option");
            option.value = sess;
            option.textContent = sess;
            selectSession.appendChild(option);
        })
    }
    else{
        const session =  [...new Set(accidentsData.features
            .filter(e => e.properties.date.slice(0,3) === yearFilter.slice(0,3))
            .map(el => el.properties.eventType)
        )];
        console.log("session: ",session);
        session.forEach(sess => {
            const session = accidentsData.features.find(e => e.properties.eventType === sess);
            console.log("sessione: ",session);
            const option = document.createElement("option");
            option.value = session.properties.eventType;
            option.textContent = session.properties.eventType;
            selectSession.appendChild(option);
        })
    }
}

function selectedYearFilter(accidentsData){
    const select = document.getElementById("yearFilter");
    select.onchange = e => {
        yearFilter = e.target.value;
        loadSession(accidentsData, yearFilter);
        updatePilotsList(accidentsData);
    }
}
function selectedSessionFilter(accidentsData) {
    const select = document.getElementById("sessionFilter");
    select.onchange = e => {
        sessionFilter = e.target.value;
        console.log("sessionfilter: ",sessionFilter);
        loadYear(accidentsData, sessionFilter);
        updatePilotsList(accidentsData);
    }
}

//Update pilots list with filters
function updatePilotsList(accidentsData, yearFilter = 'all', sessionFilter = 'all') {
    if(yearFilter != 'all'){}
    const filtered = accidentsData.features.filter(accident => {
        const year = accident.properties.date.slice(0,3);
        const session = accident.properties.eventType;
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
        stats[pilot].years.add(accident.properties.date.slice(0,3));
        stats[pilot].sessions.add(accident.properties.eventType);
        return stats;
    }, {});

    // Create and display pilot cards
    const pilotsGrid = document.getElementById("pilotsGrid");
    pilotsGrid.innerHTML = Object.entries(pilotStats)
        .sort((a, b) => b[1].accidents - a[1].accidents)
        .map(([name, data]) => {
            const wikiUrl = `https://fr.wikipedia.org/wiki/${name.replace(/ /g, '_')}`;
            return `
            <div class="pilotCard">
                <a href="${wikiUrl}" target="_blank" class="pilotLink">
                    <div class="pilotImage" id="pilot-img-${name.replace(/ /g, '-')}">
                        <div class="noImage">Photo unavailable</div>
                    </div>
                    <div class="pilotInfo">
                        <div class="pilotName">${name}</div>
                        <div class="pilotStats">
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

/* ==========================
 *       Layer section
 * ========================== */


function trackMapLayer(trackData,accidentsData, risksData) {
    // track layer
    trackLayer = L.geoJSON(trackData,{
        onEachFeature: bindTrackPopup
    }).addTo(map);

    // accidents layer
    accidentsLayer = L.geoJSON(accidentsData.features,{
        pointToLayer: function (feature, latlng) {
            return createAccidentMarker(feature, latlng);
        }
    }).addTo(map)

    // Display risk zones
    riskZonesLayer = L.geoJSON(risksData, {
        style: {
            fillColor: '#ef4444',
            weight: 1,
            opacity: 0.5,
            fillOpacity: 0.2
        }
    }).addTo(map);
}

function createAccidentMarker(feature, latlng) {
    const popupContent =`
        <div class="accident-popup">
            <h3>Détails de l'accident</h3>
            <p class="pilot">Pilote : ${feature.properties.pilot}</p>
            <p class="details">Voiture : ${feature.properties.car}</p>
            <p class="details">Date : ${feature.properties.date}</p>
            <p class="details">Circuit : ${feature.properties.circuit}</p>
            <p class="details">Type de session : ${feature.properties.eventType}</p>
            <p class="details">Conditions météo : ${feature.properties.weather}</p>
            <p class="details">Description : ${feature.properties.description}</p>
            <p class="details">Mortel : ${feature.properties.fatal}</p>
        </div>
    `;

    const circle = L.circleMarker(latlng, {
        radius: 8,
        fillColor: "#ff4444",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    }).bindPopup(popupContent);

    circle.on('mouseover', function() {
        circle.setStyle({
            weight: 5,
            fillOpacity: 0.7
        });
        circle.bringToFront();
    });
    circle.on('mouseout', function() {
        circle.setStyle({
            weight: 2,
            fillOpacity: 0.4
        });
    });
    return circle;
}

function bindTrackPopup(feature, layer) {
    const popupContent = `
        <div class="circuitPopup">
            <h3>${feature.properties.Name}</h3>
            <p>Pays: ${feature.properties.Location}</p>
            <p>Création: ${feature.properties.opened}</p>
            <p>longueur: ${feature.properties.length}</p>
        </div>
    `;
    layer.bindPopup(popupContent);
    layer.on('mouseover', function() {

        layer.openPopup();
    });
    layer.on('mouseout', function() {
        layer.closePopup();
    })
}
//
// // Risk level definitions with color coding and thresholds
// const RISK_LEVELS = {
//     0: { text: 'Risque faible (0 accident)', color: '#10b981', min: 0, max: 0 },
//     1: { text: 'Risque modéré (1 accident)', color: '#f59e0b', min: 1, max: 1 },
//     2: { text: 'Risque élevé (2 accidents)', color: '#ef4444', min: 2, max: 2 },
//     3: { text: 'Risque extrême (3+ accidents)', color: '#7f1d1d', min: 3, max: Infinity }
// };
// //======= Found the nearest circuit
//
// // Enhance circuit data with additional information
// function enhanceCircuitData(trackData, locationData, accidentsData) {
//     return {
//         type: "FeatureCollection",
//         features: trackData.features.map(circuit => {
//             const location = locationData.features.find(loc => loc.properties.id === circuit.properties.id);
//             const accidentCount = countCircuitAccidents(circuit, accidentsData);
//
//             return {
//                 ...circuit,
//                 properties: {
//                     ...circuit.properties,
//                     ...location?.properties,
//                     accidents: accidentCount,
//                     riskLevel: getRiskLevel(accidentCount)
//                 }
//             };
//         })
//     };
// }
//
// // Count accidents for a specific circuit
// function countCircuitAccidents(circuit, accidentsData) {
//     return accidentsData.features.filter(accident =>
//         isAccidentNearCircuit(accident.geometry.coordinates, circuit)
//     ).length;
// }
//
// // Check if an accident is near a circuit
// function isAccidentNearCircuit([lon, lat], circuit) {
//     const circuitPoints = circuit.geometry.coordinates;
//     const maxDistance = 1000; // 1km radius
//
//     return circuitPoints.some(([clon, clat]) =>
//         calculateDistance(lat, lon, clat, clon) < maxDistance
//     );
// }
//
// // Calculate distance between two points using Haversine formula
// function calculateDistance(lat1, lon1, lat2, lon2) {
//     const R = 6371e3; // Earth's radius in meters
//     const φ1 = lat1 * Math.PI/180;
//     const φ2 = lat2 * Math.PI/180;
//     const Δφ = (lat2 - lat1) * Math.PI/180;
//     const Δλ = (lon2 - lon1) * Math.PI/180;
//
//     const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
//         Math.cos(φ1) * Math.cos(φ2) *
//         Math.sin(Δλ/2) * Math.sin(Δλ/2);
//
//     return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
// }
// // Get risk level based on accident count
// function getRiskLevel(accidentsData) {
//     for (const [level, config] of Object.entries(RISK_LEVELS)) {
//         if (accidentsData >= config.min && accidentsData <= config.max) {
//             return level;
//         }
//     }
//     return '0';
// }
//
// // Get circuit style based on risk level
// function getCircuitStyle(feature) {
//     const riskLevel = feature.properties.riskLevel || '0';
//     return {
//         color: RISK_LEVELS[riskLevel].color,
//         weight: 3,
//         opacity: 0.8
//     };
// }




window.onload = async () => {

    map = L.map('map', {
        center: [46.863, 3],
        zoom: 6
    })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
    }).addTo(map);

    try {
        const tracksResponse = await fetch("data/f1-tracks.geojson");
        const locationResponse = await fetch("data/f1-locations.geojson");
        const countriesResponse = await fetch("data/countries-FR.json");
        const accidentsResponse = await fetch("data/f1-accidents.geojson");
        const risksResponse = await fetch("data/risk-zones.geojson");

        const trackData = await tracksResponse.json();
        const locationData = await locationResponse.json();
        const countriesData = await countriesResponse.json();
        const accidentsData = await accidentsResponse.json();
        const risksData = await risksResponse.json();


        // const enhancedCircuits = enhanceCircuitData(trackData, locationData, accidentsData);
        //
        trackMapLayer(trackData,accidentsData, risksData);

        // ================================= //
        //* ====== Statistic section ====== *//
        // ================================= //

        //list of every track with there number of accident
        listTrackstat = statistics(accidentsData, trackData);

        // ================================ //
        //* ====== Selector section ====== *//
        // ================================ //

        //Load all country prefix from locationData and the name from countriesData
        loadCountry(locationData, countriesData,selectedRisk);
        //Load all track from locationData
        loadTrack(locationData);
        //track selector
        selectTrack(locationData);
        //country selector
        selectCountry(locationData);
        // risk selector
        selectRisk(locationData, accidentsData, countriesData);


        document.getElementById("reset")
            .addEventListener("click", function() {
                selectedCountry = '';
                selectedTrack = '';
                selectedRisk = "all";
                loadCountry(locationData, countriesData,selectedRisk);
                loadTrack(locationData);
                document.getElementById("countF1").selectedIndex = 0;
                document.getElementById("trackF1").selectedIndex = 0;
                map.flyTo([46.863, 3], 6);
                document.getElementById("riskFilter").selectedIndex = 0;
            })



        // ================================== //
        //* ====== Pilot List section ====== *//
        // ================================== //

        // updatePilotsList(accidentsData, yearFilter = 'all', sessionFilter = 'all')
        loadYear(accidentsData);
        loadSession(accidentsData)

        selectedYearFilter(accidentsData);
        selectedSessionFilter(accidentsData);

        updatePilotsList(accidentsData);

        // selectedYearFilter(accidentsData);
        // selectedSessionFilter(accidentsData)
        // updatePilotsList(accidentsData);




    }
    catch (error) {
        console.error("Error loading GeoJSON data:", error);
        alert("Error loading map data. Please try again later");
    }
};