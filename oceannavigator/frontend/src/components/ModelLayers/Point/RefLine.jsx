import React from 'react';
import PropTypes from "prop-types";

export default class RefLine extends React.Component {
    constructor (props) {
        super (props);

        this.state = {
            point: [] // This should be a scatter plot object for plotly
        }
    }

    componentDidUpdate( prevProps, prevState ) {
        if (stringify(prevProps) !== stringify(this.props)) {
            try {
                let old = this.state.vLine;
    
                let line_3d = {
                    x: [this.props.x, this.props.x],
                    y: [this.props.y, this.props.y],
                    z: [this.props.min_depth, this.props.max_depth],
                    type: 'scatter3d',
                }
    
                this.props.updateDataLayer(old, line_3d);
                this.setState({
                    vLine: line_3d,
                })
            } catch (err) {
    
            }
        }
    }

    render () {
        return null;
    }
}