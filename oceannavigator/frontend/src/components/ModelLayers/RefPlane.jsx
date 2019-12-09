import React from 'react';
import ComboBox from "../ComboBox.jsx";
import { Panel, Row, Col, Button } from 'react-bootstrap';
import SelectBox from "../SelectBox.jsx";

const stringify = require("fast-stable-stringify");
const i18n = require("../../i18n.js");

export default class RefPlane extends React.Component {
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
            surface: undefined,
            depth: 0
        }

        this.removePanel = this.removePanel.bind(this);
        this.updateDepth = this.updateDepth.bind(this);
    }

    componentDidMount() {
        this._mounted = true
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.state.depth !== prevState.depth) {
            while (this.surface_lock) {}
            this.surface_lock = true;

            let old = this.state.surface;
            let layer = this.state.surface;
            let depth = this.state.depth;
            if (old === undefined) {
                layer = {
                    z: [depth, depth, depth, depth],
                    type: 'surface',
                }
            } else {
                layer = jQuery.extend({}, layer);
                if (this.props.lat_corners !== undefined && this.props.lon_corners !== undefined) {
                    layer.y = this.props.lat_corners
                    layer.x = this.props.lon_corners
                }
                layer.z = [depth, depth, depth, depth]
            }
            
            
            this.setState({
                surface: layer
            }, () => this.surface_lock = false)
            this.props.updateDataLayer(old, layer)
        }
    }

    removePanel() {
        this.props.removeDataPanel(this.props.id, this.state.surface);
    }

    updateDepth(e) {
        this.setState({
            depth: e.target.value
        })
    }

    render() {

        // Initialize each component
        let data_selection_panel = null;
        const remove_panel = (
            <Button
                className='panelRemove'
                onClick={this.removePanel}
            >X</Button>
        )
        
        const select_depth = (
            <input
                onChange={this.updateDepth}
                className='depth'
                id={'depth'}
                value={this.state.depth}
                placeholder={'depth'}
            ></input>
        )

        const toggle_apply = (
            <Button
                onClick={this.loadNextPlot}
            >Apply</Button>
        )
        // Add the components to an array in the correct order
        let data_selection = [select_depth];
        // Create Panel with Panel Elements
        data_selection_panel = <Panel
            key='right_map'
            id='right_map'
            collapsible
            defaultExpanded
            header={<div>{_("Reference Plane")}{remove_panel}</div>}
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