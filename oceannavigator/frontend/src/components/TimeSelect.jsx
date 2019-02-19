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
const i18n = require("../i18n.js");

export default class TimeSelect extends React.Component {
    constructor(props) {
        super(props);

        let dateObjStart = new Date();
        let year = dateObjStart.getFullYear();
        let month = dateObjStart.getMonth();
        let date = dateObjStart.getDate();
        let day = dateObjStart.getDay();
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
            0: 'Jan',
            1: 'Feb',
            2: 'Mar',
            3: 'Apr',
            4: 'May',
            5: 'Jun',
            6: 'Jul',
            7: 'Aug',
            8: 'Sep',
            9: 'Oct',
            10: 'Nov',
            11: 'Dec',
        }
        let today = day_map[day] + ' ' + months_map[month] + ' ' + date + ', ' + year
        let dateObjEnd = new Date()
        dateObjEnd.setDate(dateObjStart.getDate() + 10)
        let endDay = day_map[dateObjEnd.getDay()] + ' ' + months_map[dateObjEnd.getMonth()] + ' ' + dateObjEnd.getDate() + ', ' + dateObjEnd.getFullYear()

        this.state = {
            years: [2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019],
            months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            month_tonum: {
                'Jan': 0,
                'Feb': 1,
                'Mar': 2,
                'Apr': 3,
                'May': 4,
                'Jun': 5,
                'Jul': 6,
                'Aug': 7,
                'Sep': 8,
                'Oct': 9,
                'Nov': 10,
                'Dec': 11,
            },
            num_tomonth: months_map,

            day_fromnum: day_map,

            startTime: today,
            startTimeObj: dateObjStart,

            endTime: endDay,
            endTimeobj: dateObjEnd,

            select: '',

            current_year: year,
            current_month: month,
            current_day: date,
        }

        this.daysBetween = this.daysBetween.bind(this);
        this.updateYear = this.updateYear.bind(this);
        this.updateMonth = this.updateMonth.bind(this);
        this.updateDay = this.updateDay.bind(this);
        this.daysInMonth = this.daysInMonth.bind(this);
        //this.getYears = this.getYears.bind(this);
    }
    
    componentDidMount() {
        this.props.localUpdate('global', this.state.startTimeObj, this.state.endTimeObj)
    }
    
    //getYears () {
    //    console.warn("TO IMPLEMENT")
    //}
      

    daysBetween( date1, date2 ) {
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

        let timeObj = new Date()
        timeObj.setFullYear(this.state.selected_year);
        timeObj.setMonth(this.state.month_tonum[this.state.selected_month]);
        timeObj.setDate(e.target.name);

        let startTime
        let startTimeObj
        let endTime
        let endTimeObj

        if (this.state.selecting === 'startTime') {
            let difference = this.daysBetween(timeObj, this.state.endTimeobj);
            startTime = this.state.day_fromnum[timeObj.getDay()] + ' ' + this.state.num_tomonth[timeObj.getMonth()] + ' ' + timeObj.getDate() + ', ' + timeObj.getFullYear()
            startTimeObj = timeObj;
            if (difference > 10 || difference < 0) {
                console.warn("DOING DIFFERENCE")
                endTimeObj = new Date(timeObj);
                endTimeObj.setDate(endTimeObj.getDate() + 10);
                endTime = this.state.day_fromnum[endTimeObj.getDay()] + ' ' + this.state.num_tomonth[endTimeObj.getMonth()] + ' ' + endTimeObj.getDate() + ', ' + endTimeObj.getFullYear()    
            } else {
                endTimeObj = this.state.endTimeobj;
                endTime = this.state.endTime;
            }
        } else {
            endTime = this.state.day_fromnum[timeObj.getDay()] + ' ' + this.state.num_tomonth[timeObj.getMonth()] + ' ' + timeObj.getDate() + ', ' + timeObj.getFullYear()    
            endTimeObj= timeObj;
            let difference = this.daysBetween(timeObj, this.state.startTimeobj)
            if (difference > 10 || difference < 0) {
                startTimeObj = timeObj.copy();
                startTimeObj.setDate(timeObj.getDate() - 10);
                startTime = this.state.day_fromnum[startTimeObj.getDay()] + ' ' + this.state.num_tomonth[startTimeObj.getMonth()] + ' ' + startTimeObj.getDate() + ', ' + startTimeObj.getFullYear()
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
            selected_day: e.target.name,
        })
        this.props.localUpdate('global', startTimeObj, endTimeObj)
    }

    daysInMonth(iMonth, iYear) {
        return 32 - new Date(iYear, iMonth, 32).getDate();
    }

    render() {
        let self = this

        let buttons = []

        if (this.state.select == 'year') {

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
            buttons =
                <div className='yearContainer buttonContainer'>
                    {buttons}
                </div>
        }


        if (this.state.select == 'month') {
            let previous = [
                <Button onClick={self.updateYear}
                    className='yearButton'
                    key={this.state.selected_year}
                    name={this.state.selected_year}
                >
                    {this.state.selected_year}
                </Button>
            ]
            buttons = []
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
            let num_days = this.daysInMonth(this.state.month_tonum[this.state.selected_month], this.state.selected_year)
            let date = new Date(this.state.selected_year, this.state.month_tonum[this.state.selected_month])
            console.warn(date.getMonth())
            for (let day = 1; day < num_days; day = day + 1) {

                buttons.push(
                    <Button onClick={self.updateDay}
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

        return (
            <div className='timeBarContainer'>
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
                    {this.state.startTime}
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
