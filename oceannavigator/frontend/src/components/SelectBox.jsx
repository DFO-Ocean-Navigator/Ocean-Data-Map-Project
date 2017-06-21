import React from "react";
import {Checkbox} from "react-bootstrap";

class SelectBox extends React.Component {
  handleChange(e) {
    this.props.onUpdate(this.props.id, e.target.checked);
  }
  
  render() {
    return (
        <Checkbox
          id={this.props.id} 
          onChange={this.handleChange.bind(this)}
          checked={this.props.state}
        >
          {this.props.title}
        </Checkbox>
    );
  }
}

export default SelectBox;

