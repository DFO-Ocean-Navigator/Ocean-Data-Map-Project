import React from "react";
import ComboBox from "./ComboBox.jsx";
import Range from "./Range.jsx";
import SelectBox from "./SelectBox.jsx";
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

            currentTimeObj: undefined,

            select: '',
            quantum: 'hour',

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
        //this.getYears = this.getYears.bind(this);
    }
    
    componentDidMount() {
        //this.props.localUpdate(this.props.name, this.state.startTimeObj, this.state.endTimeObj)
        let available_times;
        let self = this;
        if ('dataset' in this.props && this.props.dataset != '' && this.props.dataset!= undefined && this.props.dataset != 'all') {
            this.updateTimes()
        } else {
            $.ajax({
                url: `/api/v1.0/timestamps/?dataset=all`,
                dataType: "json",
                success: function(response) {
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

    updateTimes() {
        $.ajax({
            url: '/api/v1.0/timestamps/?dataset=' + this.props.dataset,
            dataType: "json",
            success: function(response) {
               
                let modified = {}
                for (let val in response) {
                    let date = new Date(response[val]['value'])
                    
                    let year = date.getUTCFullYear()
                    let month = date.getUTCMonth() + 1
                    let day = date.getUTCDate()
                    let hour = date.getUTCHours()
                    let minute = date.getUTCMinutes()
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
                    times_available: modified
                })
            }.bind(this)
        }).done(() => {this.updateDate()})
    }  

    daysBetween( date1, date2 ) {
        if (date1 === undefined || date2 === undefined) {
            return -1
        }
         //Get 1 day in milliseconds
        let one_day=1000*60*60*24;
        
        // Convert both dates to milliseconds
        let date1_ms = date1.getTime();
        let date2_ms = date2.getTime();
        
        // Calculate the difference in milliseconds
        let difference_ms = date2_ms - date1_ms;

        // Convert back to days and return
        return Math.round(difference_ms/one_day); 
    }

    updateDate() {
        let quantum = this.props.quantum
        let startTimeObj
        let endTimeObj
        if (this.state.startTimeObj === undefined || this.state.endTimeObj === undefined) { // Initializing
            endTimeObj = new Date(this.state.response[this.state.response.length - 1].value)
            startTimeObj = new Date(endTimeObj)
            startTimeObj.setUTCDate(startTimeObj.getUTCDate() - 10)
            if (! (startTimeObj in this.state.response)) {
                startTimeObj = new Date(endTimeObj)
            }
        } else {    // Changing Datasets
            if (!(this.state.startTimeObj in this.state.response) || !(this.state.endTimeObj in this.state.response)) {
                endTimeObj = new Date(this.state.response[-1])
                startTimeObj = new Date(endTimeObj)
                startTimeObj.setUTCDate(startTimeObj.getUTCDate() - 10)
                if (! (startTimeObj in this.state.response)) {
                    startTimeObj = new Date(endTimeObj)
                }   
            }
        }

        let startTime
        let endTime
        if (quantum === 'month') {
            startTime = startTimeObj.getUTCFullYear() + '/' + startTimeObj.getUTCMonth()
            endTime = endTimeObj.getUTCFullYear() + '/' + endTimeObj.getUTCMonth()
        } else if (quantum === 'day') {
            startTime = startTimeObj.getUTCFullYear() + '/' + startTimeObj.getUTCMonth() + '/' + startTimeObj.getUTCDate()
            endTime = endTimeObj.getUTCFullYear() + '/' + endTimeObj.getUTCMonth() + '/' + endTimeObj.getUTCDate()
        } else if (quantum === 'hour') {
            startTime = startTimeObj.getUTCFullYear() + '/' + startTimeObj.getUTCMonth() + '/' + startTimeObj.getUTCDate() + ' : ' + startTimeObj.getUTCHours() + 'z'
            endTime = eneTimeObj.getUTCFullYear() + '/' + endTimeObj.getUTCMonth() + '/' + endTimeObj.getUTCDate() + ' : ' + endTimeObj.getUTCHours() + 'z'    
        }

        this.setState({
            startTimeObj : startTimeObj,
            startTime: startTime,
            endTimeObj: endTimeObj,
            endTime: endTime
        })
        this.props.localUpdate(this.props.id, startTimeObj, endTimeObj)
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
        let startTime
        let startTimeObj
        let endTime
        let endTimeObj
        if (this.state.select === 'day') {
            if (Object.keys(this.state.times_available[this.state.selected_year][this.state.month_tonum[this.state.selected_month]][e.target.name]).length === 1) {
                
                let timeObj = new Date()
                timeObj.setUTCFullYear(this.state.selected_year);
                timeObj.setUTCMonth(this.state.month_tonum[this.state.selected_month]) - 1;
                timeObj.setUTCDate(e.target.name);
                timeObj.setUTCHours(0);
                timeObj.setUTCMinutes(0)
                
                    
                if (this.state.selecting === 'startTime') {
                    let difference = this.daysBetween(timeObj, this.state.endTimeObj);

                    // Define times
                    let year = timeObj.getUTCFullYear()
                    let month = timeObj.getUTCMonth()
                    if (month.toString().length === 1) {
                        month = '0' + month
                    }
                    let date = timeObj.getUTCDate()
                    if (date.toString().length === 1) {
                        date = '0' + date
                    }
                    

                    startTime =  year + '/' + timeObj.getUTCMonth() + '/' + timeObj.getUTCDate()
                    startTimeObj = timeObj;
                    if (difference > 10 || difference < 0) {
                       endTimeObj = new Date(timeObj);
                        endTimeObj.setUTCDate(endTimeObj.getUTCDate() + 10);
                        endTime = endTimeObj.getUTCFullYear() + '/' + endTimeObj.getMonth() + '/' + endTimeObj.getUTCDate()
                    } else {
                        endTimeObj = this.state.endTimeObj;
                        endTime = this.state.endTime;
                    }
                } else {
                    let end_time = 
                    endTime =  timeObj.getUTCFullYear() + '/' + timeObj.getUTCMonth() + '/' + timeObj.getUTCDate()
                    endTimeObj= timeObj;
                    let difference = this.daysBetween(timeObj, this.state.startTimeobj)
                    if (difference > 10 || difference < 0) {
                        startTimeObj = new Date(timeObj)
                        startTimeObj.setUTCDate(timeObj.getUTCDate() - 10);
                        startTime = startTimeObj.getUTCFullYear() + '/' + startTimeObj.getUTCMonth() + '/' + startTimeObj.getUTCDate()
                    } else {
                        startTimeObj = this.state.startTimeObj;
                        startTime = this.state.startTime;
                    }
                }
                
                this.setState({
                    select: '',
                    selected_day: e.target.name,
                    startTime: startTime,
                    startTimeObj: startTimeObj,
                    endTime: endTime,
                    endTimeObj: endTimeObj,
                })
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
        this.props.localUpdate(this.props.id, startTimeObj, endTimeObj)
    }

    updateHour(e) {

        let timeObj = new Date()
        timeObj.setUTCFullYear(this.state.selected_year);
        timeObj.setUTCMonth(this.state.month_tonum[this.state.selected_month]);
        timeObj.setUTCDate(this.state.selected_day);
        timeObj.setUTCHours(e.target.name);
        timeObj.setUTCMinutes(0)

        let startTime = ''
        let startTimeObj
        let endTime
        let endTimeObj

        if (this.state.selecting === 'startTime') {
            let difference = this.daysBetween(timeObj, this.state.endTimeObj);
            let month = timeObj.getUTCMonth()
            if (month.toString().length === 1) {
                month = '0' + month.toString()
            }
            let date = timeObj.getUTCDate()
            if (date.toString().length === 1) {
                date = '0' + date.toString()
            }
            startTime =  timeObj.getUTCFullYear() + '/' + month + '/' + date + ' : ' + timeObj.getUTCHours() + 'z' + 'test'
            startTimeObj = timeObj;
            if (difference > 10 || difference < 0) {
                endTimeObj = new Date(timeObj);
                endTimeObj.setUTCDate(endTimeObj.getUTCDate() + 10);
                let end_month = endTimeObj.getMonth()
                if (end_month.toString().length === 1) {
                    end_month = '0' + end_month.toString()
                }
                let end_date = endTimeObj.getUTCDate()
                if (end_date.toString().length === 1) {
                    end_date = '0' + end_date.toString()
                }
                endTime = endTimeObj.getUTCFullYear() + '/' + end_month + '/' + end_date + ' : ' + endTimeObj.getUTCHours() + 'z'
            } else {
                endTimeObj = this.state.endTimeObj;
                endTime = this.state.endTime;
            }
        } else {
            let end_month = timeObj.getUTCMonth()
            if (end_month.toString().length === 1) {
                end_month = '0' + end_month.toString()
            }
            let end_date = timeObj.getUTCDate()
            if (end_date.toString().length === 1) {
                end_date = '0' + end_date.toString()
            }
            endTime = timeObj.getUTCFullYear() + '/' + end_month + '/' + end_date + ' : ' + timeObj.getUTCHours() + 'z'
            endTimeObj= timeObj;
            let difference = this.daysBetween(this.state.startTimeObj, endTimeObj)
            if (difference > 10 || difference < 0) {
                startTimeObj = new Date(timeObj)
                startTimeObj.setUTCDate(timeObj.getUTCDate() - 10);
                let end_month = startTimeObj.getUTCMonth()
                if (end_month.toString().length === 1) {
                    end_month = '0' + end_month.toString()
                }
                let end_date = startTimeObj.getUTCDate()
                if (end_date.toString().length === 1) {
                    end_date = '0' + end_date.toString()
                }
                startTime = startTimeObj.getUTCFullYear() + '/' + startTimeObj.getUTCMonth() + '/' + startTimeObj.getUTCDate() + ' : ' + startTimeObj.getUTCHours() + 'z'
            } else {
                startTimeObj = this.state.startTimeObj;
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
                let month = this.state.num_tomonth[idx]
                buttons.push(
                    <Button
                        onClick={self.updateMonth}
                        className='monthButtons'
                        key={month}
                        name={month}
                    >{month}</Button>
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
            let days = this.state.times_available[this.state.selected_year][this.state.month_tonum[this.state.selected_month]]
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
                        startTime={this.state.startTimeObj}
                        endTime={this.state.endTimeObj}
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
            let month = this.props.currentTime.getUTCMonth().toString()
            if (month.length === 1) {
                month = '0' + month
            }
            let date = this.props.currentTime.getUTCDate().toString()
            if (date.length === 1) {
                date = '0' + date
            }
            if (this.state.quantum === 'hour') {
                
                current_time = this.props.currentTime.getUTCFullYear() + '/' + month + '/' + date + ' : ' + this.props.currentTime.getUTCHours() + 'z'
            } else if (this.state.quantum === 'day') {
                current_time = this.props.currentTime.getUTCFullYear() + '/' + this.props.currentTime.getUTCMonth() + '/' + this.props.currentTime.getUTCDate()
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
