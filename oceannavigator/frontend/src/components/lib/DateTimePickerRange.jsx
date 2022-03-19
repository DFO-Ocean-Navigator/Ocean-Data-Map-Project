import React from "react";
import PropTypes from "prop-types";

import DateTimePicker from "./DateTimePicker";

import { withTranslation } from "react-i18next";

class DateTimePickerRange extends React.PureComponent {

  randomString() {
    Math.random().toString(36).substring(2, 5)
  }

  render() {
    _("Start Time (UTC)");
    _("End Time (UTC)");

    return (
      <>
        <DateTimePicker
          key={`datetimepickerrange-starttime-${this.randomString()}`}
          id='starttime'
          quantum={this.props.quantum}
          selected={this.props.selectedStart}
          minDate={this.props.minDate}
          maxDate={this.props.selectedEnd}
          onChange={this.props.onChange}
          label={_("Start Time (UTC)")}
        />

        <DateTimePicker
          key={`datetimepickerrange-endtime-${this.randomString()}`}
          id='time'
          quantum={this.props.quantum}
          selected={this.props.selectedEnd}
          minDate={this.props.selectedStart}
          maxDate={this.props.maxDate}
          onChange={this.props.onChange}
          label={_("End Time (UTC)")}
        />
      </>
    );
  }
}

//***********************************************************************
DateTimePickerRange.propTypes = {
  quantum: PropTypes.string.isRequired,
  selectedStart: PropTypes.number.isRequired,
  selectedEnd: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  minDate: PropTypes.string,
  maxDate: PropTypes.string,
};

export default withTranslation()(DateTimePickerRange);
