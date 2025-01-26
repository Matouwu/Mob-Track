"use strict";

let selectedCountry='';  //Country selected by the user
let selectedTrack;            //Track selected by the user
let selectedRisk="all";
let map;
let marker;
let risk = null;
let data;
let listTrackstat ={};

/* ==========================
 *       Layer section
 * ========================== */
function createLayer(trackData, selectedTrack = null, selectedRisk = "all") {
    return L.geoJSON(trackData, {
        // filter: function(feature) {
        //     if (selectedTrack && feature.properties.Name !== selectedTrack) return false;
        //
        //     if (selectedRisk !== "all") {
        //         const accidents = feature.properties.accidents || 0;
        //         const risk = getCircuitRiskLevel(accidents).level;
        //         if (risk !== selectedRisk) return false;
        //     }
        //
        //     return true;
        // },
        // style: function(feature) {
        //     const accidents = feature.properties.accidents || 0;
        //     const risk = getCircuitRiskLevel(accidents);
        //
        //     let color;
        //     switch (risk.level) {
        //         case "low": color = "#10b981"; break;
        //         case "moderate": color = "#f59e0b"; break;
        //         case "high": color = "#ef4444"; break;
        //         case "extreme": color = "#7f1d1d"; break;
        //         default: color = "#2c5282";
        //     }
        //
        //     return {
        //         color: color,
        //         weight: 3,
        //         opacity: 1,
        //         fillColor: color,
        //         fillOpacity: 0.7
        //     };
        // },
        // onEachFeature: function(feature, layer) {
        //     const accidents = feature.properties.accidents || 0;
        //     const risk = getCircuitRiskLevel(accidents);
        //
        //     const popupContent = `
        //         <div class="circuit-popup">
        //             <h3>${feature.properties.Name}</h3>
        //             <p>Longueur : ${feature.properties.length || 'N/A'}</p>
        //             <p>Accidents : ${accidents}</p>
        //             <p class="risk-${risk.level}">${risk.text}</p>
        //         </div>
        //     `;
        //     layer.bindPopup(popupContent);
        //
        //     layer.on({
        //         mouseover: function(e) {
        //             const layer = e.target;
        //             layer.setStyle({
        //                 weight: 5,
        //                 fillOpacity: 0.9
        //             });
        //             layer.bringToFront();
        //         },
        //         mouseout: function(e) {
        //             const layer = e.target;
        //             circuitsLayer.resetStyle(layer);
        //         }
        //     });
        // }
    });
}


function createAccidentMarker(feature,latlng) {
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

    return L.circleMarker(latlng, {
        radius: 8,
        fillColor: "#ff4444",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    }).bindPopup(popupContent);
}



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
        const countryNames = [...new Set(locationData.features.map(feature => feature.properties.id.slice(0,2)).sort())];
        countryNames.forEach(country => {
            countCo++;
            const option = document.createElement("option");
            option.value = country;
            option.textContent = countriesData[country.toUpperCase()];
            select.appendChild(option);
        })
        const countryCo = document.getElementById("countryCo");
        countryCo.textContent ="Choisir un pays (" + countCo + ")";
    }
    else{
        //list of track who have same value with "selectedRisk"
        let listCountry = {};
        for(let k in listTrackstat) {
            if(listTrackstat[k] == selectedRisk){
                listCountry[k] = listTrackstat[k];
            }
        }
        for(let k in listCountry) {
            const countryK = locationData.features.find(feature =>
                feature.properties.name === k);
            countCo++;
            const option = document.createElement("option");
            option.value = countryK.properties.id.slice(0,2).toUpperCase();
            option.textContent = countriesData[countryK.properties.id.slice(0,2).toUpperCase()];
            select.appendChild(option);
        }
        const countryCo = document.getElementById("countryCo");
        countryCo.textContent ="Choisir un pays (" + countCo + ")";
    }

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

function selectRisk(locationData,accidentsData, countriesData){

    let selectRisk = document.getElementById("riskFilter");
    selectRisk.onchange = e=>{
        selectedRisk = e.target.value;
        loadCountry(locationData, countriesData,selectedRisk);
        loadTrack(locationData);
    }
    //
    // let accidentsLayer = L.geoJSON(accidentsData, {
    //     pointToLayer: createAccidentMarker
    // }).addTo(map);
    // let riskZonesLayer = L.geoJSON(riskZonesData, {
    //     style: getRiskZoneStyle,
    //     onEachFeature: (feature, layer) => {
    //         layer.bindPopup(`
    //             <strong>Zone à risque</strong><br>
    //             ${feature.properties.description || 'Zone dangereuse'}
    //         `);
    //     }
    // }).addTo(map);
    //
    // populateCircuitSelector(tracksData, selectedRisk);
}


/* ==========================
 *   Statistic information
 * ========================== */

function statistics(accidentsData, tracksData) {
    const accidents = accidentsData.features.length;
    document.getElementById("totalAccidents").innerText = accidents;

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
    console.log("sessionAccidents:", sessionAccidents);
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



window.onload = async () => {

    map = L.map('map', {
        center: [46.863, 3],
        zoom: 6
    })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 15,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
    }).addTo(map);

    try {
        const tracksResponse = await fetch("data/f1-tracks.geojson");
        const locationResponse = await fetch("data/f1-locations.geojson");
        const countriesResponse = await fetch("data/countries-FR.json");
        const accidentsResponse = await fetch("data/f1-accidents.geojson");

        const trackData = await tracksResponse.json();
        const locationData = await locationResponse.json();
        const countriesData = await countriesResponse.json();
        const accidentsData = await accidentsResponse.json();


        // let geoLayer = L.geoJSON(trackData).addTo(map);
        let tracksLayer = createLayer(trackData).addTo(map);

            // ================================= //
            //* ====== Statistic section ====== *//
            // ================================= //

        //list of every track with there number of accident
        listTrackstat = statistics(accidentsData, trackData);
        console.log("listTrackstat:", listTrackstat);
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

        // ========================================= //
        //* ====== Track information section ====== *//
        // ========================================= //





    }
    catch (error) {
    console.error("Error loading GeoJSON data:", error);
    alert("Error loading map data. Please try again later");
    }
};
