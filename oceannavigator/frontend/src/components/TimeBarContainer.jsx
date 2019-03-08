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

// IMPORT ICONS
import Ice_Icon from '../images/ice_symbol.png';
import Met_Icon from '../images/cloud_symbol.png';
import Ocean_Icon from '../images/ocean_symbol.png'
import Wave_Icon from '../images/waves_symbol.png'
import Iceberg_Icon from '../images/iceberg_symbol.png'


const i18n = require("../i18n.js");

export default class TimeBarContainer extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            times: {},
            endTimes: {},
            startTimes: {},
            showLayer: ['global'],
            animating: false,
            end: false,
            icons: {
                'ocean': <img src={Ocean_Icon} alt="Ocean" className='timeIcon'></img>,
                'met': <img src={Met_Icon} alt="Met" className='timeIcon'></img>,
                'ice': <img src={Ice_Icon} alt="Ice" className='timeIcon'></img>,
                'wave': <img src={Wave_Icon} alt="Waves" className='timeIcon'></img>,
                'iceberg': <img src={Iceberg_Icon} alt="IceBerg" className='timeIcon'></img>,
            }
        }

        this.setTime = this.setTime.bind(this);
        this.animate = this.animate.bind(this);
        this.localUpdate = this.localUpdate.bind(this);
        this.toggleLayer = this.toggleLayer.bind(this);
        this.pause = this.pause.bind(this);
        this.animateConsecutive = this.animateConsecutive.bind(this);
        this.findMax = this.findMax.bind(this);
        this.findMin = this.findMin.bind(this);
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
        let newTimes = jQuery.extend({}, times)
        this.props.globalUpdate('timestamps', newTimes)
    }
    
    pause() {
        this.setState({
            animating: false,
        })
    }

    animate() {
        let min = new Date(this.findMin(this.state.startTimes))
        let max = this.findMax(this.state.endTimes)
        
        console.warn("MAX:MIN - ", max, ':', min)

        this.animateConsecutive(min, max);
    }

    // Handles time incrementing and formating
    // calls setTime() as it increments
    animateConcurrent() {
        
        if (this.state.pause === true) {
            this.setState({
                end: true,
                animating: false
            })
            return
        } else if (this.state.animating === false) {
            this.setState({
                animating: true
            })
        }
        if (this.state.end || this.state.times['global'].getUTCDate() === this.state.endTimes['global'].getUTCDate()) {
            
            this.setState({
                times: this.state.startTimes,
            })
            return
        }
        let times = this.state.times;
        for (let dataset in this.state.times) {
                let time = new Date(times[dataset])
                time.setHours(time.getUTCHours() + 3)
                times[dataset] = time
        }
        this.setTime(times);
        
        setTimeout(this.animate, 2000/4);
        return
    }

    animateConsecutive(min, max) {
        
        if (min.getTime() >= max.getTime()) {
            this.setState({
                times: this.state.startTimes,
            })
            return;
        }
        console.warn("START TIME: ", this.state.startTimes)
        
        let in_range = false;
        console.warn("START TIMES 2: ", this.state.startTimes)
        let times = jQuery.extend({}, this.state.times)
        for (let dataset in times) {
            times[dataset] = new Date(times[dataset])
        }
        console.warn("TIMES AFTER JQUERY: ", times)
        for (let dataset in times) {
            console.warn("DATASET: ", dataset)
            if ((min.getTime() > this.state.startTimes[dataset].getTime() || min.getTime() === this.state.startTimes[dataset].getTime()) && min.getTime() < this.state.endTimes[dataset].getTime()) {
                console.warn("INCREMENTING TIME")
                
                times[dataset].setUTCDate(times[dataset].getUTCDate() + 1)
                in_range = true
            }
        }
        console.warn("START TIMES 3: ", this.state.startTimes)
        this.setState({
            times: times,
        })
        this.setTime(times);

        if (in_range === false) {
            let new_times = {}
            for (let dataset in times) {
                if (this.state.endTimes[dataset].getTime() > min.getTime()) {
                    new_times[dataset] = new Date(times[dataset])
                }
                min = this.findMin(new_times);
            }
        } else {
            min.setHours(min.getUTCHours() + 24)
        }
        console.warn("START TIMES 4: ", this.state.startTimes)
        setTimeout(() => {this.animateConsecutive(new Date(min),max)}, 4000)
        
        return
        
    }

    hoursBetween( date1, date2 ) {
        //Get 1 hour in milliseconds
        let one_day=1000*60*60;
        
        // Convert both dates to milliseconds
        let date1_ms = date1.getTime();
        let date2_ms = date2.getTime();
        
        // Calculate the difference in milliseconds
        let difference_ms = date2_ms - date1_ms;

        // Convert back to days and return
        return Math.round(difference_ms/one_day); 
    }

    findMax(times) {
        console.warn("MAX: ", times)
        let largest = undefined;

        for (let dataset in times) {
            let time = new Date(times[dataset]);
            console.warn("TIME: ", time.getTime())
            if (largest != undefined) {
                console.warn("LARGEST: ", largest.getTime())
            }
            if (largest === undefined) {
                largest = time;
                console.warn("UNDEFINED : ", largest)
            } 
            let time_sec = time.getTime()
            let largest_sec = largest.getTime()
            if (time_sec > largest_sec) {
                largest = time;
                console.warn("DEFINED: ", largest)
            }
        }
        return new Date(largest);
    }

    findMin(times) {
        console.warn("MIN: ", times)
        let smallest = undefined;
        console.warn(smallest);
        for (let dataset in times) {
            let time = new Date(times[dataset])
            if (smallest === undefined) {
                smallest = time;
            } else if (time.getTime() < smallest.getTime()) {
                smallest = time;
            }
        }
        
        return new Date(smallest);
    }


    localUpdate(id, startTime, endTime) {
        console.warn('LOCAL UPDATE')
        console.warn("ID: ", id)
        console.warn("START TIME: ", startTime)
        console.warn("END TIME: ", endTime)
        let startTimes = this.state.startTimes;
        startTimes[id] = startTime;
        let endTimes = this.state.endTimes;
        endTimes[id] = endTime;

        this.setState({
            times: jQuery.extend({}, startTimes),
            startTimes: startTimes,
            endTimes: endTimes,
        });
        this.setTime(startTimes);
    }

    toggleLayer(e) {
        console.warn("E: ", e.target.id)
        
        for (let idx in this.state.showLayer) {
            
            console.warn("SHOWLAYER: ", this.state.showLayer)
            if (this.state.showLayer[idx] === e.target.id) {
                console.warn('REMOVING FROM SHOW LAYER')
                let newShowLayer = this.state.showLayer
                newShowLayer.splice(idx, 1)
                this.setState({
                    showLayer: newShowLayer
                })
                return
            }
        }
        console.warn("ADDING TO SHOW LAYER")
        let newShowLayer = this.state.showLayer;
        newShowLayer.push(e.target.id);
        this.setState({
            showLayer: newShowLayer
        })
        return
    }

    render() {

        self = this
        let layers = this.props.timeSources
        //layers = {'global': ['all']}
        let timeBars = []
        
        for (let layer in layers) {
            //if (self.state.showLayer.includes(layer)) {
                console.warn(this.props.timeSources)
                let new_layer = this.props.timeSources[layer]//new Set(this.props.timeSources[layer])
                console.warn("LAYER SET: ", new_layer)
                for (let idx in new_layer) {
                    for (let i = 1; i <= new_layer[idx].frequency; i = i + 1) {
                        console.warn("DATASET: ", dataset)
                        let dataset = this.props.timeSources[layer][idx]
                        console.warn("DATASET: ", dataset)
                        console.warn("I :" ,i)
                        console.warn("BUTTON ID: ", layer + idx + i + '_button')
                        console.warn("BAR ID: ", layer + idx + i)
                        timeBars.push(
                            <div key={layer + idx + i} className='timeLayerContainer'>
                                <Button
                                    id={layer + idx + i}
                                    key={layer + idx + i.toString() + '_button'}
                                    className='timeBarToggle'
                                    onClick={self.toggleLayer}
                                >{this.state.icons[layer]}</Button>
                                <TimeSelect
                                    show={self.state.showLayer.includes(layer + idx + i)}
                                    key={layer + idx + i.toString()}
                                    id={layer + idx + i}
                                    idx={i}
                                    name={layer}
                                    dataset={idx}
                                    currentTime={this.state.times[layer + idx + i]}
                                    localUpdate={self.localUpdate}
                                ></TimeSelect>
                            </div>
                        )
                    }
                }
                
                /*
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
            */
        }

        timeBars.push(
            <div key='start_animation' className='timeLayerContainer'>
                <Button
                    onClick={() => {
                        if (this.state.animating) {
                            this.pause()
                        } else {
                            this.animate()
                        }
                    }}
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
    timeSources: PropTypes.object,
};
