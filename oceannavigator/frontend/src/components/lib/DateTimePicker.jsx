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
    let label = null;
    if (this.props.label) {
      label = <h2>{this.props.label}</h2>;
    }

    return (
      <>
        {label}
        
        <DatePicker
          selected={this.props.selected}
          minDate={this.props.minDate}
          maxDate={this.props.maxDate}
          includeDates={this.props.includeDates}
          onChange={(value) => {
            this.props.onChange(this.props.id, value);
          }}
          showTimeSelect={this.showTimeSelect}
          showMonthYearDropdown={this.showMonthYearPicker}
          inline={this.props.inline}
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
  includeDates: PropTypes.array,
  inline: PropTypes.bool,
};

DateTimePicker.defaultProps = {
  inline: false,
};

export default DateTimePicker;
