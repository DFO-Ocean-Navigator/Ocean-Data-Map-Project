import React from 'react';
import { Panel, Button} from 'react-bootstrap';
import PropTypes from 'prop-types';
import RefPoint from "./RefPoint.jsx";
import RefLine from "./RefLine.jsx";
import LocationInput from "../../LocationInput.jsx";
export default class PointContainer extends React.Component {
    constructor (props) {
        super (props);

        this.state = {
            point: [],
            panel: null,
        }

        this.addData = this.addData.bind(this);
        this.RefPoint = this.RefPoint.bind(this);
        this.RefLine = this.RefLine.bind(this);
        this.onLocalUpdate = this.onLocalUpdate.bind(this);
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.point !== this.props.point) {
            this.setState({
                point: this.props.point,
            })
        }
    }

    addData (data) {
        this.setState({
            data: data
        })
    }

    RefPoint () {
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

    RefLine () {
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
        this.setState({
            [key]: value
        });
    }

    render () {

        let layers = this.state.data;

        let point = [];
        if (this.state.point.length !== 0) {
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
                    state={this.state.point}
                    title={_("Location")}
                    onUpdate={this.onLocalUpdate}
                />
                <Button
                    onClick={this.RefLine}
                >+ Pin</Button>
                <Button
                    onClick={this.RefPoint}
                >+ Point</Button>
                <Button
                    onClick={() => this.props.fetchProfile(this.state.point)}
                >+ Profile</Button>
            </Panel>
        }
        
        return (
            <div>
                {point}
                {layers}
            </div>
        );
    }
}

// ******************************************************************************

PointContainer.propTypes = {
    generatePermLink: PropTypes.func,
    dataset: PropTypes.string,
    class4id: PropTypes.array,
    init: PropTypes.object,
    action: PropTypes.func,
  };
  