import React from 'react';
import wave from '../../../images/waves_symbol.png';

/*
    Finds and parse the data in a layer

    Requires: A single unformatted map layer
    Ensures: A single FORMATTED plot layer is returned 
*/
export function parseLayer(layer) {
    return layer.values_
}

/*
    Determines if the required layers are available to create this plot
 
    Requires: A list of all layers in the map, unformatted
    Ensures: A boolean value is returned indicating whether the data required to plot is available
*/
export function disabled(layers) {
    /*for (let layer in layers) {
        let layer_data = this.parseLayer(layer);
        console.warn(layer_data);
    }*/

    return true;
}

export function plotType() {
    return this.state.plotType
}

/*

*/
export function formatQuery(data) {
    let query = {
        dataset: "giops_day",
        names: ["52.88, -47.39"],
        plotTitle: "",
        quantum: "day",
        showmap: true,
        station: [[52.88, -47.39, null]],
        time: 2199916800,
        type: "profile",
        variable: ["votemper"]
    }
    let url = "/api/v1.0/plot/?query=" + encodeURIComponent(stringify(query));
    console.warn("URL: ", url);
    return url;
}

/*
    This function will use the data in one or more map layers to fetch and return a plot

    Requires: List of all layers in the map, unformatted
    Ensures: A plot image is returned

    // Future Functionality
    This should eventually return data to plot with a JavaScript library, rather than an image generated through a python library
*/
export function plot(layers) {
    layers = [];
    for (let layer in layers) {
        layers.push(this.parseLayer(layer));
    }
    console.warn("LAYERS: ", layers);
    let layerData = undefined;
    let request = new XMLHttpRequest();

    /*  REQUESTS PLOT
    request.open('GET', this.formatQuery( layerData ))
    request.send();

    if (request.status === 200) {
        return request.responseText
    } else {
        return false
    }
    */

    let test_image = <img src={wave} className='PlotImage'></img>
    return test_image
}


