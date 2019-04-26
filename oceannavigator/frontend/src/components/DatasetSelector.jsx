import React from "react";
import ComboBox from "./ComboBox.jsx";
import TimePicker from "./TimePicker.jsx";
import PropTypes from "prop-types";
import VelocitySelector from "./VelocitySelector.jsx";
import moment from "moment";
import IceComboBox from "./IceComboBox.jsx";

const i18n = require("../i18n.js");

// Default properties for a dataset-state
const DATA_ELEMS = [
  "dataset",
  "dataset_attribution",
  "quantum",
  "variable",
  "scale", // Default range values for variable
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
    this.onTimeUpdate = this.onTimeUpdate.bind(this);
  }

  variableUpdate(key, value) {
    this.props.onUpdate("setDefaultScale", true);
    this.onUpdate(key, value);
  }

  onUpdate(key, value) {
    const newState = this.props.state

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

  onTimeUpdate(key, value) {
    let new_state = this.props.state
    if (typeof(key) === typeof('string')) {
      value = moment(value.valueOf())
      value.tz('GMT')

      new_state[key] = value
    } else {
      value = moment(key.valueOf())
      value.tz('GMT')

      new_state.time = value
    }
    this.props.onUpdate(jQuery.extend({}, new_state))
  }
  
  render() {
    _("Dataset");
    _("Variable");
    _("Depth");
    _("Time (UTC)");
    let variables = "";
    switch (this.props.state.variables) {
      case "3d":
        variables = "&3d_only";
        break;
      default:
        break;
    }

    // Determine which timepicker we need
    let time = "";
    let timeObj = this.props.state.time
    if (timeObj !== null) {
      timeObj = moment(timeObj.valueOf()) //new Date(this.props.state.time);
      timeObj.tz('GMT')
    }
    
    let starttimeObj = this.props.state.starttime //new Date(this.props.state.starttime);
    if (starttimeObj !== undefined && starttimeObj !== null) {
      starttimeObj = moment(starttimeObj.valueOf())
      starttimeObj.tz('GMT')
    }

    switch (this.props.time) {
      case "range":
        time = (<div>
          <TimePicker
            range={true}
            startid='starttime'
            key='starttime'
            dataset={this.props.state.dataset}
            quantum={this.props.state.dataset_quantum}
            startDate={starttimeObj}
            date={timeObj}
            onTimeUpdate={this.onTimeUpdate}
          />
        </div>);
        break;
      case "single":
      default:
          time =<TimePicker
          range={false}
          key='time'
          dataset={this.props.state.dataset}
          quantum={this.props.state.dataset_quantum}
          startDate={starttimeObj}
          date={timeObj}
          onTimeUpdate={this.onTimeUpdate}
        />;      
    }

    let velocity_selector = null;
    
    return (
      <div className='DatasetSelector'>
        
          {<ComboBox
            id='dataset'
            state={this.props.state.dataset}
            def={"defaults.dataset"}
            onUpdate={this.onUpdate}
            url='/api/datasets/'
            title={_("Dataset")}>
          </ComboBox>
        }
          <ComboBox
            id='variable'
            multiple={this.props.multiple}
            state={this.props.state.variable}
            def={"defaults.dataset"}
            onUpdate={this.variableUpdate}
            url={"/api/v1.0/variables/?3d_only&dataset=" + this.props.state.dataset + variables
            }
            title={_("Variable")}
          ><h1>{_("Variable")}</h1>
          </ComboBox>
        
        
        

        {velocity_selector}
        
        {this.props.depth && <ComboBox
          id='depth'
          state={this.props.state.depth}
          def={0}
          onUpdate={this.onUpdate}
          url={"/api/depth/?variable=" +
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
