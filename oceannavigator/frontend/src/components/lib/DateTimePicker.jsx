import React from "react";
import DatePicker from "react-datepicker";
import PropTypes from "prop-types";

import "react-datepicker/dist/react-datepicker.css";

class DateTimePicker extends React.PureComponent {

  showTimeSelect() {
    return this.props.quantum === "hour";
  }

  showMonthYearPicker() {
    return this.props.quantum === "month";
  }


  render() {
    return (
      <>
        <h2>{this.props.label}</h2>
        
        <DatePicker
          selected={this.props.selected}
          minDate={this.props.minDate}
          maxDate={this.props.maxDate}
          onChange={(value) => {
            this.props.onChange(this.props.id, value);
          }}
          showMonthYearDropdown={this.showMonthYearPicker}
        />
      </>
    );
  }
}

//***********************************************************************
DateTimePicker.propTypes = {
  id: PropTypes.string.isRequired,
  quantum: PropTypes.string.isRequired,
  selected: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string,
  minDate: PropTypes.string,
  maxDate: PropTypes.string,
};

export default DateTimePicker;
