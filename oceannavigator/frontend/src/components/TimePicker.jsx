/* eslint react/no-deprecated: 0 */

import React from "react";
import $ from "jquery";
/*eslint no-unused-vars: ["error", {"varsIgnorePattern": "jQuery" }]*/
import jQuery from "jquery";
import dateFormat from "dateformat";
import {Button} from "react-bootstrap";
import Icon from "./Icon.jsx";
import PropTypes from "prop-types";
import { DateRangePicker, SingleDatePicker, DayPickerRangeController } from 'react-dates';
import 'react-dates/initialize'
import 'react-dates/lib/css/_datepicker.css';
import moment from "moment-timezone";
import IceComboBox from "./IceComboBox.jsx";
import "jquery-ui-css/base.css";
import "jquery-ui-css/datepicker.css";
import "jquery-ui-css/theme.css";
import "jquery-ui/datepicker";
import "jquery-ui/button";
import "jquery-ui-month-picker/MonthPicker.css";
import "jquery-ui-month-picker/MonthPicker.js";
import "jquery-ui/../i18n/datepicker-fr.js";
import "jquery-ui/../i18n/datepicker-fr-CA.js";

const i18n = require("../i18n.js");
 
export default class TimePicker extends React.Component {
  constructor(props) {
    super(props);

    // Track if mounted to prevent no-op errors with the Ajax callbacks.
    this._mounted = false;
    
    this.state = {
      times: [],
      
      focusedInput: {
        focused: false
      }
    };

    // Function bindings
    this.isInValidDay = this.isInValidDay.bind(this);
    this.rangeUpdate = this.rangeUpdate.bind(this);
    this.singleUpdate = this.singleUpdate.bind(this);
    this.singleHourUpdate = this.singleHourUpdate.bind(this);
    this.parseDate = this.parseDate.bind(this);
    this.focusChange = this.focusChange.bind(this);
    this.findHours = this.findHours.bind(this);
    this.fetchDates = this.fetchDates.bind(this);
  }

  parseDate(value) {
    let test_value = moment.tz(value, "GMT")
    return test_value
  }

  componentDidMount() {
    this.fetchDates()
    return
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.dataset !== this.props.dataset) {
      this.fetchDates()
    }
  }

  
  fetchDates() {
    console.warn("TIME IN PICKER: ", this.props.date)
    $.ajax({
      url: '/api/timestamps/?dataset=' + this.props.dataset + '&quantum=' + this.props.quantum,
      format: 'json',
      cache: true,
      success: function (response) {
        let dates = [];
        let dates_dict = {};
        
        let date_value;
        for (let date in response) {

          //Create moment object from ISO8601 extended string
          let m = moment.tz(response[date]['value'], 'GMT');
          
          //Create a truncated string
          let utc_m = m.format('YYYY-MM-DD');
          
          //Push data to new state
          dates.push(utc_m);
          if (utc_m in dates_dict) {
            dates_dict[utc_m].push(m);
          } else {
            dates_dict[utc_m] = [m];
          }
          
        }
        
        this.setState({
          dates_dict: dates_dict,
          dates: dates
        },  () => {
          
          
          
          let time = this.props.date;
          let endhour = time.format('HH[Z]');
          
          if (this.state.startDate !== null) {
            let startTime = this.props.date.valueOf();
            startTime = moment.tz(startTime, "GMT")
            let starthour = startTime.format('HH[Z]');
            startTime.subtract(24, 'days');
            
            
            if (this.state.dates.includes(startTime)) {
              //startTime.setUTCMonth(startTime.getUTCMonth() + 1);
              this.props.onTimeUpdate('starttime', startTime);
              this.setState({
                startTime: startTime,
                starthour: starthour,
                endhour: endhour,
              });
            } else {
              for (let i = 23; i > 0; i = i-1) {
                startTime.add(1, 'days');
                if (this.state.dates.includes(startTime)) {
                  //startTime.setUTCMonth(startTime.getUTCMonth() + 1);
                  this.props.onTimeUpdate('starttime', startTime);
                  this.setState({
                    startTime: startTime,
                    starthour: starthour,
                    endhour: endhour,
                  });
                }
              }
            }
          } else {
            let startHour = this.props.startDate.get('hour')
            this.setState({
              startTime: this.props.startDate,
              starthour: startHour,
              endhour: endhour 
            })
          }
          
          
        })
        this._mounted = true;
        
      }.bind(this)
    })
    console.warn("TIME AT END OF FETCH: ", this.props.date)
    
  }

  rangeUpdate(dates) {
    let startDate = dates.startDate; //new Date(dates.startDate);
    let endDate = dates.endDate;//new Date(dates.endDate);
    
    let prevStart = this.props.startDate;//new Date(this.props.startDate);
    let prevEnd = this.props.date//new Date(this.props.date);
    
    startDate.set({
      hour: prevStart.get('hour')
    })
    endDate.set({
      hour: prevEnd.get('hour')
    })
    //startDate.setUTCHours(prevStart.getUTCHours());
    //endDate.setUTCHours(prevEnd.getUTCHours());
    
    if (this.props.includes('startid')) {
      this.props.onTimeUpdate(this.props.startid, startDate);
    } else {
      this.props.onTimeUpdate('starttime', startDate);
    }

    if (this.props.includes('id')) {
      this.props.onTimeUpdate(this.props.id, endDate);
    } else {
      this.props.onTimeUpdate('time', endDate);
    }
  }

  updateRangeHour(startHour, endHour) {
    return
  }

  singleUpdate(date) {
    if (this.props.quantum === 'day' || this.props.quantum === 'month') {
      //date = new Date(date);
      //date.setHours(0);
      date.set({
        hour: 0,
      })
      console.warn("UPDATE FORMATTED DATE: ", date.format("YYYY/MM/DD[T]HH"))
      this.props.onTimeUpdate(date);
    } else {
      this.props.onTimeUpdate(date);
    }
    
  }

  singleHourUpdate(key, value) {
    console.warn("KEY: ", key)

    let int_value = parseInt(value.substring(0, value.length - 1))
    console.warn("VALUE: ", value)
    
    let date;

    switch(key) {
      // End Date / Single Date
      case 'endHour':
        
        this.setState({
          endHour: value,
        })

        date = this.props.date;
        date.set({
          hour: int_value,
        })
        console.warn("DATE: ", date)
        console.warn("DATE BEFORE CHANGE: ", date.format("YYYY/MM/DD[T]HH"))
        this.props.onTimeUpdate(date);
        break;
      // Start Date
      case 'startHour':
        
        this.setState({
          startHour: value,
        })

        date = this.props.startDate
        date.set({
          hour: int_value,
        })  
        console.warn("DATE: ", date)
        this.props.onTimeUpdate(date);
        break;
      }
    
    //let dif = value - date.get('hour')
    //console.warn("DIF: ", dif)
    //date.add(dif, 'hours')
    
    /*date.set({
      hour: value
    })*/
    
    }


  /*
    Returns false if the day exists in the dataset
  */
  isInValidDay(day) {
    let utc_day = day.format('YYYY-MM-DD');
    if (utc_day in this.state.dates_dict) {
      return false;
    } else {
      return true;
    }
  }

  focusChange(focusedInput) {
    this.setState({focusedInput});
  }

  findHours(date) {
    if (this.state.dates_dict === undefined) {
      return
    }
    let formatted = date.format('YYYY-MM-DD')
  
    // Confirm the date exists in the dataset
    if (formatted in this.state.dates_dict) {
      let available_hours = [];
      
      let dates = this.state.dates_dict[formatted];
      
      // Loop through all the timestamps on the requested day
      for (let val in dates) {
        let hour = dates[val].format('HH[Z]')
        
        let temp_dict = {
          id: hour,
          value: hour,
        }
        available_hours.push(temp_dict)
      }
      return available_hours;
    } else { 
      return []
    }
  }

  

  render() {
    
    var picker = null;
    
    if (this.props.range) {
      picker = [<DateRangePicker
        key='rangePicker'
        startDateId='starttime'
        startDate={this.props.startDate}
        endDateId='date'
        endDate={this.props.date}
        onDatesChange={this.rangeUpdate}
        focusedInput={this.state.focusedInput}
        onFocusChange={focusedInput => this.focusChange(focusedInput)
        }
        isOutsideRange={day => this.isInValidDay(day)}
      ></DateRangePicker>]
      if (this.props.quantum === 'hour' && this._mounted) {
        let hours_available = this.findHours(this.props.date)
        picker.push(<IceComboBox
          data={hours_available}
          current={this.state.endHour}
          localUpdate={this.onUpdate}
          key='current_hour0'
          className='current_hour_single range0'
          name='endHour'
        ></IceComboBox>)
  
        picker.push(<IceComboBox
          data={hours_available}
          current={this.state.startHour}
          localUpdate={this.onUpdate}
          key='current_hour1'
          className='current_hour_single range1'
          name='startHour'
        ></IceComboBox>)  
      }
      
    } else {
      picker = [<SingleDatePicker
        key='singlePicker'
        date={this.props.date}
        onDateChange={date => this.singleUpdate(date)}
        focused={this.state.focusedInput['focused']}
        onFocusChange={focusedInput => this.setState({ focusedInput })}
        isOutsideRange={day => this.isInValidDay(day)}
        
      ></SingleDatePicker>]
      if (this.props.quantum === 'hour' && this._mounted) {
        let hours_available = this.findHours(this.props.date)
        picker.push(<IceComboBox
          data={hours_available}
          current={this.state.current_hour}
          localUpdate={this.singleHourUpdate}
          key='current_hour'
          className='current_hour_single'
          name='current_hour'
        ></IceComboBox>)
      }
    }
    
    return (
      <div>
        {picker}
      </div>
    );
  }
}

//***********************************************************************
TimePicker.propTypes = {
  range: PropTypes.bool,
  dataset: PropTypes.string,
  quantum: PropTypes.string,
  onTimeUpdate: PropTypes.func,
};
