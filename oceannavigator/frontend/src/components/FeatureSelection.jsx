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
    this.handleTabs = this.handleTabs.bind(this);
    this.updateFeature = this.updateFeature.bind(this);
  }

  updateFeature(e) {
    console.warn("ID: ", e.id)
    this.props.globalUpdate(e.id, !this.props.state[id])
  }
 
  render() {
    const className = this.props.state.sidebarOpen ? "MapInputs open" : "MapInputs";
    
    return (
      <div className={className}>
        
        <Checkbox
            id='foundation'
            state={this.props.state._foundation}
            onChange={this.updateFeature}
        >
            Foundation
        </Checkbox>

      </div>
        

    );
  }
}