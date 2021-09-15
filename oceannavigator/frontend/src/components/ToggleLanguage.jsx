
import React from "react";
import {NavItem} from "react-bootstrap";
import PropTypes from "prop-types";

import { withTranslation } from "react-i18next";

class ToggleLanguage extends React.PureComponent {

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

    const language =  this.state.toggleState ? "fr" : "en-CA";
    this.props.i18n.changeLanguage(language);
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
};

export default withTranslation()(ToggleLanguage);
