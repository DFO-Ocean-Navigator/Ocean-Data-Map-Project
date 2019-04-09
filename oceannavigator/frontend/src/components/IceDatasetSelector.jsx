/* eslint react/no-deprecated: 0 */

import React from "react";
import ComboBox from "./ComboBox.jsx";
import TimePicker from "./TimePicker.jsx";
import PropTypes from "prop-types";
import VelocitySelector from "./VelocitySelector.jsx";
import IceComboBox from "./IceComboBox.jsx";

const i18n = require("../i18n.js");

// Default properties for a dataset-state
const DATA_ELEMS = [
  "dataset",
  "attribution",
  "dataset",
  "variable",
  "scale", // Default range values for variable
  "depth",
  "time",
  "starttime",
];

export default class IceDatasetSelector extends React.Component {
  constructor(props) {

    super(props);

    // Function bindings
    this.variableUpdate = this.variableUpdate.bind(this);
   
  }

  variableUpdate(key, value) {
    this.props.localUpdate("setDefaultScale", true);
    this.props.localUpdate(key, value);
  }

  render() {
    _("Dataset");
    _("Variable");
    _("Depth");
    _("Time (UTC)");
    let variables = "";
    switch (this.props.variables) {
      case "3d":
        variables = "&3d_only";
        break;
    }
    switch (this.props.envtype) {
      case "ice":
        variables = "&env_type=ice";
        break;
      case "meteorology":
        variables = "&env_type=meteorology"
        break;
      default:
        break;
    }

    

    let velocity_selector = null;
    if(this.props.line && !this.props.compare && (this.props.state.variable === "vozocrtx,vomecrty" || this.props.state.variable === "east_vel,north_vel")) {
      velocity_selector = [
        <VelocitySelector
          key='velocityType'
          id='velocityType'
          updateSelectedPlots={this.props.updateSelectedPlots}
        />
      ];  
    }

    return (
      <div className='DatasetSelector'>

        <IceComboBox
          values={this.props.state.variables}
          current='current_variable'
          localUpdate={this.props.localUpdate}
        ></IceComboBox>
        <IceComboBox
          values={this.props.state.datasets}
          current='current_dataset'
          localUpdate={this.props.localUpdate}
        ></IceComboBox>

        {velocity_selector}

      </div>
    );
  }
}

//***********************************************************************
IceDatasetSelector.propTypes = {
  state: PropTypes.object,
  variable: PropTypes.string,
  depth: PropTypes.bool,
  dataset: PropTypes.string,
  time: PropTypes.string,
  dataset_quantum: PropTypes.string,
  starttime: PropTypes.number,
  localUpdate: PropTypes.func,
  toggleLayer: PropTypes.func,
  id: PropTypes.string,
  variables: PropTypes.string,
  multiple: PropTypes.bool,
  line: PropTypes.bool,
  updateSelectedPlots: PropTypes.func,
  compare: PropTypes.bool,
  envtype: PropTypes.string,
};

