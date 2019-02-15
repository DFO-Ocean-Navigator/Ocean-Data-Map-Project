import React from "react";
import ComboBox from "./ComboBox.jsx";
import Range from "./Range.jsx";
import SelectBox from "./SelectBox.jsx";
import IceDatasetSelector from "./IceDatasetSelector.jsx";
import {Panel, Button, Row, Col, Tabs, Tab} from "react-bootstrap";
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

    let today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth();
    let day = today.getDay();

    this.state = {
        years: [2000,2001,2002,2003,2004,2005,2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018,2019],
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
    
        select: 'year',

        current_year: year,
        current_month: month,
        current_day: day,
    }
    this.updateYear = this.updateYear.bind(this);
    this.updateMonth = this.updateMonth.bind(this);
    this.updateDay = this.updateDay.bind(this);
    this.daysInMonth = this.daysInMonth.bind(this);
    //this.getYears = this.getYears.bind(this);
  }
/*
  componentDidMount() {
    this.setState({
        years: getYears(),
    })
  }

  getYears () {
    console.warn("TO IMPLEMENT")
  }
  */

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
    console.warn("SELECTED MONTH: ", e.target.name)

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
    if (this.state.select === 'day') {
        this.setState({
            select: '',
            selected_day: e.target.name,
        })
    }
  }

  daysInMonth(iMonth, iYear)
  {
      return 32 - new Date(iYear, iMonth, 32).getDate();
  }

  render() {
    let self = this

    let buttons = []
    
    if (this.state.select == 'year') {
        
        this.state.years.forEach( function(year) {
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
        let previous =  [
            <Button onClick={self.updateYear}
                    className='yearButton'
                    key={this.state.selected_year}
                    name={this.state.selected_year}
                >
                    {this.state.selected_year}
            </Button>
        ]
        buttons = []
        this.state.months.forEach( function(month) {
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
            onClick={() => {this.setState({select: 'year'})}}
          >
          {this.state.startTime}
          </Button>
          {buttons}
          <Button 
            className='endTimeContainer'
            onClick={() => {this.setState({select: 'year'})}}  
          >
          {this.state.endTime}
          </Button>
        </div>
    );
  }
}

//***********************************************************************
TimeSelect.propTypes = {
    setStartTime: PropTypes.func,
    setEndTime: PropTypes.func,
};
