import React from "react";
import PropTypes from "prop-types";

import DateTimePicker from "./DateTimePicker";

import { withTranslation } from "react-i18next";

class DateTimePickerRange extends React.PureComponent {
  render() {
    _("Start Time (UTC)");
    _("End Time (UTC)");

    return (
      <>
        <DateTimePicker
          // eslint-disable-next-line max-len
          key={`datetimepickerrange-starttime-${Math.random().toString(36).substring(2, 5)}`}
          id='starttime'
          quantum={this.props.quantum}
          selected={this.props.selectedStart}
          minDate={this.props.minDate}
          maxDate={this.props.selectedEnd}
          onChange={this.onUpdate}
          label={_("Start Time (UTC)")}
        />

        <DateTimePicker
          // eslint-disable-next-line max-len
          key={`datetimepickerrange-endtime-${Math.random().toString(36).substring(2, 5)}`}
          id='time'
          quantum={this.props.quantum}
          selected={this.props.selectedEnd}
          minDate={this.props.selectedStart}
          maxDate={this.props.maxDate}
          onChange={this.onUpdate}
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
