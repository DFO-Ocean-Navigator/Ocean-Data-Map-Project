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
import TimeSelect from "./TimeSelect.jsx"
const i18n = require("../i18n.js");

export default class TimeBarContainer extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            datasets: ['global'],
            times: {},
            showLayer: []
        }

        this.setTime = this.setTime.bind(this);
        //this.animate = this.animate.bind(this);
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
        this.props.globalUpdate('timestamps', times)
    }
    
    /*
    // Handles time incrementing and formating
    // calls setTime() as it increments
    animate() {

        // Checks for finest quantum
        //...

        // Loop through times
        if (quantum === 'hour') {
            // find the hourly index to increment by
            let newTimes = {}
            for (dataset in datasets) {
                newTimes.append(times[dataset][0])
            }
            console.warn("NEW TIMES: ", newTimes)

            while (date < endDate) {
                
                this.setTime(newTimes)
                //date
            }
        } else if (quantum === 'day') {

        } else if (quantum === 'monthly') {

        }
        //for (date in difference) {
        //}

        pass
    }
*/

    localUpdate(dataset, startTime, endTime) {
        let times = this.state.times
        times[dataset] = startTime
        
        this.setState({
            times: times
        });
        
        console.warn("TIMES: ", times)
        this.setTime(times);
    }

    toggleLayer(e) {
        console.warn(e.key)
    }

    render() {

        self = this
        let layers = ['global', 'met']
        let timeBars = []
        layers.forEach(function(layer) {
            if (layer in self.state.showLayer) {
                timeBars.push(
                    <div className='timeLayerContainer'>
                        <Button
                            key={layer}
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
                    <div className='timeLayerContainer'>
                        <Button
                            key={layer}
                            className='timeBarToggle'
                            onClick={self.toggleLayer}
                        >{layer.charAt(0).toUpperCase()}</Button>
                    </div>
                )
            }
                
            
        })

        return (
            <div className='time_container'>
                {timeBars}
            </div>
        );
    }
}

//***********************************************************************
TimeBarContainer.propTypes = {
    globalUpdate: PropTypes.func,
};
