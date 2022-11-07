import React from "react";
import {Checkbox} from "react-bootstrap";
import PropTypes from "prop-types";

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
      <Checkbox
        id={this.props.id}
        onChange={this.handleChange}
        checked={this.props.checked}
        style={this.props.style}
      >
        {this.props.title}
      </Checkbox>
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
