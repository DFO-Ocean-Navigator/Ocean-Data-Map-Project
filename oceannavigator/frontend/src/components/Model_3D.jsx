import React from 'react';
import ComboBox from "./ComboBox.jsx";
import { Panel, Row, Col, Button } from 'react-bootstrap';
import SelectBox from "./SelectBox.jsx";
import Plot from 'react-plotly.js';
import DataLayer from './ModelLayers/DataLayer.jsx';
import BathLayer from './ModelLayers/BathLayer.jsx';

const stringify = require("fast-stable-stringify");
const i18n = require("../i18n.js");
const LOADING_IMAGE = require("../images/spinner.gif");
export default class Model_3D extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            layers: [],
            data_panels: [],
            index: 2,
            url: LOADING_IMAGE,
            query: {
                "area": this.props.area,
                "interp": this.props.interp,
                "neighbours": this.props.neighbours,
                "projection": this.props.projection,
                "radius": this.props.radius,
                "time": this.props.time,
                "dataset": "giops_day",
                "variable": "criticaldepth",
                "depth": 0,
            },
            layout: {
                scene: {
                    "xaxis": {"title": "Longitude"},
                    "yaxis": {"title": "Latitude"},
                    "zaxis": {"title": "Depth"}
                }
            },
            lat: undefined,
            lon: undefined,
        }

        this.urlFromQuery = this.urlFromQuery.bind(this);
        this.addDataLayer = this.addDataLayer.bind(this);
        this.updateDataLayer = this.updateDataLayer.bind(this);
        this.removeDataLayer = this.removeDataLayer.bind(this);
        this.addDataPanel = this.addDataPanel.bind(this);
        this.removeDataPanel = this.removeDataPanel.bind(this);
        this.getLatLon = this.getLatLon.bind(this);
        this.addVerticalLine = this.addVerticalLine.bind(this);
    }

    componentDidMount() {
        this._mounted = true;
        this.getLatLon(this.state.query);
    }

    /*
        Adds the provided layer to the plot
    */
    addDataLayer(idx, layer) {
        console.warn("addDataLayer");
        let layers = this.state.layers;
        layers.push(layer);
        idx = layers.indexOf(layer);
        console.warn("LAYERS: ", layers)
        this.setState({
            layers: layers
        })
        return idx;
    }

    /*
        Updates the specified data with the provided data
    */
    updateDataLayer(old, layer) {
        let layers = jQuery.extend([], this.state.layers);
        if (old === undefined) {
            layers.push(layer);
            this.setState({
                layers: layers
            })
        }
        let idx = layers.indexOf(old);
        layers[idx] = layer;
        this.setState({
            layers: layers
        })
    }

    /*
        Removes the specified layer from the plot
    */
    removeDataLayer(layer) {
        let layers = this.state.datalayers;
        let idx = layers.indexOf(layer);
        layers.splice(idx, 1);

        this.setState({
            layers: layers
        })
    }

    addDataPanel() {
        let data_panels = this.state.data_panels;
        
        let index = this.state.index;
        data_panels.push(index);
        index = index + 1;

        this.setState({
            data_panels: data_panels,
            index: index
        })
    }

    removeDataPanel(panel, layer) {
        let data_panels = jQuery.extend([], this.state.data_panels);
        let idx = data_panels.indexOf(panel);
        data_panels.splice(idx, 1);
        
        // Needs to remove data too
        let layers = jQuery.extend([], this.state.layers);
        if (layer !== undefined) {
            idx = layers.indexOf(layer);
            layers.splice(idx,1);    
        }
        
        this.setState({
            data_panels: data_panels,
            layers: layers
        })
    }
    
    urlFromQuery(header, query) {
        return header + "?query=" + encodeURIComponent(stringify(query));
    }

    getLatLon(query) {
        let self = this;
        $.ajax({
            type: 'GET',
            dataType: 'json',
            url: this.urlFromQuery('/api/v1.0/data/latlon/', query),
            success: function(result) {
                self.setState({
                    lat: result[0],
                    lon: result[1]
                })
            }
        })
    }

    addVerticalLine(points) {
        console.warn("POINTS: ", points.points);
        try {
            point = points
            console.warn("POINT: ", point);
            console.warn("pointNumber: ", point[0]);
            console.warn("x, y, _cmin, _cmax: ", point[0].x, point[0].y, point[0].fullData._cmin, point[0].fullData._cmax)
            let layers = jQuery.extend([], this.state.layers);
            let line_3d = {
                x: [[point[0].x],[point[0].x]],
                y: [[point[0].y],[point[0].y]],
                z: [[point[0].fullData._cmin],[point[0].fullData._cmax]],
                type: 'scatter3d',
                mode: 'lines'
            }
            layers.push(line_3d)
            this.setState({
                layers: layers,
                vLine: line_3d,
            })
        } catch (err) {

        }
        
    }

    render() {
        
        let layers = []
        
        layers.push(
            <BathLayer
                key='bathymetry'
                addDataLayer={this.addDataLayer}
                updateDataLayer={this.updateDataLayer}
                removeDataLayer={this.removeDataLayer}
                urlFromQuery={this.urlFromQuery}
                area={this.props.area}
                interp={this.props.interp}
                neighbours={this.props.neighbours}
                projection={this.props.projection}
                radius={this.props.radius}
                time={this.props.time}
                lat={this.state.lat}
                lon={this.state.lon}
            ></BathLayer>
        )
        for (let idx in this.state.data_panels) {
            idx = this.state.data_panels[idx];
            console.warn("IDX: ", idx)
            layers.push(
                <DataLayer
                    index={idx}
                    key={idx}
                    value={idx}
                    urlFromQuery={this.urlFromQuery}
                    addDataLayer={this.addDataLayer}
                    updateDataLayer={this.updateDataLayer}
                    removeDataLayer={this.removeDataLayer}
                    area={this.props.area}
                    interp={this.props.interp}
                    neighbours={this.props.neighbours}
                    projection={this.props.projection}
                    radius={this.props.radius}
                    time={this.props.time}
                    lat={this.state.lat}
                    lon={this.state.lon}
                    removeDataPanel={this.removeDataPanel}
                ></DataLayer>
            )
        }    
        
        
        let add_panel = (
            <Button
                onClick={this.addDataPanel}
            >Add Data Layer</Button>
        )

        let plot_container = null;
        if (this.state.layers.length === 0) {
            plot_container = <img src={this.state.url} />
        } else {
            plot_container = (
                <Plot style={{height: '100%'}}
                    data={this.state.layers}
                    layout={this.state.layout}
                    onClick={this.addVerticalLine}
                ></Plot>
            )
        }
        
        
        let content = (
            <Row style={{ height: '100%' }}>
                <Col lg={2} style={{ height: '100%' }}>
                    {layers}
                    {add_panel}
                </Col>
                <Col lg={8} style={{ height: '100%' }}>
                    <div style={{ height: '100%', width: '100%' }}>
                        {plot_container}
                    </div>
                </Col>
            </Row>
        )
        


        return (
            <div style={{ height: "100%" }}>
                {content}
            </div>
        )
    }
}