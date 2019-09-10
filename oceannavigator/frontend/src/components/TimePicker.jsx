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
      
    focusedInput: null
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
    this.fetchDates(false)
    return
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.dataset !== this.props.dataset) {
      if (prevProps.dataset === undefined) {
        this.fetchDates(false)    
      } else {
        this.fetchDates(true)
      }
      }
  }

  
  fetchDates(update) {
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
          
          let time// = this.props.date;
          
          if (update) {
            let keys = Object.keys(dates_dict)
            let value = dates_dict[keys[keys.length - 1]]
            value = value[value.length - 1]
            time = value
            this.props.onTimeUpdate('time', time)
          } else {
            time = this.props.date;
          }
          
          let endhour = time.format('HH[Z]');
          
          if (this.props.startDate === null || this.props.startDate === undefined) {
            let startTime = time.valueOf();
            startTime = moment(startTime)
            startTime.tz('GMT')
            // Get Hour of Time (This is used for replacement on date change)
            //let starthour = startTime.format('HH[Z]');
            // Set the startDate 24 days before the endDate
            startTime = startTime.subtract(24, "days");
            
            
            if (this.state.dates.includes(startTime.format('YYYY-MM-DD'))) {
              this.props.onTimeUpdate('starttime', startTime);
              let starthour = startTime.format('HH[Z]')
              this.setState({
                starthour: starthour,
                endhour: endhour,
              });
            } else {
              for (let i = 24; i >= 0; i = i-1) {
                startTime.add(1, 'days');
                if (this.state.dates.includes(startTime.format('YYYY-MM-DD'))) {
                  this.props.onTimeUpdate('starttime', startTime);
                  let starthour = startTime.format('HH[Z]')
                  // Store hours for later use
                  this.setState({
                    starthour: starthour,
                    endhour: endhour,
                  });
                  break;
                }
              }
            }
          } else { 
            let startTime = this.props.startDate
            let startHour = startTime.format('HH[Z]')
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
  }

  rangeUpdate(dates) {
  
    let startDate = dates.startDate; //new Date(dates.startDate);
    let endDate = dates.endDate;//new Date(dates.endDate);
    
    // Prev Time Used to Retrieve Hour
    let prevStart = this.props.startDate;
    let prevEnd = this.props.date;
  
    /* START DATE */
    // Set to UTC
    startDate.tz('GMT');
    // Apply Correct Hour
    startDate.set({
      hour: prevStart.get('hour')
    });
      
    // Save Date Changes
    if ('startid' in this.props) {
      this.props.onTimeUpdate(this.props.startid, startDate);
    } else {
      this.props.onTimeUpdate('starttime', startDate);
    }

    /* END DATE */
    if (endDate !== null) {
      endDate.tz('GMT');
      endDate.set({
        hour: prevEnd.get('hour')
      });
      if ('id' in this.props) {
        this.props.onTimeUpdate(this.props.id, endDate);
      } else {
        this.props.onTimeUpdate('time', endDate);
      }
    }  
  }

  singleUpdate(date) {
    if (this.props.quantum === 'day' || this.props.quantum === 'month') {
      //date = new Date(date);
      //date.setHours(0);
      date.tz('GMT')
      date.set({
        hour: 0,
      })
      this.props.onTimeUpdate(date);
    } else {
      this.props.onTimeUpdate(date);
    }
    
  }

  singleHourUpdate(key, value) {
    
    let int_value = parseInt(value.substring(0, value.length - 1))
    let date;

    switch(key) {
      // End Date / Single Date
      case 'endHour':
        
        this.setState({
          endHour: value,
        })

        date = moment(this.props.date.valueOf());
        date.tz('GMT')
        date.set({
          hour: int_value,
        })
        
        this.props.onTimeUpdate(moment(date.valueOf()));
        break;

        // Start Date
      case 'startHour':
        
        this.setState({
          startHour: value,
        })

        date = moment(this.props.startDate.valueOf())
        date.tz('GMT')
        date.set({
          hour: int_value,
        })
        date.tz('GMT')
        this.props.onTimeUpdate(moment(date.valueOf()));
        break;
      }
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
    
    if (this.props.range && this.props.startDate !== null) {
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
      if (this.props.quantum === 'hour') {
        let hours_available = this.findHours(this.props.date)
        picker.push(<div className='hour_container'>
          <IceComboBox
          data={hours_available}
          current={this.state.endHour}
          localUpdate={this.singleHourUpdate}
          key='endHour'
          className='current_hour_single range0'
          name='endHour'
        ></IceComboBox>
        <IceComboBox
          data={hours_available}
          current={this.state.startHour}
          localUpdate={this.singleHourUpdate}
          key='startHour'
          className='current_hour_single range1'
          name='startHour'
        ></IceComboBox>
        </div>  )
      }
    } else {
      picker = [<SingleDatePicker
        key='singlePicker'
        date={this.props.date}
        onDateChange={date => this.singleUpdate(date)}
        focused={this.state.focusedInput}
        onFocusChange={focusedInput => this.setState({ focusedInput: focusedInput.focused })}
        isOutsideRange={day => this.isInValidDay(day)}
      ></SingleDatePicker>]
      if (this.props.quantum === 'hour' && this._mounted) {
        let hours_available = this.findHours(this.props.date)
        picker.push(<IceComboBox
          data={hours_available}
          current={this.state.current_hour}
          localUpdate={this.singleHourUpdate}
          key='endHour'
          className='current_hour_single'
          name='endHour'
        ></IceComboBox>)
      }
    }
    
    return (
      <div>
        <h1 style={{fontWeight: 'bold'}}>Time (UTC)</h1>
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
