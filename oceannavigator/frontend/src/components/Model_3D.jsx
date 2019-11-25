import React from 'react';
import ComboBox from "./ComboBox.jsx";
import { Panel, Row, Col, Button } from 'react-bootstrap';
import SelectBox from "./SelectBox.jsx";
import Plot from 'react-plotly.js';
import DataLayer from './ModelLayers/DataLayer.jsx';
import BathLayer from './ModelLayers/BathLayer.jsx';

const stringify = require("fast-stable-stringify");
const i18n = require("../i18n.js");

export default class Model_3D extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            layers: [{
                z: [[1],[1],[1]],
                type: 'surface'
            }],
            data_panels: [],
            index: 0
        }

        this.urlFromQuery = this.urlFromQuery.bind(this);
        this.addDataLayer = this.addDataLayer.bind(this);
        this.updateDataLayer = this.updateDataLayer.bind(this);
        this.removeDataLayer = this.removeDataLayer.bind(this);
        this.addDataPanel = this.addDataPanel.bind(this);
        this.removeDataPanel = this.removeDataPanel.bind(this);
    }

    componentDidMount() {
        this._mounted = true;
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
    updateDataLayer(idx, layer) {
        console.warn('updateDataLayer');
        let layers = this.state.layers;
        layers[idx] = layer;
        console.warn("LAYERS: ", layers)
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
        data_panels.push(this.state.index);
        let index = this.state.index;
        index = index + 1;

        this.setState({
            data_panels: data_panels,
            index: index
        })
    }

    removeDataPanel(index) {
        let data_panels = this.state.data_panels;
        let idx = data_panels.indexOf(index);
        data_panels.splice(idx, 1);
        this.setState({
            data_panels: data_panels
        })
    }
    
    urlFromQuery(header, query) {
        return header + "?query=" + encodeURIComponent(stringify(query));
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
            ></BathLayer>
        )
        for (let idx in this.state.data_panels) {
            layers.push(
                <DataLayer
                    index={idx}
                    key={idx}
                    value={idx}
                    urlFromQuery={this.urlFromQuery}
                    addDataLayer={this.addDataLayer}
                    removeDataLayer={this.removeDataLayer}
                    area={this.props.area}
                    interp={this.props.interp}
                    neighbours={this.props.neighbours}
                    projection={this.props.projection}
                    radius={this.props.radius}
                    time={this.props.time}
                    removeDataPanel={this.removeDataPanel}
                ></DataLayer>
            )
        }

        let add_panel = (
            <Button
                onClick={this.addDataPanel}
            ></Button>
        )

        let plot_container = (
            <Plot style={{height: '100%'}}
                data={this.state.layers}
            ></Plot>
        )
        
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