import React from 'react';
import PropTypes from "prop-types";

const stringify = require("fast-stable-stringify");
const i18n = require("../../../i18n.js");

export default class RefPoint extends React.Component {
    constructor (props) {
        super (props);

        this.state = {
            point: [], // This should be a scatter plot object for plotly
            point_layer: undefined
        }
    }

    componentDidUpdate( prevProps, prevState ) {
        if (stringify(prevProps) !== stringify(this.props)) {
            try {
                let old = this.state.point_layer;
    
                let line_3d = {
                    x: [this.props.x],
                    y: [this.props.y],
                    z: [this.props.depth],
                    type: 'scatter3d',
                }
    
                this.props.updateDataLayer(old, line_3d);
                this.setState({
                    point_layer: line_3d,
                })
            } catch (err) {
    
            }
        }
    }

    render () {
        return null;
    }
}