
import React from "react";
import {NavItem} from "react-bootstrap";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");
const currentLanguage = require("../currentLanguage.js");

export default class ToggleLanguage extends React.PureComponent {

  constructor(props) {
    super(props);

    this.state = {
      toggleState: true,
    };

    this.toggleUpdate = this.toggleUpdate.bind(this);
  }

  toggleUpdate(e) {

    this.setState({
      toggleState: !this.state.toggleState,
    });

    const language =  this.state.toggleState ? "fr" : "en";
    i18n.changeLanguage(language);
    currentLanguage.language = language;

    this.props.updateLanguage();
  }

  render() {

    let languageText = "Français";
    if (!this.state.toggleState) {
      languageText = "English";
    }

    return (
      <NavItem
        onClick={this.toggleUpdate}
      >
        {languageText}
      </NavItem>
    );

  }
}

//***********************************************************************
ToggleLanguage.propTypes = {
  rightButton: PropTypes.string,
  leftButton: PropTypes.string,
  updateLanguage: PropTypes.func,
};