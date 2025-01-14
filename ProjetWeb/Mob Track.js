"use strict";
function createLayer(data, ) {
    return L.geoJSON(data, {
        filter: function (feature, layer) {
            return feature.properties;

        },
        // pointToLayer: (geoJsonPoint, latlng) => {
        //     let value = geoJsonPoint.properties[prop];
        //     let maxMap = 20;
        //     let toSurface = (value) =>{ return (Math.PI*value*value)};
        //     let fromSurface = (value) => { return Math.sqrt(value / Math.PI);};
        //     let radius =  40 * fromSurface(value / max * toSurface(maxMap));
        //     return L.circle(latlng, {radius: radius,
        //         color: 'blue',
        //         stroke: false,
        //         opacity: 0.5,
        //     }).bindTooltip('Chomage :' + geoJsonPoint.properties[prop]);}
    });
}

function circuitLayer() {

}



window.onload = async () => {
    //create a map
    let map = L.map('map', {
        center: [30.135,-97.633],//[46.863,3.164],
        zoom: 17
    })
    let layer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        // subdomains:['mt0','mt1','mt2','mt3'],
        maxZoom: 15,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
    }).addTo(map);

    let response = await fetch ("f1-circuits.geojson");
    let data = await response.json();

    let geoLayer = createLayer(data).addTo(map);
    console.log(data);

    let response_2 = await fetch ("f1-locations.geojson");
    let data_2 = await response_2.json();
    console.log(data_2);

    let response_3 = await fetch ("accidents.geojson");
    let data_3 = await response_3.json();
    console.log(data_3);
    
    let response_4 = await fetch ("risk-zones.geojson");
    let data_4 = await response_4.json();
    console.log(data_4);
    //reload the pages function of selector
    let select = document.getElementById("cir_f1");
    select.onchange = e => {
        map.removeLayer(geoLayer);
        geoLayer = createLayer(data, chm, e.target.value);
        geoLayer.addTo(map);
    };


};
