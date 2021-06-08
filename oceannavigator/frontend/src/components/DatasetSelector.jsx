/* eslint react/no-deprecated: 0 */

import React from "react";
import ComboBox from "./ComboBox.jsx";
import TimePicker from "./TimePicker.jsx";
import PropTypes from "prop-types";
import VelocitySelector from "./VelocitySelector.jsx";

const i18n = require("../i18n.js");

// Default properties for a dataset-state
const DATA_ELEMS = [
  "dataset",
  "dataset_attribution",
  "dataset_quantum",
  "variable",
  "variable_scale", // Default range values for variable
  "depth",
  "time",
  "starttime",
];

export default class DatasetSelector extends React.Component {
  constructor(props) {

    super(props);

    // Function bindings
    this.variableUpdate = this.variableUpdate.bind(this);
    this.onUpdate = this.onUpdate.bind(this);
  }

  variableUpdate(key, value) {
    this.props.onUpdate("setDefaultScale", true);
    this.onUpdate(key, value);
    if(Array.isArray(key)){
      if ("options" in key){
        this.props.onUpdateOptions(value[key.indexOf("options")]); 
      }
    }
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

    let variables = "";
    switch (this.props.variables) {
      case "3d":
        variables = "&3d_only";
        break;
      default:
        break;
    }

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

    return (
      <div className='DatasetSelector'>

        <ComboBox
          id='dataset'
          state={this.props.state.dataset}
          def={"defaults.dataset"}
          onUpdate={this.onUpdate}
          url='/api/v1.0/datasets/'
          title={_("Dataset")}></ComboBox>

        <ComboBox
          id='variable'
          multiple={this.props.multiple}
          state={this.props.state.variable}
          def={"defaults.dataset"}
          onUpdate={this.variableUpdate}
          url={"/api/v1.0/variables/?dataset=" + this.props.state.dataset + variables
          }
          title={_("Variable")}
        ><h1>{_("Variable")}</h1></ComboBox>

        {velocity_selector}

        {this.props.depth && <ComboBox
          id='depth'
          state={this.props.state.depth}
          def={0}
          onUpdate={this.onUpdate}
          url={"/api/v1.0/depth/?variable=" +
            this.props.state.variable +
            "&dataset=" +
            this.props.state.dataset
          }
          title={_("Depth")}
        ></ComboBox>}
        
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
};
