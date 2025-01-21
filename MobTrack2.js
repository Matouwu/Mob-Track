"use strict";


let idCount;
let idTrack;
let map;
let marker;

//Filter
function createLayer(data) {
    return L.geoJSON(data, {
        filter: function (feature, layer) {
            return feature.properties;
        }
    });
}

/*
 * Load all track from locationData
 */
function loadTrack(locationData) {
    const select = document.getElementById("trackF1");
    let countTra = 0;  //count the number of track

    const tra = locationData.features.map(feature => feature.properties);
    tra.forEach(track => {
        countTra++;
        const option = document.createElement("option");
        option.value = track.id;
        option.textContent = track.name;
        select.appendChild(option);

    })

    const trackCo = document.getElementById("trackCo");
    trackCo.textContent = trackCo.textContent + " (" + countTra + ")";
}

/*
 * Load all country prefix from locationData and the name from countryData
 */
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
    marker.bindTooltip("Beach");
    marker.addTo(map);
}

/*
 * track selector
 */
function selectTrack(locationData) {
    let selectedTrack = document.getElementById("trackF1");
    selectedTrack.onchange = e=>{
        idTrack = e.target.value;
        goToTrack(locationData, idTrack);
    }
}

/*
 * country selector
 */
function selectCountry(locationData) {
    let selectedCountry = document.getElementById("countF1");
    selectedCountry.onchange = e=>{
        idCount = e.target.value;
        updateTrack(locationData);
        console.log('idcount:', idCount);
    }
}
/*
 * Update track selector depending the country selected
 */
function updateTrack(locationData) {
    const select = document.getElementById("trackF1");

    for (let i=0; i <= 35; i++) {   //Remove all option selected before
        select.remove(1);
    }

    let countUTra = 0;  //count the number of track
    const tra = locationData.features.filter(e => e.properties.id.slice(0,2) === idCount);
    tra.forEach(track => {
        countUTra++;
        const option = document.createElement("option");
        option.value = track.properties.id;
        option.textContent = track.properties.name;
        select.appendChild(option);
    })

    const trackCo = document.getElementById("trackCo");
    trackCo.textContent = "Choisir un circuit (" + countUTra + ")";
}

window.onload = async () => {
    //create a map
    map = L.map('map', {
        center: [46.863, 3],
        zoom: 6
    })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 15,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
    }).addTo(map);

    const circuitResponse = await fetch ("f1-circuits.geojson")
    const locationResponse = await fetch ("f1-locations.geojson");
    const pointResponse = await fetch ("f1-startpoint.geojson");
    const countryResponse = await fetch ("countries-FR.json");
    const circuitsData = await circuitResponse.json();
    const locationData = await locationResponse.json();
    const pointData = await pointResponse.json();
    const countryData = await countryResponse.json();


    let geoLayer = createLayer(circuitsData).addTo(map);
    console.log(circuitsData);
    console.log(locationData);

    loadTrack(locationData);
    loadCountry(locationData, countryData);

    selectTrack(locationData);
    selectCountry(locationData);

    document.getElementById("reset")
        .addEventListener("click", function() {
            document.getElementById("countF1").selectedIndex = 0;
            document.getElementById("trackF1").selectedIndex = 0;
            map.flyTo([46.863, 3], 6);
        })

};