/* eslint react/no-deprecated: 0 */

import React from "react";
import ComboBox from "./ComboBox.jsx";
import TimePicker from "./TimePicker.jsx";
import PropTypes from "prop-types";
import VelocitySelector from "./VelocitySelector.jsx";
import SelectBox from "./lib/SelectBox.jsx";

import { withTranslation } from "react-i18next";

// Default properties for a dataset-state
const DATA_ELEMS = Object.freeze([
  "dataset",
  "dataset_attribution",
  "dataset_quantum",
  "variable",
  "variable_scale", // Default range values for variable
  "depth",
  "time",
  "starttime",
  "quiverVariable",
]);

class DatasetSelector extends React.Component {
  constructor(props) {
    super(props);

    // Function bindings
    this.onUpdate = this.onUpdate.bind(this);
  }

  onUpdate(key, value) {
    const newState = DATA_ELEMS.reduce((a,b) => {
      a[b] = this.props.state[b];
      return a;
    }, {});

    if (typeof(key) === "string") {
      newState[key] = value;
    } 
    else {
      for (let i = 0; i < key.length; ++i) {
        newState[key[i]] = value[i];
      }
    }
    this.props.onUpdate(this.props.id, newState);
  }

  render() {
    _("Dataset");
    _("Variable");
    _("Depth");
    _("Time (UTC)");
    _("Quiver Variable");

    // Determine which timepicker we need
    let time = "";
    switch (this.props.time) {
      case "range":
        time = (<div>
          <TimePicker
            key='starttime'
            id='starttime'
            state={this.props.state.starttime}
            def=''
            quantum={this.props.state.dataset_quantum}
            url={"/api/v1.0/timestamps/?dataset=" +
                this.props.state.dataset +
                "&variable=" +
                this.props.state.variable
            }
            title={_("Start Time")}
            onUpdate={this.onUpdate}
            max={this.props.state.time}
          />
          <TimePicker
            key='time'
            id='time'
            state={this.props.state.time}
            def=''
            quantum={this.props.state.dataset_quantum}
            url={"/api/v1.0/timestamps/?dataset=" +
                this.props.state.dataset +
                "&variable=" +
                this.props.state.variable
            }
            title={_("End Time")}
            onUpdate={this.onUpdate}
            min={this.props.state.starttime}
          />
        </div>);
        break;
      case "single":
      default:
        time = <TimePicker
          key='time'
          id='time'
          state={this.props.state.time}
          def={-1}
          quantum={this.props.state.dataset_quantum}
          onUpdate={this.onUpdate}
          url={"/api/v1.0/timestamps/?dataset=" +
            this.props.state.dataset +
            "&variable=" +
            this.props.state.variable
          }
          title={_("Time (UTC)")}
        />;
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

    let quiverSelector = null;
    if (this.props.showQuiverSelector) {
      let quiverVariables = [];
      if (this.props.datasetVariables) {
        quiverVariables = this.props.datasetVariables.filter((variable) => {
          return variable.id.includes("mag") && variable.id.includes("vel");
        });
      }
      quiverVariables.unshift({ id: "none", value: "None" });
  
      quiverSelector = <SelectBox
        id={`dataset-selector-quiver-selector-${this.props.id}`}
        name="quiverVariable"
        label={_("Quiver Variable")}
        placeholder={_("Quiver Variable")}
        options={quiverVariables}
        onChange={this.onUpdate}
        selected={this.props.state.quiverVariable}
      />;
    }

    let depthSelector = null;
    if (this.props.depth && this.props.datasetDepths && this.props.datasetDepths.length > 0) {
      depthSelector = <SelectBox 
        id={`dataset-selector-depth-selector-${this.props.id}`}
        name={"depth"}
        label={_("Depth")}
        placeholder={_("Depth")}
        options={this.props.datasetDepths.filter(d => d.id !== "all")}
        onChange={this.onUpdate}
        selected={
          this.props.datasetDepths.filter(d => {
            let depth = parseInt(this.props.state.depth);
            if (isNaN(depth)) { // when depth == "bottom" or "all"
              depth = this.props.state.depth;
            }

            return d.id === depth;
          })[0].id
        }
      />;
    }

    let variableSelector = null;
    if (this.props.datasetVariables) {
      let options = [];
      if (this.props.variables === "3d") {
        options = this.props.datasetVariables.filter(v => {
          return v.two_dimensional === false;
        });
      }
      else {
        options = this.props.datasetVariables;
      }

      variableSelector = <SelectBox 
        id={`dataset-selector-variable-selector-${this.props.id}`}
        name={"variable"}
        label={_("Variable")}
        placeholder={_("Variable")}
        options={options}
        onChange={this.onUpdate}
        selected={this.props.state.variable}
      />;
    }

    return (
      <div className='DatasetSelector'>

        <ComboBox
          id='dataset'
          state={this.props.state.dataset}
          def={"defaults.dataset"}
          onUpdate={this.onUpdate}
          url='/api/v1.0/datasets/'
          title={_("Dataset")}></ComboBox>

        {variableSelector}

        {velocity_selector}

        {quiverSelector}

        {depthSelector}
        
        {time}

      </div>
    );
  }
}

//***********************************************************************
DatasetSelector.propTypes = {
  state: PropTypes.object,
  variable: PropTypes.string,
  depth: PropTypes.bool,
  dataset: PropTypes.string,
  time: PropTypes.string,
  dataset_quantum: PropTypes.string,
  starttime: PropTypes.number,
  onUpdate: PropTypes.func,
  id: PropTypes.string,
  variables: PropTypes.string,
  multiple: PropTypes.bool,
  line: PropTypes.bool,
  updateSelectedPlots: PropTypes.func,
  compare: PropTypes.bool,
  availableDatasets: PropTypes.arrayOf(PropTypes.object),
  datasetVariables: PropTypes.arrayOf(PropTypes.object),
  showQuiverSelector: PropTypes.bool,
  datasetDepths: PropTypes.arrayOf(PropTypes.object),
};

DatasetSelector.defaultProps = {
  showQuiverSelector: true,
};

export default withTranslation()(DatasetSelector);
