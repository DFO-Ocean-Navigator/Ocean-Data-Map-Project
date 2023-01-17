import React from "react";
import PropTypes from "prop-types";
import { Card } from "react-bootstrap";

import Icon from "./Icon.jsx";
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
      <Card 
        id={this.props.id}
        expanded={this.state.open}
        onToggle={() => {}}
        variant='primary'
      >
        <Card.Heading onClick={() => this.setState({open: !this.state.open})}>
          <div style={{ display: "flex", justifyContent: "space-between" }}> 
            <Card.Title>{this.props.title}</Card.Title>
            <Icon icon={this.state.panelIcon}/>  
          </div>
        </Card.Heading>
        <Card.Collapse 
          onEntering={() => {this.setState({panelIcon: "angle-up"})}}
          onExiting={() => {this.setState({panelIcon: "angle-down"})}}
        >
          <Card.Body>
            {this.props.content}
          </Card.Body>
        </Card.Collapse>
      </Card>
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
