import React from 'react';
import PropTypes from "prop-types";
import { Button } from 'react-bootstrap';
import Icon from '../../Icon.jsx';

const stringify = require("fast-stable-stringify");
const i18n = require("../../../i18n.js");

export default class RefLine extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            point: [] // This should be a scatter plot object for plotly
        }
        this.updateLine = this.updateLine.bind(this);
        this.removeLine = this.removeLine.bind(this);
    }

    componentDidMount() {
        /*if (this.props.x !== undefined && this.props.y !== undefined) {
            this.updateLine();
        }*/
    }

    componentDidUpdate(prevProps, prevState) {
        /*if (stringify(prevProps) !== stringify(this.props)) {
            console.warn("Component Did Update")
            this.updateLine();
        }*/
    }

    updateLine() {
        console.warn("UPDATE LINE")
        try {
            let old = this.state.vLine;

            let line_3d = {
                x: [this.props.x, this.props.x],
                y: [this.props.y, this.props.y],
                z: [this.props.mindepth, this.props.maxdepth],
                type: 'scatter3d',
            }

            this.props.updateDataLayer(old, line_3d);
            this.setState({
                vLine: line_3d,
            })
        } catch (err) {

        }
    }

    removeLine() {
        if (this.state.vLine !== undefined) {
            this.props.removeDataLayer(this.state.vLine);
            this.setState({
                vLine: undefined
            })
        }
    }

    render() {

        let removeButton = [];
        let addButtonIcon = ['+', _(" Pin")];
        if (this.state.vLine !== undefined) {
            addButtonIcon = [<Icon icon='undo'/>, _(" Pin")]
            removeButton = <Button
                onClick={this.removeLine}
            >X</Button>
        }

        return (
            <div>
                <Button
                    onClick={this.updateLine}
                >{addButtonIcon}</Button>
                {removeButton}    
            </div>
        )
    }
}

RefLine.propTypes = {
    x: PropTypes.number,
    y: PropTypes.number,
    mindepth: PropTypes.number,
    maxdepth: PropTypes.number,
    updateDataLayer: PropTypes.func,
    removeDataLayer: PropTypes.func,
};