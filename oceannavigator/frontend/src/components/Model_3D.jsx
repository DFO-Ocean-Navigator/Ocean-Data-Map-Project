import React from 'react';
import { Panel, Row, Col, Button } from 'react-bootstrap';
import Plot from 'react-plotly.js';
import DataLayer from './ModelLayers/DataLayer.jsx';
import BathLayer from './ModelLayers/BathLayer.jsx';
import RefPlane from './ModelLayers/RefPlane.jsx';
import PointContainer from './ModelLayers/Point/PointContainer.jsx';
import PropTypes from "prop-types";
import Profile from "./ModelLayers/Profile.jsx";

const stringify = require("fast-stable-stringify");
const i18n = require("../i18n.js");
const LOADING_IMAGE = require("../images/spinner.gif");
export default class Model_3D extends React.Component {
    constructor(props) {
        super(props)

        this.lock = false;
        this.state = {
            layers: [],
            data_panels: [],
            extraLayers: [],
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
                    "xaxis": { "title": "Longitude" },
                    "yaxis": { "title": "Latitude" },
                    "zaxis": { "title": "Depth" }
                }
            },
            lat: undefined,
            lon: undefined,
            point: [],
            vLine: undefined,
            revision: 1
        }

        /*
            Passed as Prop
        */
        this.urlFromQuery = this.urlFromQuery.bind(this);
        this.updateDataLayer = this.updateDataLayer.bind(this);
        this.removeDataLayer = this.removeDataLayer.bind(this);
        
        /*
            Called Automatically
        */
        this.getLatLon = this.getLatLon.bind(this);
        
        /*
            Called by Internal Functions
        */
        this.addPanel = this.addPanel.bind(this);
        this.removePanel = this.removePanel.bind(this);
        
        /*
            To Be Moved (doesn't belong in this component)
        */
        this.fetchProfile = this.fetchProfile.bind(this);
        
        /*
            Called through User Selection
        */
        this.updatePoint = this.updatePoint.bind(this);
        this.addDataPanel = this.addDataPanel.bind(this);
        this.addPointPanel = this.addPointPanel.bind(this);
        this.addPlanePanel = this.addPlanePanel.bind(this);
    }

    componentDidMount() {
        this._mounted = true;
        this.getLatLon(this.state.query);
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.state.point !== prevState.point) {
            let pointPanel = this.state.pointPanel;
            if (pointPanel !== undefined) {
                this.removePanel(pointPanel);
            }

            let layer = <PointContainer
                key='clickPoint'
                updateDataLayer={this.updateDataLayer}
                removeDataLayer={this.removeDataLayer}
                fetchProfile={this.fetchProfile}
                point={this.state.point}
            ></PointContainer>

            this.addPanel(layer);
            
            this.setState({
                pointPanel: layer
            })
        }   
    }


    /*
        Updates the specified data with the provided data
        (can also be used to create a new layer by providing undefined as the old one)
    */
    updateDataLayer(old, layer) {
        console.warn("UPDATE DATA LAYER: ", old, layer);
        try {
            let layers = this.state.layers;//jQuery.extend([], this.state.layers);
            if (old === undefined) {
                layers.push(layer);
                this.setState({
                    layers: layers
                })
                return
            }
            let idx = layers.indexOf(old);
            layers[idx] = layer;
            this.setState({
                layers: layers,
                revision: this.state.revision + 1
            })

        } catch (err) {
            console.warn("SOMETHING WENT WRONG")
        }
    }

    /*
        Removes the specified layer from the plot
    */
    removeDataLayer(layer) {
        console.warn("REMOVE DATA LAYER: ", layer);
        let layers = this.state.layers;
        let idx = layers.indexOf(layer);
        layers.splice(idx, 1);

        this.setState({
            layers: layers,
            revision: this.state.revision + 1,
        })
    }

    /*
        Adds the Specified Selection Panel to the left sidebar
    */
    addPanel (panel) {
        let layers = [];
        if (this.state.extraLayers !== undefined) {
            layers = this.state.extraLayers;
        }
        
        layers.unshift(panel);
        
        this.setState({
            extraLayers: layers
        });
    }

    /*
        Removes a previously added Selection Panel from the left sidebar
    */
    removePanel (panel, layer) {
        let panels = this.state.extraLayers;
        let idx = panels.indexOf(panel);
        panels.splice(idx, 1);
        this.setState({
            extraLayers: panels
        });

        if (layer !== undefined) {
            this.removeDataLayer(layer);
        }
    }
    
    /*
        Creates a data panel and requests it be added to the left panel
    */
    addDataPanel() {
    
        let index = this.state.index + 1;
        
        let layer = <DataLayer
            index={index}
            key={index}
            value={index}
            urlFromQuery={this.urlFromQuery}
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
            removeDataPanel={this.removePanel}
        ></DataLayer>

        this.addPanel(layer);
        this.setState({
            index: index
        })
    }

    /*
        Generates a generic url based on input
    */
    urlFromQuery(header, query) {
        return header + "?query=" + encodeURIComponent(stringify(query));
    }

    getLatLon(query) {
        let self = this;
        $.ajax({
            type: 'GET',
            dataType: 'json',
            url: this.urlFromQuery('/api/v1.0/data/latlon/', query),
            success: function (result) {
                let lat = result[0];
                let lon = result[1];
                let i_1 = [lat[0][0], lon[0][0]]
                let i_2 = [lat[0][lat[0].length - 1], lon[0][lon[0].length - 1]]
                let i_3 = [lat[lat.length - 1][0], lon[lon.length - 1][0]]
                let i_4 = [lat[lat.length - 1][lat[lat.length - 1].length - 1], lon[lon.length - 1][lon[lon.length - 1].length - 1]]
                let corners = [i_1, i_2, i_3, i_4, i_1];
                console.warn("CORNERS CREATION: ", corners)
                let lat_corners = [i_1[0], i_2[0], i_3[0], i_4[0]];
                let lon_corners = [i_1[1], i_2[1], i_4[1], i_3[1]];

                self.setState({
                    lat: lat,
                    lon: lon,

                    corners: corners,

                    lat_corners: lat_corners,
                    lon_corners: lon_corners,
                }, () => {
                    let corners_layer = {
                        z: [0, 0, 0, 0],
                        x: lon_corners,
                        y: lat_corners,
                        type: 'scatter3d',
                        mode: 'markers'
                        //colorscale: 'Viridis',
                    }
                    self.updateDataLayer(undefined, corners_layer)
                })
            }
        })
    }

    /*
        Renders a sound speed profile through the API
    */
    fetchProfile(point) {

        let query = {
            dataset: this.state.query.dataset,
            names: [],
            quantum: this.state.query.quantum,
            showmap: 0,
            station: [[point.x, point.y]],
            time: this.state.query.time,
            type: "sound",
            compressed: true
        }

        //let url = this.urlFromQuery('/api/v1.0/plot/', query) + '&size=2x5'
        let url = 'http://dory-dev.cs.dal.ca:8021/api/v1.0/map/area/?query=%7B"points"%3A+%5B%5B51.35531765447794%2C+-49.211058497428894%5D%2C+%5B51.39920197206365%2C+-47.52356278896332%5D%2C+%5B50.24439496210104%2C+-47.4532459974289%5D%2C+%5B50.0641879487261%2C+-49.49230420589448%5D%2C+%5B51.35531765447794%2C+-49.211058497428894%5D%5D%7D';
        this.setState({
            sspeed: url
        })
    }

    /*
        Updates the point held in state when a new point on the plot is clicked
    */
    updatePoint(e) {
        let p = e.points[0]
        let point = {
            x: p.x,
            y: p.y,
            min_depth: 0,
            max_depth: p.fullData.cmin - 10
        }
        this.setState({
            point: point
        })
    }
    

    addPlanePanel() {
        let layer = <RefPlane
            key='refplane'
            addDataLayer={this.addDataLayer}
            updateDataLayer={this.updateDataLayer}
            removeDataLayer={this.removeDataLayer}
            lat_corners={this.state.lat_corners}
            lon_corners={this.state.lon_corners}
        ></RefPlane>
        this.addPanel(layer);
    }

    addPointPanel() {
        let layer = <PointContainer
            key='pointcontainer'
            updateDataLayer={this.updateDataLayer}
            removeDataLayer={this.removeDataLayer}
            fetchProfile={this.fetchProfile}
            point={this.state.point}
        ></PointContainer>
        this.addPanel(layer);
    }

    render() {

        let bathymetry = [
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
        ]

        /*for (let idx in this.state.data_panels) {
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
        }*/

        let add_panel = (
            <Button
                onClick={this.addDataPanel}
            >+ Data</Button>
        )
        let add_point = (
            <Button
                onClick={this.addPointPanel}
            >+ Point</Button>
        )

        let add_plane = (
            <Button
                onClick={this.addPlanePanel}
            >+ Plane</Button>
        )

        

        let plot_container = null;
        if (this.state.layers.length === 0) {
            plot_container = <img src={this.state.url} />
        } else {
            plot_container = (
                <Plot style={{ height: '100%' }}
                    data={this.state.layers}
                    layout={this.state.layout}
                    onClick={this.updatePoint}
                    revision={this.state.revision}
                ></Plot>
            )
        }

        let sspeed = []
        if (this.state.sspeed !== undefined) {
            sspeed = <img src={this.state.sspeed}></img>
        }

        let corners = [];
        corners = <Profile
            key='map'
            corners={this.state.corners}
        ></Profile>
        
        let layer_options = [add_panel, add_plane];
        let content = (
            <Row style={{ height: '100%' }}>
                <Col lg={2} style={{ height: '100%', width: '20%' }}>
                    <div style={{width: '100%', height: '7%'}}>{layer_options}</div>
                    <Panel
                        key='layercontainer'
                        id='layercontainer'
                        defaultExpanded
                        bsStyle='primary'
                        style={{height: '90%', overflow: 'overlay'}}
                    >
                        {bathymetry}
                        {this.state.extraLayers}
                    </Panel>
                </Col>
                <Col lg={6} style={{ height: '100%', width: '55%' }}>
                    <div style={{ height: '100%', width: '100%' }}>
                        {plot_container}
                    </div>
                </Col>
                <Col lg={2} style={{ height: '100%', width: '25%' }}>
                    <div className='sspeedProfile'>
                        {corners}
                        {sspeed}
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