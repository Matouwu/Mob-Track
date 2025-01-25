"use strict";

let idCount='';  //Country selected by the user
let idTrack;            //Track selected by the user
let map;
let marker;
let nbAcci;
let nbColli;
let totalRisk;
let dangerousNb=0;
let dangerousTrack;
let data;

// Track layer
function createLayer(data) {
    return L.geoJSON(data);
}



/* ==========================
 *     Selector section
 * ========================== */

function loadCountry(locationData, countryData) {
    const select = document.getElementById("countF1");
    let countCo = 0;

    const countryNames = [...new Set(locationData.features.map(feature => feature.properties.id.slice(0,2)).sort())];
    countryNames.forEach(country => {
        countCo++;
        const option = document.createElement("option");
        option.value = country;
        option.textContent = countryData[country.toUpperCase()];
        select.appendChild(option);
    })
    const countryCo = document.getElementById("countryCo");
    countryCo.textContent = countryCo.textContent + " (" + countCo + ")";
}

function loadTrack(locationData) {
    const select = document.getElementById("trackF1");
    for (let i=0; i <= 35; i++) {   //Remove all option selected before
        select.remove(1);
    }
    let countTra = 0;  //count the number of track
    if(idCount === ''){
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
        const tra = locationData.features.filter(e => e.properties.id.slice(0,2) === idCount);
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

/*
 * change the center of the map depend on the idTrack
 */
function goToTrack(locationData, idTrack) {
    const tra = locationData.features.find(e => e.properties.id === idTrack);
    console.log('cir:' ,tra);
    let lat = tra.properties.lat;
    let lon = tra.properties.lon;
    map.flyTo([lat, lon], 15);
    marker = L.marker([lat, lon]);
    marker.bindTooltip(tra.properties.name);
    marker.addTo(map);
}

function selectCountry(locationData) {
    let selectedCountry = document.getElementById("countF1");
    selectedCountry.onchange = e=>{
        idCount = e.target.value;
        loadTrack(locationData);
        console.log('idcount:', idCount);
    }
}

function selectTrack(locationData) {
    let selectedTrack = document.getElementById("trackF1");
    selectedTrack.onchange = e=>{
        idTrack = e.target.value;
        console.log("idTrack:", idTrack);
        goToTrack(locationData, idTrack);
    }
}

// function selectRisk(locationData, riskTrack){
//     let selectedRisk = document.getElementById("riskFilter");
//     selectedRisk.onchange = e=>{
//         idTrack = e.target.value;
//     }
// }


/* ==========================
 *   Statistic information
 * ========================== */

function statistics( accidents, collisions, mostDangerous){
    document.getElementById("totalAccidents").innerText = accidents;
    document.getElementById("totalCollisions").innerText = collisions;
    document.getElementById("mostDangerousTrack").innerText = mostDangerous;
}


async function loadRiskTrack(trackAPIData, listTrackId, riskTrack) {
    for (const trackId of listTrackId) {
        const statusResp = await fetch (`http://ergast.com/api/f1/circuits/${trackId}/status.json`);
        const statData = await statusResp.json();

        const statName= trackAPIData.MRData.CircuitTable.Circuits.find(e => e.circuitId === trackId).circuitName;
        nbAcci = statData.MRData.StatusTable.Status[2].count;
        nbColli =statData.MRData.StatusTable.Status[3].count;
        riskTrack.push({
            id: trackId,
            name: statName,
            accidents: parseInt(nbAcci),
            collisions: parseInt(nbColli),
            totalRisk: parseInt(nbAcci) + parseInt(nbColli)
        })
    }
}

async function loadDangerousTrack(trackAPIData, riskTrack, listTrackId){
    await loadRiskTrack(trackAPIData, listTrackId, riskTrack);
    console.log("DangerousTrack :", riskTrack);

    riskTrack.forEach(track => {
        if(track.totalRisk > dangerousNb){
            dangerousNb = track.totalRisk;
            dangerousTrack = track;
        }
    })
    console.log("DangerousTrack :", dangerousTrack);
}




/* ==========================
 *     Track information
 * ========================== */

function createTrackInfo(trackAPIData, idTrack){
    const trackInfo = trackAPIData.MRData.CircuitTable.Circuits;
    trackInfo.forEach(feature => {
        const popupContent = `
            <div class="circuit-popup">
                <h3>${feature.circuitName}</h3>
                <p>Longueur : ${feature.Location.long}</p>
            </div>
        `;
        marker = L.marker([feature.Location.lat,feature.Location.long]).bindPopup(popupContent).addTo(map);
    })
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
        const trackAPIResponse = await fetch("http://ergast.com/api/f1/circuits.json?limit=77&offset=0");
        const statusResponse = await fetch("http://ergast.com/api/f1/status.json");

        const trackData = await tracksResponse.json();
        const locationData = await locationResponse.json();
        const countriesData = await countriesResponse.json();
        const trackAPIData = await trackAPIResponse.json();
        const statusData = await statusResponse.json();


        let geoLayer = createLayer(trackData).addTo(map);

        // ================================= //
        //* ====== Statistic section ====== *//
        // ================================= //

        const accidents = statusData.MRData.StatusTable.Status[2].count;
        const collisions = statusData.MRData.StatusTable.Status[3].count;
        //List of every track with there number of accidents and collision
        let riskTrack = [];
        let listTrackId = trackAPIData.MRData.CircuitTable.Circuits.map(e => e.circuitId);
        await loadDangerousTrack(trackAPIData, riskTrack, listTrackId);
        const mostDangerous = trackAPIData.MRData.CircuitTable.Circuits.find(e => e.circuitId === dangerousTrack.id).circuitName;
        console.log("DangerousTrack :", mostDangerous);

        statistics( accidents, collisions, mostDangerous);

        // ================================ //
        //* ====== Selector section ====== *//
        // ================================ //

        //Load all country prefix from locationData and the name from countryData
        loadCountry(locationData, countriesData);
        //Load all track from locationData
        loadTrack(locationData);
        //track selector
        selectTrack(locationData);
        //country selector
        selectCountry(locationData);
        // risk selector
        // console.log("riskTrack :", riskTrack);
        // selectRisk(locationData, riskTrack);


        document.getElementById("reset")
            .addEventListener("click", function() {
                document.getElementById("countF1").selectedIndex = 0;
                idCount = '';

                loadTrack(locationData);
                document.getElementById("trackF1").selectedIndex = 0;
                map.flyTo([46.863, 3], 6);
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
