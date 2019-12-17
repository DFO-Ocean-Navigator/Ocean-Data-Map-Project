import React from 'react';
import { Panel, Button } from 'react-bootstrap';
import PropTypes from 'prop-types';
import RefPoint from "./RefPoint.jsx";
import RefLine from "./RefLine.jsx";
import LocationInput from "../../LocationInput.jsx";
import NumericInput from "react-numeric-input";

const stringify = require("fast-stable-stringify");
const i18n = require("../../../i18n.js");

export default class PointContainer extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            point: undefined,
            panel: null,
            depth: 0,
        }

        this.addData = this.addData.bind(this);
        this.RefPoint = this.RefPoint.bind(this);
        this.RefLine = this.RefLine.bind(this);
        this.onLocalUpdate = this.onLocalUpdate.bind(this);
    }

    componentDidMount() {
        this.setState({
            point: this.props.point,
        })
    }
    componentDidUpdate(prevProps, prevState) {
        if (prevProps.point !== this.props.point) {
            this.setState({
                point: this.props.point,
            })
        }
    }

    addData(data) {
        this.setState({
            data: data
        })
    }

    RefPoint() {
        let panel = <RefPoint
            x={this.state.point.x}
            y={this.state.point.y}
            depth={this.state.depth}
            updateDataLayer={this.props.updateDataLayer}
            removeDataLayer={this.props.removeDataLayer}
        ></RefPoint>
        this.setState({
            panel: panel
        })
    }

    RefLine() {
        let panel = <RefLine
            x={this.state.point.x}
            y={this.state.point.y}
            mindepth={this.state.point.min_depth}
            maxdepth={this.state.point.max_depth}
            updateDataLayer={this.props.updateDataLayer}
            removeDataLayer={this.props.removeDataLayer}
        ></RefLine>
        this.setState({
            panel: panel
        })
    }

    onLocalUpdate(key, value) {
        console.warn("KEY: ", key);
        console.warn("VALUE: ", value);
        if (key === 'point') {
            let point = this.state.point;
            if (point === undefined) {
                point = {
                    x: value[0][0],
                    y: value[0][1],
                }
            } else {
                point.x = value[0][0];
                point.y = value[0][1];
            }
            value = point;
        }
        this.setState({
            [key]: value
        });
    }

    render() {

        let layers = this.state.data;

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
            >
                <LocationInput
                    key='point'
                    id='point'
                    state={[[this.state.point.x, this.state.point.y]]}
                    title={_("Location")}
                    onUpdate={this.onLocalUpdate}
                />
                <h1>
                    {_("Depth: ")}
                </h1>
                <NumericInput
                    value={this.state.depth}
                    precision={0}
                    step={0.01}
                    onChange={(n, s) => this.onLocalUpdate("depth", n)}
                    id={'depth'}
                />
                <RefLine
                    x={this.state.point.x}
                    y={this.state.point.y}
                    mindepth={this.state.point.min_depth}
                    maxdepth={this.state.point.max_depth}
                    updateDataLayer={this.props.updateDataLayer}
                    removeDataLayer={this.props.removeDataLayer}
                ></RefLine>
                <RefPoint
                    x={this.state.point.x}
                    y={this.state.point.y}
                    depth={this.state.depth}
                    updateDataLayer={this.props.updateDataLayer}
                    removeDataLayer={this.props.removeDataLayer}
                ></RefPoint>
                
                <Button
                    onClick={() => this.props.fetchProfile(this.state.point)}
                >+ Profile</Button>
            </Panel>
        }

        return (
            <div>
                {point}
                {layers}
                {this.state.panel}
            </div>
        );
    }
}

// ******************************************************************************

PointContainer.propTypes = {
    updateDataLayer: PropTypes.func,
    removeDataLayer: PropTypes.func,
    fetchProfile: PropTypes.func,
    point: PropTypes.object
};
