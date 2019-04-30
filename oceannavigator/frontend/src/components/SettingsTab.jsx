import React from "react";
import ComboBox from "./ComboBox.jsx";
import Range from "./Range.jsx";
import SelectBox from "./SelectBox.jsx";
import DatasetSelector from "./DatasetSelector.jsx";
import {Panel, Button, Row, Col, Tabs, Tab} from "react-bootstrap";
import Icon from "./Icon.jsx";
import Options from "./Options.jsx";
import PropTypes from "prop-types";
import FeatureSelection from "./FeatureSelection.jsx";

const i18n = require("../i18n.js");

export default class SettingsTab extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      currentTab: 1,
    };

    // Function bindings
    this.handleTabs = this.handleTabs.bind(this);
  }

  handleTabs(key) {
    this.setState({currentTab: key,});
  }
 
  render() {
    const className = this.props.state.sidebarOpen ? "MapInputs open" : "MapInputs";
    
    return (
      <div className={className}>
        
        <FeatureSelection
          state={this.props.state}
          globalUpdate={this.props.changeHandler}
        >
        </FeatureSelection>

        <Options
          options={this.props.options}
          updateOptions={this.props.updateOptions}
        />
      </div>
        

    );
  }
}