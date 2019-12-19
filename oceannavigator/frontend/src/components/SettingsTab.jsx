import React from "react";
import Options from "./Options.jsx";
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