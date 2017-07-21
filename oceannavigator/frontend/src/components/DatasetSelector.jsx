import React from "react";
import ComboBox from "./ComboBox.jsx";
import TimePicker from "./TimePicker.jsx";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");

const KEYS = [
  "dataset",
  "dataset_attribution",
  "dataset_quantum", // Dataset time
  "variable",
  "variable_scale", // Default range values for variable
  "depth",
  "time",
];

class DatasetSelector extends React.Component {
  constructor(props) {
    super(props);
  }

  onUpdate(key, value) {
    const newState = KEYS.reduce((a,b) => {
      a[b] = this.props.state[b];
      return a;
    }, {});

    if (typeof(key) === "string") {
      newState[key] = value;
    } 
    else {
      for (let i = 0; i < key.length; i++) {
        newState[key[i]] = value[i];
      }
    }

    this.props.onUpdate(this.props.id, newState);
  }

  render() {
    _("Dataset");
    _("Variable");
    _("Depth");
    _("Time");

    var variables = "";
    switch (this.props.variables) {
      case "3d":
        variables = "&3d_only";
        break;
      case "all":
      default:
        variables = "";
        break;
    }

    // Determine which timepicker we need
    var time = "";
    switch (this.props.time) {
      case "range":
        time = <div>
          <TimePicker
            key='starttime'
            id='starttime'
            state={this.props.state.starttime}
            def=''
            quantum={this.props.state.dataset_quantum}
            url={"/api/timestamps/?dataset=" +
                this.props.state.dataset +
                "&quantum=" +
                this.props.state.dataset_quantum}
            title={_("Start Time")}
            onUpdate={this.onUpdate.bind(this)}
            max={this.props.state.time}
          />
          <TimePicker
            key='time'
            id='time'
            state={this.props.state.time}
            def=''
            quantum={this.props.state.dataset_quantum}
            url={"/api/timestamps/?dataset=" +
                this.props.state.dataset +
                "&quantum=" +
                this.props.state.dataset_quantum}
            title={_("End Time")}
            onUpdate={this.onUpdate.bind(this)}
            min={this.props.state.starttime}
          />
        </div>;
        break;
      case "single":
      default:
        time = <TimePicker
          key='time'
          id='time'
          state={this.props.state.time}
          def={-1}
          quantum={this.props.state.dataset_quantum}
          onUpdate={this.onUpdate.bind(this)}
          url={"/api/timestamps/?dataset=" +
            this.props.state.dataset +
            "&quantum=" +
            this.props.state.dataset_quantum
          }
          title={_("Time")}
        />;
    }

    return (
      <div className='DatasetSelector'>
        <ComboBox
          key='dataset'
          id='dataset'
          state={this.props.state.dataset}
          def={"defaults.dataset"}
          onUpdate={this.onUpdate.bind(this)}
          url='/api/datasets/'
          title={_("Dataset")}></ComboBox>
        <ComboBox
          key='variable'
          id='variable'
          state={this.props.state.variable}
          def={"defaults.dataset"}
          onUpdate={this.onUpdate.bind(this)}
          url={"/api/variables/?vectors&dataset=" + this.props.state.dataset + variables
          }
          title={_("Variable")}
        ><h1>{_("Variable")}</h1></ComboBox>
        {this.props.depth && <ComboBox
          key='depth'
          id='depth'
          state={this.props.state.depth}
          def={0}
          onUpdate={this.onUpdate.bind(this)}
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
  depth: PropTypes.number,
  dataset: PropTypes.string,
  time: PropTypes.number,
  dataset_quantum: PropTypes.string,
  starttime: PropTypes.number,
  onUpdate: PropTypes.func,
  id: PropTypes.string,
  variables: PropTypes.string,
};

export default DatasetSelector;

