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
import moment from "moment-timezone";
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
        let min = this.findMin(this.state.startTimes)
        let max = this.findMax(this.state.endTimes)

        this.animateConsecutive(min, max);
    }

    // Handles time incrementing and formating
    // calls setTime() as it increments
    // THIS NEEDS TO BE CONVERTED FROM DATE TO MOMENT
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
            time.setUTCDate(time.getUTCDate() + 1)
            //time.setUTCHours(time.getUTCHours() + 24)
            times[dataset] = time
        }
        this.setTime(times);

        setTimeout(this.animate, 1000);
        return
    }

    animateConsecutive(min, max, quantum) {
        
        let increment = 1440    // Default to quantum = day
        if (quantum === undefined) {
            quantum = this.findQuantum(this.props.timeSources)
        } else if (quantum === 'month') {
            increment = 525600  // Time increment in minutes
        } else if (quantum === 'day') {
            increment = 1440    // Time increment in minutes
        } else if (quantum === 'hour') {
            increment = 720     // Time increment in minutes
        } else if (quantum === 'min') {
            increment = 5       // Time increment in minutes
        }
        
        if (min.valueOf() >= max.valueOf()) {
            this.setState({
                animating: false,
                times: this.state.startTimes,
            })
            return;
        }

        let in_range = false;
        // Deep copy times object
        let times = jQuery.extend({}, this.state.times)
        
        for (let dataset in times) {
            times[dataset] = moment(times[dataset])
        }
        for (let dataset in times) {
            if ((min.valueOf() > this.state.startTimes[dataset].valueOf() || min.valueOf() === this.state.startTimes[dataset].valueOf()) && min.valueOf() < this.state.endTimes[dataset].valueOf()) {
                times[dataset].add('minute', increment)
                in_range = true
            }
        }
        this.setState({
            times: times,
        })
        this.setTime(times);

        if (in_range === false) {
            let new_times = {}
            for (let dataset in times) {
                if (this.state.endTimes[dataset].valueOf() > min.valueOf()) {
                    new_times[dataset] = moment(times[dataset])
                }
                min = this.findMin(new_times);
            }
        } else {
            min.add('hour', 25)
            //min.setUTCHours(min.getUTCHours() + 24)
        }

        setTimeout(() => { this.animateConsecutive(moment.tz(min, 'GMT'), max, quantum) }, 4000)

        return

    }

    findQuantum(sources) {
        let quantums = ['month', 'day', 'hour', 'minute']
        let quantum = ''
        for (let layer in sources) {
            for (let dataset in sources[layer]) {
                if (quantum === undefined) {
                    quantum === sources[layer][dataset].quantum
                } else if (quantums.indexOf(sources[layer][dataset].quantum) > quantums.indexOf([quantum])) {
                    quantum = sources[layer][dataset].quantum;
                }
            }
        }
        return quantum
    }

    hoursBetween(date1, date2) {
        //Get 1 hour in milliseconds
        let one_day = 1000 * 60 * 60;

        // Convert both dates to milliseconds
        let date1_ms = date1.valueOf();
        let date2_ms = date2.valueOf();

        // Calculate the difference in milliseconds
        let difference_ms = date2_ms - date1_ms;

        // Convert back to days and return
        return Math.round(difference_ms / one_day);
    }

    findMax(times) {
        let largest = undefined;

        for (let dataset in times) {
            let time = moment.tz(times[dataset], "GMT");
            if (largest === undefined) {
                largest = time;
            }
            let time_sec = time.valueOf()
            let largest_sec = largest.valueOf()
            if (time_sec > largest_sec) {
                largest = time;
            }
        }
        return moment.tz(largest, 'GMT');
    }

    findMin(times) {
        let smallest = undefined;
        for (let dataset in times) {
            let time = moment.tz(times[dataset], 'GMT')
            if (smallest === undefined) {
                smallest = time;
            } else if (time.valueOf() < smallest.valueOf()) {
                smallest = time;
            }
        }

        return moment(smallest, 'GMT');
    }


    localUpdate(id, startTime, endTime) {
        
        // This is updating to local time, therefore must get local time from object
        //startTime = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate(), startTime.getHours(), startTime.getMinutes())
        //endTime = new Date(endTime.getFullYear(), endTime.getMonth(), endTime.getDate(), endTime.getHours(), endTime.getMinutes())
        
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
        let sources = this.props.timeSources
        //layers = {'global': ['all']}
        let timeBars = []
        let quantums = []
        for (let map in sources) {
            for (let layer in sources[map]) {
                //if (self.state.showLayer.includes(layer)) {
                let new_layer = sources[map][layer]//new Set(this.props.timeSources[layer])
                for (let idx in new_layer) {
                    for (let dataset in new_layer[idx]) {
                        for (let variable in new_layer[idx][dataset]) {

                            quantums.push(new_layer[idx][dataset][variable].quantum)
                            timeBars.push(
                                <div key={map + layer + idx + dataset + variable} className='timeLayerContainer'>
                                    <Button
                                        id={map + layer + idx + dataset + variable}
                                        key={map + layer + idx + dataset + variable + '_button'}
                                        className='timeBarToggle'
                                        onClick={self.toggleLayer}
                                    >{this.state.icons[layer]}</Button>
                                    <TimeSelect
                                        show={self.state.showLayer.includes(map + layer + idx + dataset + variable)}
                                        key={map + layer + idx + dataset + variable}
                                        id={map + layer + idx + dataset + variable}
                                        idx={idx}
                                        name={layer}
                                        dataset={dataset}
                                        quantum={new_layer[idx][dataset][variable].quantum}
                                        currentTime={this.state.times[map + layer + idx + dataset + variable]}
                                        localUpdate={self.localUpdate}
                                    ></TimeSelect>
                                </div>)
                        }
                    }
                }

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

        /*
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
        */
        let time_class
        if (this.props.compare) {
            time_class = 'time_container_compare'
        } else {
            time_class = 'time_container'
        }


        return (
            <div className={time_class}>
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
