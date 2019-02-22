import React from "react";
import ComboBox from "./ComboBox.jsx";
import Range from "./Range.jsx";
import SelectBox from "./SelectBox.jsx";
import IceDatasetSelector from "./IceDatasetSelector.jsx";
import { Panel, Button, Row, Col, Tabs, Tab } from "react-bootstrap";
import Icon from "./Icon.jsx";
import Options from "./Options.jsx";
import PropTypes from "prop-types";
import DisplayType from "./DisplayType.jsx";
import ol from "openlayers";
import ReactSimpleRange from "react-simple-range";
import IceComboBox from "./IceComboBox.jsx";
import TimeSelect from "./TimeSelect.jsx";
const i18n = require("../i18n.js");

export default class TimeBarContainer extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            datasets: ['global'],
            times: {},
            endTimes: {},
            startTimes: {},
            showLayer: ['global'],
            end: false,
        }

        this.setTime = this.setTime.bind(this);
        this.animate = this.animate.bind(this);
        this.localUpdate = this.localUpdate.bind(this);
        this.toggleLayer = this.toggleLayer.bind(this);
    }

    // Sends time back to the OceanNavigator component
    // Formatted as dataset: time in dict()
    // global is for layers synced to the global time
    //expects the correctly formatted times object:
    // {
    //  global: timestamp,    
    //  dataset: timestamp,
    //  dataset: timestamp
    //}
    
    setTime(times) {
        console.warn("SETTING TIME: ", times)
        let newTimes = jQuery.extend({}, times)
        this.props.globalUpdate('timestamps', newTimes)
    }
    
    
    // Handles time incrementing and formating
    // calls setTime() as it increments
    animate() {
        if (this.state.end || this.state.times['global'].getDate() === this.state.endTimes['global'].getDate()) {
            this.setState({
                times: this.state.startTimes,
            })
            return
        }
        let times = this.state.times;
        for (let dataset in this.state.times) {
                let time = times[dataset]
                console.warn(time)
                time.setDate(time.getDate() + 1)
                times[dataset] = time
        }
        this.setTime(times);
        
        setTimeout(this.animate, 10000);
        console.warn('calling animate again')
        
        return
    }


    localUpdate(dataset, startTime, endTime) {
        let startTimes = this.state.startTimes
        startTimes[dataset] = startTime
        let endTimes = this.state.endTimes
        endTimes[dataset] = endTime
        this.setState({
            times: startTimes,
            startTimes: startTimes,
            endTimes: endTimes,
        });
        this.setTime(startTimes);
    }

    toggleLayer(e) {
        console.warn(e.target.id)

        for (let idx in this.state.showLayer) {
            if (this.state.showLayer[idx] === e.target.id) {
                let newShowLayer = this.state.showLayer
                newShowLayer.splice(idx, 1)
                this.setState({
                    showLayer: newShowLayer
                })
                return
            }
        }
        let newShowLayer = this.state.showLayer;
        newShowLayer.push(e.target.id);
        this.setState({
            showLayer: newShowLayer
        })
        return
    }

    render() {

        self = this
        let layers = ['global', 'met']
        let timeBars = []
        
        
        layers.forEach(function(layer) {
            if (self.state.showLayer.includes(layer)) {
                timeBars.push(
                    <div key={layer} className='timeLayerContainer'>
                        <Button
                            id={layer}
                            key={layer + '_button'}
                            className='timeBarToggle'
                            onClick={self.toggleLayer}
                        >{layer.charAt(0).toUpperCase()}</Button>
                        <TimeSelect
                            key={layer}
                            localUpdate={self.localUpdate}
                        ></TimeSelect>
                    </div>
                )
            } else {
                timeBars.push(
                    <div key={layer} className='timeLayerContainer'>
                        <Button
                            id={layer}
                            key={layer + '_button'}
                            className='timeBarToggle'
                            onClick={self.toggleLayer}
                        >{layer.charAt(0).toUpperCase()}</Button>
                    </div>
                )
            }
        })
        timeBars.push(
            <div key='start_animation' className='timeLayerContainer'>
                <Button
                    onClick={this.animate}
                    className='timeBarToggle'
                >
                    <Icon icon='play'></Icon>
                </Button>
            </div>
        )

        return (
            <div className='time_container'>
                {timeBars.reverse()}
            </div>
        );
    }
}

//***********************************************************************
TimeBarContainer.propTypes = {
    globalUpdate: PropTypes.func,
};
