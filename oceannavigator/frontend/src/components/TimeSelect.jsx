import React from "react";
import ComboBox from "./ComboBox.jsx";
import Range from "./Range.jsx";
import SelectBox from "./SelectBox.jsx";
import moment from "moment-timezone";
import momentcl from 'moment';
import IceDatasetSelector from "./IceDatasetSelector.jsx";
import { Panel, Button, Row, Col, Tabs, Tab, ProgressBar } from "react-bootstrap";
import Icon from "./Icon.jsx";
import Options from "./Options.jsx";
import PropTypes from "prop-types";
import DisplayType from "./DisplayType.jsx";
import ol from "openlayers";
import ReactSimpleRange from "react-simple-range";
import IceComboBox from "./IceComboBox.jsx";
import { type } from "os";
import Rectangle from 'react-rectangle';
import Timeline from './Timeline.jsx';

const i18n = require("../i18n.js");

export default class TimeSelect extends React.Component {
    constructor(props) {
        super(props);


        let day_map = {
            0: 'Sun',
            1: 'Mon',
            2: 'Tue',
            3: 'Wed',
            4: 'Thu',
            5: 'Fri',
            6: 'Sat',
        }
        let months_map = {
            1: 'Jan',
            2: 'Feb',
            3: 'Mar',
            4: 'Apr',
            5: 'May',
            6: 'Jun',
            7: 'Jul',
            8: 'Aug',
            9: 'Sep',
            10: 'Oct',
            11: 'Nov',
            12: 'Dec',
        }
        this.state = {
            times_available: {},
            years: [2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019],
            months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            month_tonum: {
                'Jan': 1,
                'Feb': 2,
                'Mar': 3,
                'Apr': 4,
                'May': 5,
                'Jun': 6,
                'Jul': 7,
                'Aug': 8,
                'Sep': 9,
                'Oct': 10,
                'Nov': 11,
                'Dec': 12,
            },
            num_tomonth: months_map,

            day_fromnum: day_map,

            startTime: undefined,
            startTimeObj: undefined,

            endTime: undefined,
            endTimeObj: undefined,


            select: '',
            quantum: '',

            current_year: undefined,
            current_month: undefined,
            current_day: undefined,
            current_hour: '00',
        }

        this.daysBetween = this.daysBetween.bind(this);
        this.monthsBetween = this.monthsBetween.bind(this);
        this.updateYear = this.updateYear.bind(this);
        this.updateMonth = this.updateMonth.bind(this);
        this.updateDay = this.updateDay.bind(this);
        this.daysInMonth = this.daysInMonth.bind(this);
        this.updateDate = this.updateDate.bind(this);
        this.updateHour = this.updateHour.bind(this);
        this.parseDate = this.parseDate.bind(this);

        this.startChange = this.startChange.bind(this);
        this.endChange = this.endChange.bind(this);
        //this.getYears = this.getYears.bind(this);
    }

    componentDidMount() {
        //this.props.localUpdate(this.props.name, this.state.startTimeObj, this.state.endTimeObj)
        let available_times;
        let self = this;
        if ('dataset' in this.props && this.props.dataset != '' && this.props.dataset != undefined && this.props.dataset != 'all') {
            this.updateTimes()
        } else {
            $.ajax({
                url: `/api/v1.0/timestamps/?dataset=all`,
                dataType: "json",
                success: function (response) {
                    self.setState({
                        times_available: response
                    })
                    //this.setState_start
                }
            })
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.props.dataset != prevProps.dataset) {
            this.updateTimes()
        }

    }

    /*
        Creates a date object from ISO8601 Extended String
    */
    parseDate(value) {
        let  dateObj = moment.tz(value, 'GMT')
        return dateObj
    }

    /*
        Retrieves and formats the timestamps for a particular dataset
    */
    updateTimes() {
        $.ajax({
            url: '/api/v1.0/timestamps/?dataset=' + this.props.dataset,
            dataType: "json",
            success: function (response) {

                let modified = {}
                let formatted = {}
                for (let val in response) {

                    let date = this.parseDate(response[val]['value'])
                    formatted[date.format('YYYY/MM/DD[T]HH')] = moment.tz(date, 'GMT')
                    let year = date.get('year')
                    let month = date.format('MMM')
                    let day = date.get('date')
                    let hour = date.get('hour')
                    let minute = date.get('minute')
                    let second = date.get('second')
                    if (modified[year] === undefined) {
                        modified[year] = {
                            [month]: {
                                [day]: {
                                    [hour]: {
                                        [minute]: [second]
                                    }
                                }
                            }
                        }

                    } else {
                        if (modified[year][month] === undefined) {
                            modified[year][month] = {
                                [day]: {
                                    [hour]: {
                                        [minute]: [second]
                                    }
                                }
                            }
                        } else {
                            if (modified[year][month][day] === undefined) {
                                modified[year][month][day] = {
                                    [hour]: {
                                        [minute]: [second]
                                    }
                                }
                            } else {
                                if (modified[year][month][day][hour] === undefined) {
                                    modified[year][month][day][hour] = {
                                        [minute]: [second]
                                    }
                                } else {
                                    if (modified[year][month][day][hour][minute] === undefined) {
                                        modified[year][month][day][hour][minute] = [second]
                                    } else {
                                        modified[year][month][day][hour][minute].push(second)
                                    }
                                }
                            }
                        }
                    }
                }
                this.setState({
                    response: response,
                    times_available: modified,
                    formatted_dates: formatted
                })
            }.bind(this)
        }).done(() => { this.updateDate() })
    }

    /*
        Counts the number of days between 2 date objects
    
        Requires: 2 valid date objects
        Ensures: Integer of number of days between dates (negative if date2 is before date1)
    */
    daysBetween(date1, date2) {
        if (date1 === undefined || date2 === undefined) {
            return -1
        }
        //Get 1 day in milliseconds
        let one_day = 1000 * 60 * 60 * 24;

        // Convert both dates to milliseconds
        //let date1_ms = date1.valueOf();
        //let date2_ms = date2.valueOf();

        // Calculate the difference in milliseconds
        let difference_ms = date2 - date1;

        // Convert back to days and return
        return Math.round(difference_ms / one_day);
    }

    monthsBetween(date1, date2) {
        if (date1 === undefined || date2 === undefined) {
            return -1
        }
        if (typeof(date1) === 'number') {
            date1 = moment(date1)
        }
        if (typeof(date2) === 'number') {
            date2 = moment(date2)
        }
        
        let month1 = date1.get('month')
        let month2 = date2.get('month')

        let difference = month2 - month1
        
        return difference
    }

    updateDate() {
        let quantum = this.props.quantum
        let startTimeObj
        let endTimeObj

        // Initializing
        if (this.state.startTimeObj === undefined || this.state.endTimeObj === undefined) { // Initializing
            //endTimeObj = new Date(this.state.response[this.state.response.length - 1].value)
            endTimeObj = this.parseDate(this.state.response[this.state.response.length - 1].value)
            //endTimeObj.setUTCMonth(endTimeObj.getUTCMonth() + 1)
            startTimeObj = moment.tz(endTimeObj, 'GMT')
            startTimeObj.subtract(10, 'days')
            if (!(startTimeObj in this.state.response)) {
                startTimeObj = moment.tz(endTimeObj, 'GMT')
            }
        } else {    // Updating (based on dataset change)
            if (!(moment(this.state.startTimeObj) in this.state.response) || !(moment(this.state.endTimeObj) in this.state.response)) {
                endTimeObj = moment.tz(this.state.response[-1], 'GMT')
                startTimeObj = moment.tz(endTimeObj, 'GMT')
                startTimeObj.subtract(10, 'days')
                if (!(startTimeObj in this.state.response)) {
                    startTimeObj = moment.tz(endTimeObj, 'GMT')
                }
            }
        }

        // Truncates to required quantum
        // DO NOT USE TRUNCATING APPROACH - MONTHLY QUANTUM STILL HAS MIN AND HOUR
        
        let startTime
        let endTime
        switch(quantum) {
            case 'month': 
                startTime = startTimeObj.format('YYYY/MM')
                endTime = endTimeObj.format('YYYY/MM')
                break;
            case 'day':
                startTime = startTimeObj.format('YYYY/MM/DD')
                endTime = endTimeObj.format('YYYY/MM/DD')
                break;
            case 'hour':
                startTime = startTimeObj.format('YYYY/MM/DD[ : ]HH[z]')
                endTime = endTimeObj.format('YYYY/MM/DD[ : ]HH[z]')
                break
            case 'min':
                startTime = startTimeObj.format('YYYY/MM/DD[ : ]HH[:]MM')
                endTime = endTimeObj.format('YYYY/MM/DD[ : ]HH[:]MM')
            }

        this.setState({
            startTimeObj: startTimeObj,
            startTime: startTime,
            endTimeObj: endTimeObj,
            endTime: endTime
        })


        this.props.localUpdate(this.props.id, startTimeObj, endTimeObj)
    }

    startChange(startDate, endDate) {
        
        endDate.add(10, 'days')

        if (endDate.format('YYYY/MM/DD[T]HH') in this.state.formatted_dates) {
        } else {
            for (let i = 0; i < 10; i = i + 1) {
                endDate.subtract(1, 'days')

                if (endDate.format('YYYY/MM/DD[T]HH') in this.state.formatted_dates) {
                    break
                }
            }
        }

        
        var startString = startDate.format('YYYY/MM/DD')
        var endString = endDate.format('YYYY/MM/DD')

        let new_state = this.state;
        new_state.startTimeObj = undefined;
        new_state.endTimeObj = undefined;
        new_state = jQuery.extend({}, new_state);
        new_state.startTimeObj = startDate.valueOf();
        new_state.startTime = startString;
        new_state.endTimeObj = endDate.valueOf()
        new_state.endTime = endString;
        this.setState(new_state)
                    

        this.props.localUpdate(this.props.id, moment(startDate), moment(endDate))
    }

    endChange(startDate, endDate) {

        startDate = moment(startDate).clone().subtract(10, 'days')

        if (startDate.format('YYYY/MM/DD[T]HH') in this.state.formatted_dates) {
        } else {
            for (let i = 0; i < 10; i = i + 1) {
                startDate.add(1, 'days')

                if (startDate.format('YYYY/MM/DD[T]HH') in this.state.formatted_dates) {
                    break;
                }
            }
            
        }

        let startString = startDate.format('YYYY/MM/DD')
        let endString = endDate.format('YYYY/MM/DD')

        this.setState({
            startTime: startString,
            endTime: endString,
            startTimeObj: startDate,
            endTimeObj: endDate,
        })

        this.props.localUpdate(this.props.id, moment(startDate).clone(), moment(endDate).clone())
    }

    updateYear(e) {
        if (this.state.select === 'year') {
            this.setState({
                select: 'month',
                selected_year: e.target.name,
            })
        } else {
            this.setState({
                select: 'year',
            })
        }

    }

    updateMonth(e) {
        if (this.state.select === 'month') {
            if (Object.keys(this.state.times_available[this.state.selected_year][e.target.name]).length === 1) {
                
                let start_month = this.state.month_tonum[e.target.name]
                let end_month = start_month + 1
                
                let start_day = Object.keys(this.state.times_available[this.state.selected_year][this.state.num_tomonth[start_month]])[0]
                let start_hour = Object.keys(this.state.times_available[this.state.selected_year][this.state.num_tomonth[start_month]][start_day])[0]
                let start_min = Object.keys(this.state.times_available[this.state.selected_year][this.state.num_tomonth[start_month]][start_day][start_hour])[0]
                let start_second = Object.keys(this.state.times_available[this.state.selected_year][this.state.num_tomonth[start_month]][start_day][start_hour][start_min])[0]
                
                let end_day = Object.keys(this.state.times_available[this.state.selected_year][this.state.num_tomonth[end_month]])[0]
                let end_hour = Object.keys(this.state.times_available[this.state.selected_year][this.state.num_tomonth[end_month]][end_day])[0]
                let end_min = Object.keys(this.state.times_available[this.state.selected_year][this.state.num_tomonth[end_month]][end_day][end_hour])[0]
                let end_second = Object.keys(this.state.times_available[this.state.selected_year][this.state.num_tomonth[end_month]][end_day][end_hour][end_min])[0]
                
                
                //let second = this.state.times_available[this.state.selected_year][e.target.name][day][hour][min]
                let formatted_start = this.state.selected_year + '-' + start_month + '-' + start_day
                let formatted_end = this.state.selected_year + '-' + end_month + '-' + start_day
                
                var startTimeObj = new moment(formatted_start)
                startTimeObj.tz('GMT')
                startTimeObj.set({
                    hour: start_hour,
                    minute: start_min,
                    second: start_second
                })
                
                var endTimeObj = new moment(formatted_end)
                endTimeObj.tz('GMT')
                endTimeObj.set({
                    hour: end_hour,
                    minute: end_min,
                    second: end_second
                })

                if (this.state.selecting === 'startTime') {
                    let difference = this.monthsBetween(startTimeObj.valueOf(), this.state.endTimeObj);
                    if (difference > 10 || difference < 0) {
                        this.startChange(startTimeObj, endTimeObj)
                    } else {    
                        this.props.localUpdate(this.props.id, moment(startTimeObj), moment(this.state.endTimeObj))
                    }

                    this.setState({
                        select: '',
                        selected_day: e.target.name,
                    })
                    return
                    
                } else {
                    let difference = this.daysBetween(timeObj.valueOf(), this.state.startTimeObj)
                    if (difference > 10 && difference < 0) {
                        this.endChange(moment(timeObj), moment(timeObj))
                    } else {
                        this.props.localUpdate(this.props.id, moment(this.state.startTimeObj), moment(timeObj))
                    }

                    this.setState({
                        select: '',
                        selected_day: e.target.name,
                    })
                    return
                }

            } else {
                this.setState({
                    select: 'day',
                    selected_month: e.target.name
                })
            }
        } else {    // Reselect 
            this.setState({
                select: 'month'
            })
        }
    }

    updateDay(e) {
        let startTime
        let endTime
        if (this.state.select === 'day') {
            console.warn("SETTING TIME")
            // If quantum === 'day'
            if (Object.keys(this.state.times_available[this.state.selected_year][this.state.selected_month][e.target.name]).length === 1) {
                let year = this.state.selected_year
                let month = this.state.month_tonum[this.state.selected_month]
                month = month - 1
                let day = e.target.name
               
                console.warn("YEAR: ", year)
                console.warn("MONTH: ", month)
                console.warn("DAY: ", day)

                // Fetch correct hour, min, sec from available times
                let hour = Object.keys(this.state.times_available[this.state.selected_year][this.state.selected_month][e.target.name])[0]
                let min = Object.keys(this.state.times_available[this.state.selected_year][this.state.selected_month][e.target.name][hour])[0]
                let sec = Object.keys(this.state.times_available[this.state.selected_year][this.state.selected_month][e.target.name][hour][min])[0]
                
                console.warn("HOUR: ", hour);
                console.warn("MINUTE: ", min);
                console.warn("SECOND: ", sec);

                var startTimeObj = new moment() 
                var endTimeObj = new moment()
                startTimeObj.tz('GMT')
                endTimeObj.tz('GMT')

                startTimeObj.set({
                    year: year,
                    month: month,
                    date: day,
                    hour: hour,
                    minute: min,
                    second: sec,
                    milliseconds: 0,
                })
                console.warn("START TIME: ", startTimeObj.format('YYYY-MM-DD'))
                endTimeObj.set({
                    year: year,
                    month: month,
                    date: day,
                    hour: hour,
                    minute: min,
                    second: sec,
                    milliseconds: 0,
                })
                console.warn("END TIME: ", endTimeObj.format("YYYY-MM-DD"))

                if (this.state.selecting === 'startTime') {
                    let difference = this.daysBetween(startTimeObj.valueOf(), this.state.endTimeObj);
                    if (difference > 10 || difference < 0) {
                        this.startChange(startTimeObj, endTimeObj)
                    } else {    
                        this.props.localUpdate(this.props.id, moment(startTimeObj), moment(this.state.endTimeObj))
                        this.setState({
                            startTimeObj: startTimeObj
                        })
                    }

                    this.setState({
                        select: '',
                        selected_day: e.target.name,
                    })
                    return
                    
                } else {
                    let difference = this.daysBetween(endTimeObj.valueOf(), this.state.startTimeObj)
                    if (difference > 10 || difference < -10) {
                        
                        this.endChange(moment(startTimeObj), moment(endTimeObj))
                    } else {
                        this.props.localUpdate(this.props.id, moment(this.state.startTimeObj), moment(endTimeObj))
                        this.setState({
                            endTimeObj: endTimeObj
                        })
                    }

                    this.setState({
                        select: '',
                        selected_day: e.target.name,
                    })
                    return
                }
            } else {
                this.setState({
                    select: 'hour',
                    selected_day: e.target.name
                })
            }

        } else {
            this.setState({
                select: 'day'
            })
        }
        //this.props.localUpdate(this.props.id, startTimeObj, endTimeObj)
    }

    

    updateHour(e) {
        let startTime
        let endTime

        var startTimeObj = new moment(this.state.selected_year + '-' + this.state.month_tonum[this.state.selected_month] + '-' + this.state.selected_day)
        var endTimeObj = new moment(this.state.selected_year + '-' + this.state.month_tonum[this.state.selected_month] + '-' + this.state.selected_day)
        startTimeObj.tz('GMT')
        endTimeObj.tz('GMT')

        startTimeObj.set({
            hour: e.target.value,
        })
        endTimeObj.set({
            hour: e.target.value,
        })
        if (this.state.selecting === 'startTime') {
            let difference = this.daysBetween(startTimeObj.valueOf(), this.state.endTimeObj);
                    
            if (difference > 10 || difference < 0) {
                this.startChange(startTimeObj, endTimeObj)        
            } else {
                this.props.localUpdate(this.props.id, moment(startTimeObj), moment(this.state.endTimeObj))    
            }
            
            this.setState({
                select: '',
                selected_hour: e.target.name,
            })
            return

        } else {
            let difference = this.daysBetween(timeObj.valueOf(), this.state.startTimeObj)
                    
            if (difference > 10 || difference < 0) {
                this.endChange(moment(timeObj), moment(timeObj))
            } else {
                this.props.localUpdate(this.props.id, moment(this.state.startTimeObj), moment(timeObj))    
            }

            this.setState({
                select: '',
                selected_day: e.target.name,
            })
            return
        }

    }

    daysInMonth(iMonth, iYear) {
        return 32 - new Date(iYear, iMonth, 32).getUTCDate();
    }

    render() {
        let self = this

        let buttons = []
        if (this.state.select == 'year') {
            for (let year in this.state.times_available) {
                buttons.push(
                    <Button
                        onClick={self.updateYear}
                        className='yearButtons'
                        key={year}
                        name={year}
                    >{year}</Button>
                )
            }
            /*
            this.state.years.forEach(function (year) {
                buttons.push(
                    <Button onClick={self.updateYear}
                        className='yearButtons'
                        key={year}
                        name={year}
                    >
                        {year}
                    </Button>
                )
            })
            */
            buttons =
                <div className='yearContainer buttonContainer'>
                    {buttons}
                </div>
        }


        if (this.state.select == 'month') {

            let previous = [
                <Button
                    onClick={self.updateYear}
                    className='yearButton'
                    key={this.state.selected_year}
                    name={this.state.selected_year}
                >
                    {this.state.selected_year}
                </Button>
            ]
            buttons = []
            for (let idx in this.state.times_available[this.state.selected_year]) {
                
                buttons.push(
                    <Button
                        onClick={self.updateMonth}
                        className='monthButtons'
                        key={idx}
                        name={idx}
                    >{idx}</Button>
                )
            }
            /*
            this.state.months.forEach(function (month) {
                buttons.push(
                    <Button onClick={self.updateMonth}
                        className='monthButtons'
                        key={month}
                        name={month}
                    >
                        {month}
                    </Button>
                )
            })
            */

            buttons =
                <div className='timecontainer'>
                    <div className='selectedContainer'>
                        {previous}
                    </div>
                    <div className='monthContainer buttonContainer'>
                        {buttons}
                    </div>
                </div>
        }


        if (this.state.select === 'day') {
            let previous = [
                <Button onClick={self.updateYear}
                    className='yearButton'
                    key={this.state.selected_year}
                    name={this.state.selected_year}
                >
                    {this.state.selected_year}
                </Button>
            ]
            previous.push(
                <Button onClick={self.updateMonth}
                    className='monthButton'
                    key={this.state.selected_month}
                    name={this.state.selected_month}
                >
                    {this.state.selected_month}
                </Button>
            )
            buttons = []
            //let num_days = this.daysInMonth(this.state.month_tonum[this.state.selected_month], this.state.selected_year)
            //let date = new Date(this.state.selected_year, this.state.month_tonum[this.state.selected_month])
            let days = this.state.times_available[this.state.selected_year][this.state.selected_month]
            //days.sort()
            for (let idx in days) {
                let day = idx
                buttons.push(
                    <Button
                        onClick={self.updateDay}
                        className='dayButtons'
                        key={day}
                        name={day}
                    >
                        {day}
                    </Button>
                )
            }
            buttons =
                <div className='timecontainer'>
                    <div className='selectedContainer'>
                        {previous}
                    </div>
                    <div className='dayContainer buttonContainer'>
                        {buttons}
                    </div>
                </div>

        }

        if (this.state.select === 'hour') {
            let previous = [
                <Button onClick={self.updateYear}
                    className='yearButton'
                    key={this.state.selected_year}
                    name={this.state.selected_year}
                >
                    {this.state.selected_year}
                </Button>
            ]
            previous.push(
                <Button onClick={self.updateMonth}
                    className='monthButton'
                    key={this.state.selected_month}
                    name={this.state.selected_month}
                >
                    {this.state.selected_month}
                </Button>
            )
            previous.push(
                <Button onClick={self.updateDay}
                    className='dayButton'
                    key={this.state.selected_day}
                    name={this.state.selected_month}
                >{this.state.selected_day}</Button>
            )

            let hours = this.state.times_available[this.state.selected_year][this.state.selected_month][this.state.selected_day]

            for (let idx in hours) {
                let hour = idx
                buttons.push(
                    <Button
                        onClick={self.updateHour}
                        className='dayButtons'
                        key={hour}
                        name={hour}
                    >
                        {hour}
                    </Button>
                )
            }

            buttons =
                <div className='timecontainer'>
                    <div className='selectedContainer'>
                        {previous}
                    </div>
                    <div className='dayContainer buttonContainer'>
                        {buttons}
                    </div>
                </div>
        }

        if (this.state.select === 'minute') {
            console.warn("NOT CONFIGURED")
        }

        if (this.state.select === '' && this.props.currentTime != undefined && this.state.endTime != undefined && this.state.startTime != undefined) {
            buttons.push(
                <div className='timecontainer' key='timeline'>
                    <Timeline
                        startTime={moment(this.state.startTimeObj)}
                        endTime={moment(this.state.endTimeObj)}
                        currentTime={this.props.currentTime}
                        length={665}
                        offset={0}
                        time_inc={'1-day'}
                    ></Timeline>
                </div>)
        }


        let bounding_class
        if (this.props.show) {
            bounding_class = 'timeBarContainer'
        } else {
            bounding_class = 'timeBarContainer hide'
        }

        let current_time = ' '
        if (this.props.currentTime != undefined) {
            //let month = this.props.currentTime.getUTCMonth().toString()
            //if (month.length === 1) {
            //    month = '0' + month
            //}
            //let date = this.props.currentTime.getUTCDate().toString()
            //if (date.length === 1) {
            //    date = '0' + date
            //}
            if (this.props.quantum === 'hour') {
                current_time = this.props.currentTime.format('YYYY/MM/DD[ : ]HH[z]')
                //current_time = this.props.currentTime.getUTCFullYear() + '/' + month + '/' + date + ' : ' + this.props.currentTime.getUTCHours() + 'z'
            } else if (this.props.quantum === 'day') {
                current_time = this.props.currentTime.format('YYYY/MM/DD')
                //current_time = this.props.currentTime.getUTCFullYear() + '/' + month + '/' + date
            } else if (this.props.quantum === 'month') {
                current_time = this.props.currentTime.format('YYYY/MM')
                //current_time = this.props.currentTime.getUTCFullYear() + '/' + month
            }
        }


        return (
            <div className={bounding_class}>
                <Button
                    className='startTimeContainer'
                    onClick={() => {
                        if (this.state.select === '') {
                            this.setState({ select: 'year', selecting: 'startTime' })
                        } else {
                            this.setState({ select: '' })
                        }
                    }}
                >
                    {current_time}
                </Button>
                {buttons}
                <Button
                    className='endTimeContainer'
                    onClick={() => {
                        if (this.state.select === '') {
                            this.setState({ select: 'year', selecting: 'endTime' })
                        } else {
                            this.setState({ select: '' })
                        }
                    }}
                >
                    {this.state.endTime}
                </Button>
            </div>
        );
    }
}

//***********************************************************************
TimeSelect.propTypes = {
    localUpdate: PropTypes.func,
};
