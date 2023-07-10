import React from "react";
// import {Checkbox} from "react-bootstrap";
import PropTypes from "prop-types";
import Form from "react-bootstrap/Form";

export default class CheckBox extends React.PureComponent {
  constructor(props) {
    super(props);

    // Function bindings
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(e) {
    this.props.onUpdate(this.props.id, e.target.checked);
  }

  render() {
    return (
      <Form.Check
        type="checkbox"
        id={this.props.id}
        onChange={this.handleChange}
        checked={this.props.checked}
        label={this.props.title}
      />
    );
  }
}

//***********************************************************************
CheckBox.propTypes = {
  title: PropTypes.string.isRequired,
  checked: PropTypes.bool,
  id: PropTypes.string.isRequired,
  onUpdate: PropTypes.func.isRequired,
  style: PropTypes.object,
};
