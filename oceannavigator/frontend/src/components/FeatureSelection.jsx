import React from "react";
import ComboBox from "./ComboBox.jsx";
import Range from "./Range.jsx";
import SelectBox from "./SelectBox.jsx";
import DatasetSelector from "./DatasetSelector.jsx";
import {Checkbox, Panel, Button, Row, Col, Tabs, Tab} from "react-bootstrap";
import Icon from "./Icon.jsx";
import Options from "./Options.jsx";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");

export default class SettingsTab extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      currentTab: 1,
    };

    // Function bindings
    this.updateFeature = this.updateFeature.bind(this);
  }

  updateFeature(e) {
    this.props.globalUpdate(e.target.id, !this.props.state[e.target.id])
  }
 
  render() {
    const className = this.props.state.sidebarOpen ? "MapInputs open" : "MapInputs";
    let all_tabs = {
      _foundation: 'Foundation',
      _environment: 'Environment',
      _intelligence: 'Intelligence',
      _derived: 'Derived Products',
      _planning: 'Planning Tools'

    }
    let check_boxes = []

    for (let tab in this.props.state.allowedTabs) {
      if (this.props.state.allowedTabs[tab] === true) {
        check_boxes.push(<Checkbox
          id={tab}
          key={tab}
          checked={this.props.state[tab]}
          onChange={this.updateFeature}
        >
          {all_tabs[tab]}
        </Checkbox>)
      }
      
    }


    return (
        <Panel
              collapsible
              defaultExpanded
              header={_("Enabled Features")}
              bsStyle='primary'
        >

        {check_boxes}

        {/*
          <Checkbox
              id='_foundation'
              checked={this.props.state._foundation}
              onChange={this.updateFeature}
          >
              Foundation
          </Checkbox>
          <Checkbox
              id='_environment'
              checked={this.props.state._environment}
              onChange={this.updateFeature}
          >
              Environment
          </Checkbox>
          <Checkbox
              id='_intelligence'
              checked={this.props.state._intelligence}
              onChange={this.updateFeature}
          >
              Intelligence
          </Checkbox>
          <Checkbox
              id='_derived'
              checked={this.props.state._derived}
              onChange={this.updateFeature}
          >
              Derived Products
          </Checkbox>
          <Checkbox
              id='_planning'
              checked={this.props.state._planning}
              onChange={this.updateFeature}
          >
              Planning Tools
          </Checkbox>
        */}
          
        </Panel>

    );
  }
}