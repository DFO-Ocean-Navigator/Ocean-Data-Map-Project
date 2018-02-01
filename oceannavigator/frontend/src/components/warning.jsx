import React from "react";
import ReactDOM from "react-dom";
import {Alert, DropdownButton, MenuItem, Link, Button} from "react-bootstrap";
import Icon from "./Icon.jsx";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");

export default class WarningBar extends React.Component {
  constructor(props) {
    super(props);

    this.handleDismiss = this.handleDismiss.bind(this);

    this.state = {
      show: true
    };
  }

  handleDismiss() {
    this.setState({ show: false });
  }

  render() {
    if(this.state.show){
      return (
        
            <Alert bsStyle="warning" onDismiss={this.handleDismiss}>
              Please note we have found a bug related to velocity representation on the Ocean Navigator 
              (in particular with direction). We are working on a correction. 
              You may <Button bsStyle="link" onClick={this.props.showWarningInfo}>click here</Button> 
              for further detail. 
            </Alert>
            
      );
    }
    return(<div></div>);
  }
}

//***********************************************************************
WarningBar.propTypes = {
  showWarningInfo: PropTypes.func,
};

