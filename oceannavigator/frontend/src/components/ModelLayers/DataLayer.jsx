import React from 'react';
import ComboBox from "../ComboBox.jsx";
import { Panel, Row, Col, Button } from 'react-bootstrap';
import SelectBox from "../SelectBox.jsx";

const stringify = require("fast-stable-stringify");
const i18n = require("../../i18n.js");

export default class DataLayer extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
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
            surface: undefined
        }

        this.updateVariables = this.updateVariables.bind(this);
        this.updateDataset = this.updateDataset.bind(this);
        this.loadNextPlot = this.loadNextPlot.bind(this);
        this.removePanel = this.removePanel.bind(this);
    }

    componentDidMount() {
        this._mounted = true

        if (this.props.lat !== undefined && this.props.lon !== undefined) {
            while (this.surface_lock) {}
            this.surface_lock = true;
            
            let old = this.state.surface;
            let layer = this.state.surface;
            if (old === undefined) {
                console.warn("CREATING SURFACE (DATA)")
                layer = {
                    z: [],
                    type: 'surface',
                    colorscale: 'Earth',
                }
            }
            layer = jQuery.extend({}, layer);
            layer.x = this.props.lon;
            layer.y = this.props.lat;
            
            this.setState({
                surface: layer
            }, () => this.surface_lock = false)
            this.props.updateDataLayer(old, layer);
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.lat !== this.props.lat || prevProps.lon !== this.props.lon) {
            while (this.surface_lock) {}
            this.surface_lock = true;

            let old = this.state.surface;
            let layer = this.state.surface;
            if (old === undefined) {
                layer = {
                    z: [],
                    type: 'surface'
                }
            }
            layer = jQuery.extend({}, layer);
            layer.y = this.props.lat
            layer.x = this.props.lon    
            
            this.setState({
                surface: layer
            }, () => this.surface_lock = false)
            this.props.updateDataLayer(old, layer)
        }
    }

    updateVariables(key, values) {
        let query = this.state.query;
        if (key === 'variable') {
            query.variable = values
        } else if (key === 'variable_scale') {
            //  WIll have to deal with this in Surface Object
        }
        this.setState({
            query: query
        })
    }

    updateDataset(key, value) {
        let query = this.state.query;
        console.warn("UPDATE DATASET");
        console.warn("KEY: ", key);
        console.warn("VALUE: ", value);
        if (key === 'variable') {
            query.dataset = value;
    
            
        } else if (key === 'variable_scale') {
            // Will have to deal with this in Surface Object
        }
        this.setState({
            query: query
        })
    }

    loadNextPlot() {
        let url = this.props.urlFromQuery('/api/v1.0/data/area/', this.state.query)
        self = this
        $.ajax({
            type: 'GET',
            dataType: 'json',
            url: url,
            success: function (result) {
                while (this.surface_lock) {}
                this.surface_lock = true;
                let old = self.state.surface;
                let layer = self.state.surface;
                if (old === undefined) {
                    layer = {
                        z: [],
                        type: 'surface'
                    }
                }
                layer = jQuery.extend({}, layer);
                layer.z = result;
                self.setState({
                    data: result,
                    surface: layer
                }, () => this.surface_lock = false)
                self.props.updateDataLayer(old, layer)
            }
        })
    }

    removePanel() {
        this.props.removeDataPanel(this.props.id, this.state.surface);
    }


    render() {

        // Initialize each component
        let data_selection_panel = null;
        console.warn("MOUNTED")
        const remove_panel = (
            <Button
                className='panelRemove'
                onClick={this.removePanel}
            >X</Button>
        )
        const select_dataset = (
            <ComboBox
                key='dataset'
                id='dataset'
                state={this.state.query.dataset}
                def=''
                url='/api/v1.0/datasets/'
                title={_("Dataset")}
                onUpdate={this.updateDataset}
            />
        )
        const select_variable = (
            <ComboBox
                id='variable'
                key='variable'
                multiple={false}
                state={this.state.query.variable}
                def={"defaults.dataset"}
                onUpdate={this.updateVariables}
                url={"/api/v1.0/variables/?vectors&dataset=" + this.state.query.dataset
                }
                title={_("Variables")}
            />
        )
        const toggle_apply = (
            <Button
                onClick={this.loadNextPlot}
            >Apply</Button>
        )
        // Add the components to an array in the correct order
        let data_selection = [select_dataset, select_variable, toggle_apply];
        // Create Panel with Panel Elements
        data_selection_panel = <Panel
            key='right_map'
            id='right_map'
            collapsible
            defaultExpanded
            header={<div>{_("Surface")}{remove_panel}</div>}
            bsStyle='primary'
        >
            {data_selection}
        </Panel>
        
        return (
            <div>
                {data_selection_panel}
            </div>
        )
        
    }
}