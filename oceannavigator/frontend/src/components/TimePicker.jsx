/* eslint react/no-deprecated: 0 */

import React from "react";
import $ from "jquery";
/*eslint no-unused-vars: ["error", {"varsIgnorePattern": "jQuery" }]*/
import jQuery from "jquery";
import dateFormat from "dateformat";
import { Button } from "react-bootstrap";
import Icon from "./lib/Icon.jsx";
import PropTypes from "prop-types";

import "jquery-ui-css/base.css";
import "jquery-ui-css/datepicker.css";
import "jquery-ui-css/theme.css";
import "jquery-ui/datepicker";
import "jquery-ui/button";
import "jquery-ui-month-picker/MonthPicker.css";
import "jquery-ui-month-picker/MonthPicker.js";
import "jquery-ui/../i18n/datepicker-fr.js";
import "jquery-ui/../i18n/datepicker-fr-CA.js";

import { GetTimestampsPromise } from "../remote/OceanNavigator.js";

import { withTranslation } from "react-i18next";

class TimePicker extends React.Component {
  constructor(props) {
    super(props);

    // Track if mounted to prevent no-op errors with the Ajax callbacks.
    this._mounted = false;

    this.state = {
      data: [],
      map: {},
      revmap: {},
      times: [],
      min: 0,
      max: 0,
      value: 0 // Currently selected date
    };

    // Function bindings
    this.timeChange = this.timeChange.bind(this);
    this.pickerChange = this.pickerChange.bind(this);
    this.nextTime = this.nextTime.bind(this);
    this.prevTime = this.prevTime.bind(this);
    this.getMinMaxTimestamps = this.getMinMaxTimestamps.bind(this);
    this.getNextTimestamp = this.getNextTimestamp.bind(this);
    this.getPrevTimestamp = this.getPrevTimestamp.bind(this);
    this.getTimestampFromIndex = this.getTimestampFromIndex.bind(this);
    this.getIndexFromTimestamp = this.getIndexFromTimestamp.bind(this);
  }

  componentDidMount() {
    this._mounted = true;
    this.populate(this.props);
  }

  componentWillUnmount() {
    this._mounted = false;
  }

  getIndexFromTimestamp(timestamp) {
    const keys = Object.keys(this.state.map);
    return keys.indexOf(timestamp.toString());
  }

  getTimestampFromIndex(index) {
    const keys = Object.keys(this.state.map);
    if (index < 0) {
      return keys[keys.length + index];
    }

    return keys[index];
  }

  getMinMaxTimestamps(props, data) {
    let min = data[0].id;
    let max = data[data.length - 1].id;

    if ("min" in props) {
      min = this.getNextTimestamp(parseInt(props.min));
    }
    if ("max" in props) {
      max = this.getPrevTimestamp(parseInt(props.max));
    }

    if (!min) {
      min = data[0].id;
    }
    if (!max) {
      max = data[data.length - 1].id;
    }

    return [min, max];
  }

  getNextTimestamp(timestamp) {
    const keys = Object.keys(this.state.map);
    const nextIndex = keys.indexOf(timestamp.toString()) + 1;
    return keys[nextIndex];
  }

  getPrevTimestamp(timestamp) {
    const keys = Object.keys(this.state.map);
    const prevIndex = keys.indexOf(timestamp.toString()) - 1;
    return keys[prevIndex];
  }

  populate(props) {
    // eslint-disable-next-line max-len
    GetTimestampsPromise(props.dataset, props.variable).then(timestampResult => {
      const data = timestampResult.data;

      let map = {};
      let revmap = {};

      for (let i = 0; i < data.length; ++i) {
        const d1 = new Date(data[i].value);
        const d2 = new Date(d1.getTime() + d1.getTimezoneOffset() * 60000);
        let d3 = d2;
        if (this.props.quantum !== "hour") {
          d3 = new Date(
            Date.UTC(
              d1.getUTCFullYear(),
              d1.getUTCMonth(),
              d1.getUTCDate(),
              0,
              0,
              0,
              0
            )
          );
        }
        map[data[i].id] = d2;
        revmap[d3.toUTCString()] = data[i].id;
      }

      const [min, max] = this.getMinMaxTimestamps(props, data);

      this.setState(
        {
          data: data,
          map: map,
          revmap: revmap,
          min: min,
          max: max
        },
        () => {
          switch (props.quantum) {
            case "month":
              $(this.refs.picker).MonthPicker({
                Button: false,
                MonthFormat: "MM yy",
                OnAfterMenuClose: this.pickerChange,
                MinMonth: new Date(
                  map[min].getTime() +
                  map[min].getTimezoneOffset() * 60 * 1000
                ),
                MaxMonth: new Date(
                  map[max].getTime() +
                  map[max].getTimezoneOffset() * 60 * 1000
                ),
                i18n: {
                  year: _("Year"),
                  prevYear: _("Previous Year"),
                  nextYear: _("Next Year"),
                  next12Years: _("Jump Forward 12 Years"),
                  prev12Years: _("Jump Back 12 Years"),
                  nextLabel: _("Next"),
                  prevLabel: _("Prev"),
                  buttonText: _("Open Month Chooser"),
                  jumpYears: _("Jump Years"),
                  backTo: _("Back to"),
                  months: [
                    _("Jan."),
                    _("Feb."),
                    _("Mar."),
                    _("Apr."),
                    _("May"),
                    _("June"),
                    _("July"),
                    _("Aug."),
                    _("Sep."),
                    _("Oct."),
                    _("Nov."),
                    _("Dec.")
                  ]
                }
              });
              break;
            case "hour":
              $(this.refs.picker).datepicker({
                Button: false,
                dateFormat: "dd MM yy",
                onClose: this.pickerChange,
                minDate: new Date(map[min]),
                maxDate: new Date(map[max])
              });
              $(this.refs.picker).datepicker(
                "option",
                "minDate",
                new Date(map[min])
              );
              $(this.refs.picker).datepicker(
                "option",
                "maxDate",
                new Date(map[max])
              );
              break;
            case "day":
            default:
              $(this.refs.picker).datepicker({
                Button: false,
                dateFormat: "dd MM yy",
                onClose: this.pickerChange,
                minDate: new Date(map[min]),
                maxDate: new Date(map[max])
              });

              $(this.refs.picker).datepicker(
                "option",
                "minDate",
                new Date(map[min])
              );
              $(this.refs.picker).datepicker(
                "option",
                "maxDate",
                new Date(map[max])
              );
              break;
          }
          this.pickerChange();
        }
      );
    }, error => {
      console.error(error);
    });
  }

  pickerChange() {
    const [min, max] = this.getMinMaxTimestamps(this.props, this.state.data);

    let d = null;
    if (this.props.quantum === "hour") {
      var times = [];
      d = $(this.refs.picker).datepicker("getDate");
      const isodatestr = dateFormat(d, "yyyy-mm-dd", true);

      for (let i = 0; i < this.state.data.length; ++i) {
        if (this.state.data[i].value.indexOf(isodatestr) === 0) {
          if (this.state.data[i].id <= max && this.state.data[i].id >= min) {
            times.unshift({
              id: this.state.data[i].id,
              value: dateFormat(this.state.data[i].value, "HH:MM", true)
            });
          }
        }
      }
      this.setState({
        times: times
      });

      if (times.length > 0) {
        let index = this.getIndexFromTimestamp(this.props.state);
        if (index === -1) {
          index = this.state.data.length - 1;
        }

        if (this.state.value === undefined) {
          this.props.onUpdate(this.props.id, times[0].id);
        } else if (
          this.state.data[index].value.indexOf(isodatestr) !== 0
        ) {
          this.props.onUpdate(this.props.id, times[0].id);
        }
      }
    }
    else if (this.refs.picker !== null) {

      if (this.props.quantum == "month" &&
        $.data(this.refs.picker, "KidSysco-MonthPicker")) {
        d = $(this.refs.picker).MonthPicker("GetSelectedDate");
      }
      else {
        d = $(this.refs.picker).datepicker("getDate");
      }
      if (d !== null) {
        const utcDate = new Date(
          Date.UTC(
            d.getFullYear(),
            d.getMonth(),
            this.props.quantum == "month" ? 15 : d.getDate(),
            d.getHours(),
            d.getMinutes(),
            d.getSeconds(),
            d.getMilliseconds()
          )
        );
        this.props.onUpdate(
          this.props.id,
          this.state.revmap[utcDate.toUTCString()]
        );
      }
      else {
        if (this.props.state < 0) {
          this.props.onUpdate(
            this.props.id,
            this.getTimestampFromIndex(this.props.state)
          );
        }
      }
    }
  }

  timeChange(e) {
    const value = e.target.value;
    this.setState({
      value: value
    });
    this.props.onUpdate(this.props.id, value);
  }

  nextTime() {
    const old_value = this.props.state;
    const value = this.getNextTimestamp(parseInt(this.props.state));

    this.props.onUpdate(this.props.id, value);

    this.setState(
      {
        value: value
      },
      function () {
        this.updatePicker(old_value, value);
      }.bind(this)
    );
  }

  prevTime() {
    const old_value = this.props.state;
    const value = this.getPrevTimestamp(parseInt(this.props.state));

    this.setState(
      {
        value: value
      },
      function () {
        this.updatePicker(old_value, value);
      }.bind(this)
    );

    this.props.onUpdate(this.props.id, value);
  }

  updatePicker(oldstate, newstate) {
    const old_idx = this.getIndexFromTimestamp(oldstate);
    const new_idx = this.getIndexFromTimestamp(newstate);

    if (
      this.state.data[old_idx].value.substring(0, 10) !==
      this.state.data[new_idx].value.substring(0, 10)
    ) {
      this.pickerChange();
    }
  }

  isFirstTime() {
    return parseInt(this.props.state) === this.state.min;
  }

  isLastTime() {
    return parseInt(this.props.state) === this.state.max;
  }

  render() {
    $.datepicker.setDefaults($.datepicker.regional[this.props.i18n.language]);

    const date = new Date(this.state.map[this.props.state]);
    let input = null;
    switch (this.props.quantum) {
      case "month":
        input = (
          <input
            readOnly
            ref="picker"
            type="text"
            value={$.datepicker.formatDate("MM yy", date)}
          />
        );
        break;
      case "day":
      case "hour":
        input = (
          <input
            readOnly
            ref="picker"
            type="text"
            value={$.datepicker.formatDate("dd MM yy", date)}
          />
        );
        break;
    }

    let timeinput = null;
    const options = this.state.times.map(function (t) {
      return (
        <option key={t.id} value={t.id}>
          {t.value}
        </option>
      );
    });
    if (this.props.quantum == "hour") {
      timeinput = (
        <select value={this.state.value} onChange={this.timeChange}>
          {options}
        </select>
      );
    }

    return (
      <div key={this.props.url + this.props.key} className="TimePicker input">
        <h1>{this.props.title}</h1>

        <div>
          <Button onClick={this.prevTime} disabled={this.isFirstTime()}>
            <Icon icon="caret-left" alt="<" />
          </Button>
          <div>
            {input}
            {timeinput}
          </div>
          <Button onClick={this.nextTime} disabled={this.isLastTime()}>
            <Icon icon="caret-right" alt=">" />
          </Button>
        </div>
      </div>
    );
  }
}

//***********************************************************************
TimePicker.propTypes = {
  title: PropTypes.string,
  quantum: PropTypes.string.isRequired,
  state: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onUpdate: PropTypes.func.isRequired,
  id: PropTypes.string.isRequired,
  min: PropTypes.number,
  max: PropTypes.number,
  dataset: PropTypes.string.isRequired,
  variable: PropTypes.string.isRequired,
};

export default withTranslation()(TimePicker);
