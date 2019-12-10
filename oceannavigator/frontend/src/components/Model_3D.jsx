import React from 'react';
import ComboBox from "./ComboBox.jsx";
import { Panel, Row, Col, Button } from 'react-bootstrap';
import SelectBox from "./SelectBox.jsx";
import Plot from 'react-plotly.js';
import DataLayer from './ModelLayers/DataLayer.jsx';
import BathLayer from './ModelLayers/BathLayer.jsx';
import RefPlane from './ModelLayers/RefPlane.jsx';
import LocationInput from './LocationInput.jsx';


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

        this.urlFromQuery = this.urlFromQuery.bind(this);
        this.addDataLayer = this.addDataLayer.bind(this);
        this.updateDataLayer = this.updateDataLayer.bind(this);
        this.removeDataLayer = this.removeDataLayer.bind(this);
        this.addDataPanel = this.addDataPanel.bind(this);
        this.removeDataPanel = this.removeDataPanel.bind(this);
        this.getLatLon = this.getLatLon.bind(this);
        this.addVerticalLine = this.addVerticalLine.bind(this);
        this.fetchProfile = this.fetchProfile.bind(this);
        this.updatePoint = this.updatePoint.bind(this);
        this.addPointPanel = this.addPointPanel.bind(this);
        this.addPlanePanel = this.addPlanePanel.bind(this);
    }

    componentDidMount() {
        this._mounted = true;
        this.getLatLon(this.state.query);
    }

    componentDidUpdate(prevProps, prevState) {
    }

    /*
        Adds the provided layer to the plot
    */
    addDataLayer(idx, layer) {
        let layers = this.state.layers;
        layers.push(layer);
        idx = layers.indexOf(layer);
        this.setState({
            layers: layers
        })
        return idx;
    }

    /*
        Updates the specified data with the provided data
    */
    updateDataLayer(old, layer) {
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
            }, () => { console.warn("REVISION: ", this.state.revision) })

        } catch (err) {
            console.warn("SOMETHING WENT WRONG")
        }
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
        //data_panels.push(index);
        index = index + 1;

        let layers = jQuery.extend([], this.state.extraLayers);
        layers.unshift(<DataLayer
            index={index}
            key={index}
            value={index}
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
        ></DataLayer>)

        this.setState({
            extraLayers: layers,
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
            layers.splice(idx, 1);
        }

        this.setState({
            data_panels: data_panels,
            layers: layers
        })
    }

    urlFromQuery(header, query, options) {
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
                let corners = [i_1, i_2, i_3, i_4]
                let lat_corners = [i_1[0], i_2[0], i_3[0], i_4[0]];
                let lon_corners = [i_1[1], i_2[1], i_4[1], i_3[1]];

                self.setState({
                    lat: lat,
                    lon: lon,

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

    fetchProfile() {
        let point = this.state.point

        let query = {
            dataset: this.state.query.dataset,
            names: [],
            quantum: this.state.query.quantum,
            showmap: 0,
            station: [[point.x, point.y]],
            time: this.state.query.time,
            type: "sound"
        }

        let url = this.urlFromQuery('/api/v1.0/plot/', query) + '&size=4x7'

        this.setState({
            sspeed: url
        })
    }

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

    /*
    Not Working Yet

    Should add a vertical line to the point that was clicked
    */
    addVerticalLine() {
        try {
            let point = this.state.point
            let old = this.state.vLine;

            let line_3d = {
                x: [point.x, point.x],
                y: [point.y, point.y],
                z: [point.min_depth, point.max_depth],
                type: 'scatter3d',
            }

            this.updateDataLayer(old, line_3d);
            this.setState({
                vLine: line_3d,
            })
        } catch (err) {

        }
    }

    addPointPanel() {
        /*
        let panel = <Panel
            key='point'
            id='point'
            collapsible
            defaultExpanded
            header={_("Point")}
            bsStyle='primary'
        ><LocationInput
                key='point'
                id='point'
                state={}
                title={_("Location")}
                onUpdate={this.onLocalUpdate}
            />
            <Button
                onClick={this.addVerticalLine}
            >+ Pin</Button>
            <Button
                onClick={this.fetchProfile}
            >+ Profile</Button>
        </Panel>*/
    }

    addPlanePanel() {
        let extraLayers = [];
        if (this.state.extraLayers !== undefined) {
            extraLayers = jQuery.extend([], this.state.extraLayers);
        }

        let layer = <RefPlane
            key='refplane'
            addDataLayer={this.addDataLayer}
            updateDataLayer={this.updateDataLayer}
            removeDataLayer={this.removeDataLayer}
            lat_corners={this.state.lat_corners}
            lon_corners={this.state.lon_corners}
        ></RefPlane>

        extraLayers.push(layer);

        this.setState({
            extraLayers: extraLayers
        });

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
        /*let add_point = (
            <Button
                onClick={this.addPointPanel}
            >+ Point</Button>
        )*/

        let add_plane = (
            <Button
                onClick={this.addPlanePanel}
            >+ Plane</Button>
        )

        let point = [];
        if (this.state.point !== undefined) {
            let p = [[this.state.point.x, this.state.point.y]]
            point = <Panel
                key='point'
                id='point'
                collapsible
                defaultExpanded
                header={_("Point")}
                bsStyle='primary'
            ><LocationInput
                    key='point'
                    id='point'
                    state={p}
                    title={_("Location")}
                    onUpdate={this.onLocalUpdate}
                />
                <Button
                    onClick={this.addVerticalLine}
                >+ Pin</Button>
                <Button
                    onClick={this.fetchProfile}
                >+ Profile</Button>
            </Panel>
        }

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

        let layer_options = [add_panel, add_plane, add_point];
        let content = (
            <Row style={{ height: '100%' }}>
                <Col lg={2} style={{ height: '100%', width: '20%' }}>
                    <div style={{width: '100%'}}>{layer_options}</div>
                    <Panel
                        key='layercontainer'
                        id='layercontainer'
                        defaultExpanded
                        bsStyle='primary'
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
                    <div>
                        {point}
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