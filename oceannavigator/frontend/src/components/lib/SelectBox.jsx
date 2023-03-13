import React from "react";
import { Form, Row, Col } from "react-bootstrap";
import PropTypes from "prop-types";

import { withTranslation } from "react-i18next";

const fastEqual = require("fast-deep-equal/es6/react");

export class SelectBox extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      showHelp: false,
    };

    this.toggleShowHelp = this.toggleShowHelp.bind(this);
  }

  toggleShowHelp() {
    this.setState((prevState) => ({
      showHelp: !prevState.showHelp,
    }));
  }

  shouldComponentUpdate(nextProps, nextState) {
    return (
      !fastEqual(this.props, nextProps) || !fastEqual(this.state, nextState)
    );
  }

  render() {
    let options = null;
    if (this.props.options) {
      options = this.props.options.map((option) => {
        return (
          <option key={`option-${option.id}`} value={option.id}>
            {option.value}
          </option>
        );
      });
    }

    const disabled =
      this.props.loading ||
      !Array.isArray(this.props.options) ||
      !this.props.options.length;

    const formLayout = this.props.horizontalLayout ? Row : Col;

    return (
      <Form.Group
        controlid={`formgroup-${this.props.id}-selectbox`}
        as={formLayout}
      >
        <Form.Label column>{this.props.label}</Form.Label>
        <Form.Select
          name={this.props.name}
          placeholder={disabled ? "Loading..." : this.props.placeholder}
          onChange={(e) => {
            if (this.props.multiple) {
              this.props.onChange(e.target.name, e.target.selectedOptions);
            } else {
              this.props.onChange(e.target.name, e.target.value);
            }
          }}
          disabled={disabled}
          value={this.props.selected}
          multiple={this.props.multiple}
          className={
            this.props.horizontalLayout
              ? "form-select-hotizontal"
              : "form-select"
          }
        >
          {options}
        </Form.Select>
      </Form.Group>
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
  selected: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.arrayOf(PropTypes.string),
  ]).isRequired,
  multiple: PropTypes.bool,
  helpContent: PropTypes.arrayOf(PropTypes.object),
  horizontalLayout: PropTypes.bool,
};

SelectBox.defaultProps = {
  multiple: false,
  helpContent: null,
  horizontalLayout: false,
};

export default withTranslation()(SelectBox);
