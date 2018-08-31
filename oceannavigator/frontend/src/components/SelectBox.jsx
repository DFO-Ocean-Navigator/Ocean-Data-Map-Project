import React from "react";
import {Checkbox} from "react-bootstrap";
import PropTypes from "prop-types";

export default class SelectBox extends React.PureComponent {
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
        checked={this.props.state}
        style={this.props.style}
      >
        {this.props.title}
      </Checkbox>
    );
  }
}

//***********************************************************************
SelectBox.propTypes = {
  title: PropTypes.string,
  state: PropTypes.bool,
  id: PropTypes.string,
  onUpdate: PropTypes.func,
  style: PropTypes.object,
};

