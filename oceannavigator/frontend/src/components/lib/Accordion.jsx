import React from "react";
import PropTypes from "prop-types";

import Icon from "./Icon";
import { withTranslation } from "react-i18next";

export class Accordion extends React.Component { 
  constructor(props) {
    super(props);

    this.state = {
      isActive: false
    }
  };

  render() {
    const buttonIcon = this.state.isActive ? "angle-up" :  "angle-down"

    return (
      <div className="accordion">
        <div className="accordion-item">
          <div className="accordion-title" onClick={() => this.setState(prevState => ({isActive: !prevState.isActive}))}>
            <div>{this.props.title}</div>
            <Icon icon={buttonIcon}/>
          </div>
          {this.state.isActive && <div className="accordion-content">{this.props.content}</div>}
        </div>
      </div>
    );    
  }
};

//***********************************************************************
Accordion.propTypes = {
  title: PropTypes.string.isRequired,
  content: PropTypes.node.isRequired,
};

export default withTranslation()(Accordion);
