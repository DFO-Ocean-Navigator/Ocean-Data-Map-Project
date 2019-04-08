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
        /*
        let full_date = value.split('T')
        let date = full_date[0].split('-')
        let full_time = full_date[1].split('+')
        let time = full_time[0].split(':')

        let year = date[0]
        let month = date[1]
        let day = date[2]
        let hour = time[0]
        let min = time[1]
        let sec = time[2]

        let dateObj = new Date(0)

        dateObj.setUTCFullYear(year)
        dateObj.setUTCMonth(month)
        dateObj.setUTCDate(day)
        dateObj.setUTCHours(hour)
        dateObj.setUTCMinutes(min)
        dateObj.setUTCSeconds(sec)
        */
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
                    if (modified[year] === undefined) {
                        modified[year] = {
                            [month]: {
                                [day]: {
                                    [hour]: [minute]
                                }
                            }
                        }

                    } else {
                        if (modified[year][month] === undefined) {
                            modified[year][month] = {
                                [day]: {
                                    [hour]: [minute]
                                }
                            }
                        } else {
                            if (modified[year][month][day] === undefined) {
                                modified[year][month][day] = {
                                    [hour]: [minute]
                                }
                            } else {
                                if (modified[year][month][day][hour] === undefined) {
                                    modified[year][month][day][hour] = [minute]
                                } else {
                                    modified[year][month][day][hour].push(minute)
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
        

        let startTime
        let endTime
        switch(quantum) {
            case 'month': 
                
                startTimeObj.set({
                    date: 0,
                    hour: 0,
                    minute: 0,
                    second: 0
                })
                endTimeObj.set({
                   date: 0,
                   hour: 0,
                   minute: 0,
                   second: 0,
                })
                startTime = startTimeObj.format('YYYY/MM')
                endTime = endTimeObj.format('YYYY/MM')
                
            case 'day':
                startTimeObj.set({
                    hour: 0,
                    minute: 0,
                    second: 0,
                })
                endTimeObj.set({
                   hour: 0,
                   minute: 0,
                   second: 0,
                })
                startTime = startTimeObj.format('YYYY/MM/DD')
                endTime = endTimeObj.format('YYYY/MM/DD')
                
            case 'hour':
                startTimeObj.set({
                   minute: 0,
                   second: 0,
                })
                endTimeObj.set({
                    minute: 0,
                    second: 0,
                })
                startTime = startTimeObj.format('YYYY/MM/DD[ : ]HH[z]')
                endTime = endTimeObj.format('YYYY/MM/DD[ : ]HH[z]')
                
            case 'min':
                startTimeObj.set({
                    second: 0,
                })
                endTimeObj.set({
                    second: 0,
                })
        }

        this.setState({
            startTimeObj: startTimeObj,
            startTime: startTime,
            endTimeObj: endTimeObj,
            endTime: endTime
        })
        this.props.localUpdate(this.props.id, startTimeObj, endTimeObj)
    }

    updateYear(e) {
        console.warn("UPDATE YEAR ~~~~~~~~~~~~~~")
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
            this.setState({
                select: 'day',
                selected_month: e.target.name
            })
        } else {
            this.setState({
                select: 'month'
            })
        }
    }

    updateDay(e) {
        console.warn("UPDATE DAY ~~~~~~~~~~~~~~~~~~")
        let startTime
        let endTime
        console.warn("SELECTING: ", this.state.selecting)
        if (this.state.select === 'day') {
            
            // If quantum === 'day'
            if (Object.keys(this.state.times_available[this.state.selected_year][this.state.selected_month][e.target.name]).length === 1) {
                /*timeObj.set({
                    'year': this.state.selected_year,
                    'month': this.state.selected_month,
                    'days': e.target.name,
                    'hours': 0,
                    'minutes': 0,
                })*/
                var startTimeObj = new moment(this.state.selected_year + '-' + this.state.month_tonum[this.state.selected_month] + '-' + e.target.name)
                var endTimeObj = new moment(this.state.selected_year + '-' + this.state.month_tonum[this.state.selected_month] + '-' + e.target.name)
                
                if (this.state.selecting === 'startTime') {
                    let difference = this.daysBetween(startTimeObj.valueOf(), this.state.endTimeObj);
                    console.warn("DIFFERENCE: ", difference)
                    if (difference > 10 || difference < 0) {
                        //var startDate = new moment(timeObj)
                        //var endDate = new moment(timeObj)
                        this.startChange(startTimeObj, endTimeObj)
                    } else {    
                        this.props.localUpdate(this.props.id, moment(startTimeObj), moment(this.state.endTimeObj))
                    }

                    this.setState({
                        select: '',
                        selected_day: e.target.name,
                    })
                    return
                    
                        //endTimeObj = moment(timeObj).add(10, 'days')
                        //endTime = endTimeObj.format('YYYY/MM/DD')
                    
                    /*} else {
                    
                        endTimeObj = this.state.endTimeObj;
                        endTime = this.state.endTime;
                    
                    }*/
                } else {
                    let difference = this.daysBetween(timeObj.valueOf(), this.state.startTimeObj)
                    console.warn("DIFFERENCE END TIME: ", difference)
                    if (difference > 10 && difference < 0) {
                        this.endChange(moment(timeObj), moment(timeObj))
                    } else {
                        console.warn("DAY: ", timeObj.get('days'))
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

    startChange(startDate, endDate) {
        console.warn("START CHANGE: ", startDate, endDate)
        
        endDate.add(10, 'days')

        if (endDate.format('YYYY/MM/DD[T]HH') in this.state.formatted_dates) {
          console.warn("Formatted Dates: ", this.state.formatted_dates[endDate.format('YYYY/MM/DD[T]HH')])
        } else {
            for (let i = 0; i < 10; i = i + 1) {
                endDate.subtract(1, 'days')

                if (endDate.format('YYYY/MM/DD[T]HH') in this.state.formatted_dates) {
                    break
                }
            }
        }
        var new_moment = new moment('2018/12/2')
        var new_moment2 = new_moment.clone()
        new_moment.add(10, 'days')
        console.warn("NEW MOMENT: ", new_moment)
        console.warn("NEW MOMENT 2: ", new_moment2)

        var startString = startDate.format('YYYY/MM/DD')
        var endString = endDate.format('YYYY/MM/DD')
        console.warn("START STIRNG: ", startString)
        console.warn("START DATE: ", startDate)
        console.warn("END DATE: ", endDate)
        
        let new_state = this.state;
        new_state.startTimeObj = undefined;
        new_state.endTimeObj = undefined;
        new_state = jQuery.extend({}, new_state);
        new_state.startTimeObj = startDate.valueOf();
        new_state.startTime = startString;
        new_state.endTimeObj = endDate.valueOf()
        new_state.endTime = endString;
        console.warn("NEW STATE: ", new_state)
        this.setState(new_state)
                    

        this.props.localUpdate(this.props.id, moment(startDate), moment(endDate))
    }

    endChange(startDate, endDate) {
        console.warn("END CHANGE", startDate, endDate)

        startDate = moment(startDate).clone().subtract(10, 'days')

        if (startDate.format('YYYY/MM/DD[T]HH') in this.state.formatted_dates) {
            console.warn("Formatted Dates: ", this.state.formatted_dates[endDate.format('YYYY/MM/DD[T]HH')])
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

    updateHour(e) {
        let timeObj = moment(this.state.selected_year, this.state.selected_month, this.state.selected_day, e.target.name)
        let startTime = ''
        let startTimeObj
        let endTime
        let endTimeObj
        timeObj.tz('GMT')

        if (this.state.selecting === 'startTime') {
            let difference = this.daysBetween(timeObj, moment(this.state.endTimeObj));
            
        
            startTime = timeObj.format('YYYY/MM/DD[ : ]HH[z]')
            startTimeObj = timeObj;
            if (difference > 10 || difference < 0) {
                endTimeObj = moment(timeObj);
                endTimeObj.add('date', 10)
        
                endTime = endTimeObj.format('YYYY/MM/DD[ : ]HH[z]')
            } else {
                endTimeObj = moment(this.state.endTimeObj);
                endTime = this.state.endTime;
            }
        } else {
            
            endTime = timeObj.format('YYYY/MM/DD[ : ]HH[z]')
            endTimeObj = timeObj;
            let difference = this.daysBetween(moment(this.state.startTimeObj), endTimeObj)
            if (difference > 10 || difference < 0) {
                startTimeObj = moment(timeObj)
                startTimeObj.subtract('date', 10)
                startTime = startTimeObj.format('YYYY/MM/DD[ : ]HH[z]')
            } else {
                startTimeObj = moment(this.state.startTimeObj);
                startTime = this.state.startTime;
            }
        }

        this.setState({
            select: '',
            startTime: startTime,
            startTimeObj: startTimeObj,
            endTime: endTime,
            endTimeObj: endTimeObj,
            selected_hour: e.target.name,
        })

        this.props.localUpdate(this.props.id, startTimeObj, endTimeObj)
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

            let hours = this.state.times_available[this.state.selected_year][this.state.month_tonum[this.state.selected_month]][this.state.selected_day]

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
