/*eslint no-unused-vars: ["error", {"varsIgnorePattern": "jQuery" }]*/
import React from "react";
import $ from "jquery";
import jQuery from "jquery";
import PropTypes from "prop-types";

import "jquery-ui-css/base.css";
import "jquery-ui-css/datepicker.css";
import "jquery-ui-css/theme.css";
import "jquery-ui/datepicker";
import "jquery-ui/button";

class ContinousTimePicker extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
    };
  }
  populate(props) {
    const min = props.min;
    const max = props.max;

    $(this.refs.picker).datepicker({
      Button: false,
      dateFormat: "dd MM yy",
      onClose: this.pickerChange.bind(this),
    });

    if (min != null && min != undefined) {
      $(this.refs.picker).datepicker("option", "minDate", min);
    }
    if (max != null && min != undefined) {
      $(this.refs.picker).datepicker("option", "maxDate", max);
    }
  }
  componentDidMount() {
    this.populate(this.props);
  }
  componentWillReceiveProps(nextProps) {
    if (nextProps.url != this.props.url ||
            nextProps.min != this.props.min ||
            nextProps.max != this.props.max) {
      this.populate(nextProps);
    }
  }
  pickerChange() {
    if (this.refs.picker != null) {
      this.props.onUpdate(this.props.id, new Date(this.refs.picker.value));
    }
  }
  render() {
    let date = this.props.state;
    if (date == undefined || date == null) {
      date = new Date();
    } else if (!(date instanceof Date)) {
      date = new Date(date);
    }

    return (
      <div key={this.props.url} className='ContinousTimePicker input'>
        <h1>{this.props.title}</h1>
        <input readOnly ref='picker' type="text" value={$.datepicker.formatDate("dd MM yy", date)} />
      </div>
    );
  }
}

//***********************************************************************
ContinousTimePicker.propTypes = {
  title: PropTypes.string,
  state: PropTypes.instanceOf(Date),
  onUpdate: PropTypes.func,
  id: PropTypes.string,
  min: PropTypes.instanceOf(Date),
  max: PropTypes.instanceOf(Date),
};

export default ContinousTimePicker;
