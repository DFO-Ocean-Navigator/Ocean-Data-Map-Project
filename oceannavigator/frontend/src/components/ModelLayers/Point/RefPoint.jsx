import React from 'react';
import PropTypes from "prop-types";
import { Button } from 'react-bootstrap';
import Icon from '../../Icon.jsx';

const stringify = require("fast-stable-stringify");
const i18n = require("../../../i18n.js");

export default class RefPoint extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            point: [], // This should be a scatter plot object for plotly
            point_layer: undefined
        }

        this.updatePoint = this.updatePoint.bind(this);
        this.removePoint = this.removePoint.bind(this);
    }

    componentDidUpdate(prevProps, prevState) {
        /*if (stringify(prevProps) !== stringify(this.props)) {
            this.updatePoint();    
        }*/
    }

    updatePoint() {
        console.warn("UPDATE POINT")
        try {
            let old = this.state.point_layer;

            let line_3d = {
                x: [this.props.x],
                y: [this.props.y],
                z: [this.props.depth],
                type: 'scatter3d',
            }
            console.warn("CALLING UPDATEDATALAYER()")
            this.props.updateDataLayer(old, line_3d);
            this.setState({
                point_layer: line_3d,
            })
        } catch (err) {

        }
    }

    removePoint() {
        if (this.state.point_layer !== undefined) {
            this.props.removeDataLayer(this.state.point_layer)
            this.setState({
                point_layer: undefined
            })
        }
    }

    render() {

        let removeButton = []
        let addButtonIcon = '+';
        if (this.state.point_layer !== undefined) {
            addButtonIcon = <Icon icon='undo'/>
            removeButton = <Button
                onClick={this.removePoint}
            >X</Button>
        }
        return (
            <div>
                <Button
                    onClick={this.updatePoint}
                >{addButtonIcon}{_(" Point")}</Button>
                {removeButton}
            </div>
        );
    }
}

RefPoint.propTypes = {
    x: PropTypes.number,
    y: PropTypes.number,
    depth: PropTypes.number,
    updateDataLayer: PropTypes.func,
    removeDataLayer: PropTypes.func,
};