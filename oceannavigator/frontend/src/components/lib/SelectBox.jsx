import React from "react";
import { FormGroup, ControlLabel, FormControl } from "react-bootstrap";
import PropTypes from "prop-types";

const fastEqual = require("fast-deep-equal/es6/react");
const i18n = require("../../i18n.js"); // lgtm [js/unused-local-variable]

export default class SelectBox extends React.Component {
  shouldComponentUpdate(nextProps) {
    return !fastEqual(this.props, nextProps);
  }

  render() {
    let options = null;
    if (this.props.options) {
      options = this.props.options.map((option) => {
        return (
          <option
            key={`option-${option.id}`}
            value={option.id}
          >
            {option.value}
          </option>
        );
      });
    }

    const disabled = !Array.isArray(this.props.options) ||
                     !this.props.options.length;

    return (
      <FormGroup controlid={`formgroup-${this.props.id}-selectbox`}>
        <ControlLabel>{this.props.label}</ControlLabel>
        <FormControl
          componentClass="select"
          name={this.props.name}
          placeholder={disabled ? _("Loading...") : this.props.placeholder}
          onChange={(e) => this.props.onChange(e.target.name, e.target.value)}
          disabled={disabled}
          value={this.props.selected}
        >
          {options}
        </FormControl>
      </FormGroup>
    );
  }
}

//***********************************************************************
SelectBox.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.object).isRequired,
  selected: PropTypes.string.isRequired,
};