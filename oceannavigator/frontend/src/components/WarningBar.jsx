import React from "react";
import {Alert, Button} from "react-bootstrap";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");

export default class WarningBar extends React.PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      show: true
    };

    // Function bindings
    this.handleDismiss = this.handleDismiss.bind(this);
  }

  handleDismiss() {
    this.setState({ show: false });
  }

  render() {
    if(this.props.showWarningInfo){
      return (
        <Alert bsStyle="warning" onDismiss={this.handleDismiss}>
              {_("The Ocean Navigator will go down for brief maintenance at 12:45 NST")}
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

