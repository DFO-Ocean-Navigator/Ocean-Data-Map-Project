import React from "react";
import PropTypes from "prop-types";
import { Panel } from "react-bootstrap";

import Icon from "./Icon";
import { withTranslation } from "react-i18next";

export class Accordion extends React.Component { 
  constructor(props) {
    super(props);

    this.state = {
      open: false,
      panelIcon: "angle-down"
    };
  };

  render() {
    return (
      <Panel 
        id={this.props.id}
        expanded={this.state.open}
        onToggle={}
        bsStyle='primary'
      >
        <Panel.Heading onClick={() => this.setState({open: !this.state.open})}>
          <div style={{ display: "flex", justifyContent: "space-between" }}> 
            <Panel.Title>{this.props.title}</Panel.Title>
            <Icon icon={this.state.panelIcon}/>  
          </div>
        </Panel.Heading>
        <Panel.Collapse 
          onEntering={() => {this.setState({panelIcon: "angle-up"})}}
          onExiting={() => {this.setState({panelIcon: "angle-down"})}}
        >
          <Panel.Body>
            {this.props.content}
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    );    
  }
};

//***********************************************************************
Accordion.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  content: PropTypes.node.isRequired,
};

export default withTranslation()(Accordion);
