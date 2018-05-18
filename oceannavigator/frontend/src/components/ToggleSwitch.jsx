
import React, {Component} from "react";
import {Button} from "react-bootstrap";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");
const currentLanguage = require("../currentLanguage.js");

export default class ToggleSwitch extends Component {

  constructor(props) {
    super(props);

    this.state = {
      toggleState: true,
    };

    this.toggleUpdate = this.toggleUpdate.bind(this);
  }

  toggleUpdate(e) {

    if (e.target.id === "button1" && !this.state.toggleState) {
      this.setState({
        toggleState: true,
      });
      i18n.changeLanguage("en");
      currentLanguage.language = "en";
    }

    if (e.target.id === "button2" && this.state.toggleState) {
      this.setState({
        toggleState: false,
      });
      i18n.changeLanguage("fr");
      currentLanguage.language = "fr";
    }
    this.props.updateLanguage();
    
  }

  render() {

    const button1 = [
      <Button
        key='button1'
        id='button1'
        onClick={this.toggleUpdate}
      >{this.props.leftButton}</Button>
    ];

    const button2 = [
      <Button
        key="button2"
        id='button2'
        onClick={this.toggleUpdate}
      >{this.props.rightButton}</Button>
    ];

    const toggleButton = [button1, button2];

    return (
      <div>
        {toggleButton}
      </div>
    );

  }
  
}


ToggleSwitch.propTypes = {
  rightButton: PropTypes.string,
  leftButton: PropTypes.string,
  updateLanguage: PropTypes.func,
};