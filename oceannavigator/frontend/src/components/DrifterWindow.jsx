import React from "react";
import PlotImage from "./PlotImage.jsx";
import ComboBox from "./ComboBox.jsx";
import SelectBox from "./SelectBox.jsx";
import ContinousTimePicker from "./ContinousTimePicker.jsx";
import ImageSize from "./ImageSize.jsx";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");

export default class DrifterWindow extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      showmap: true,
      variable: props.variable.indexOf(",") == -1 ? [props.variable] : props.variable.split(","),
      latlon: false,
      buoyvariable: ["sst"],
      starttime: null,
      endtime: null,
      size: "10x7",
      dpi: 72,
      depth: 0,
    };

    if (props.init != null) {
      $.extend(this.state, props.init);
    }

    // Function bindings
    this.onLocalUpdate = this.onLocalUpdate.bind(this);
  }

  componentDidMount() {
    $.ajax({
      url: `/api/drifters/time/${this.props.drifter}`,
      dataType: "json",
      cache: true,
      success: function(data) {
        this.setState({
          mindate: new Date(data.min),
          maxdate: new Date(data.max),
          starttime: new Date(data.min),
          endtime: new Date(data.max),
        });
      }.bind(this),
      error: function(xhr, status, err) {
        console.error(xhr.url, status, err.toString());
      }.bind(this)
    });
  }

  onLocalUpdate(key, value) {
    var newState = {};
    if (typeof(key) === "string") {
      newState[key] = value;
    } else {
      for (var i = 0; i < key.length; i++) {
        newState[key[i]] = value[i];
      }
    }
    this.setState(newState);

    var parentKeys = [];
    var parentValues = [];

    if (newState.hasOwnProperty("variable_scale") && this.state.variable.length == 1) {
      parentKeys.push("variable_scale");
      parentValues.push(newState.variable_scale);
    }

    if (newState.hasOwnProperty("variable") && newState.variable.length == 1) {
      parentKeys.push("variable");
      parentValues.push(newState.variable[0]);
    }

    if (parentKeys.length > 0) {
      this.props.onUpdate(parentKeys, parentValues);
    }
  }

  render() {
    _("Dataset");
    _("Buoy Variable");
    _("Variable");
    _("Show Map");
    _("Show Latitude/Longitude Plots");
    _("Start Time");
    _("End Time");
    _("Saved Image Size");
    var dataset = <ComboBox
      key='dataset'
      id='dataset'
      state={this.props.dataset}
      def=''
      url='/api/datasets/'
      title={_("Dataset")}
      onUpdate={this.props.onUpdate}
    />;
    var buoyvariable = <ComboBox
      key='buoyvariable'
      id='buoyvariable'
      multiple
      state={this.state.buoyvariable}
      def=''
      onUpdate={this.onLocalUpdate}
      url={"/api/drifters/vars/" + this.props.drifter}
      title={_("Buoy Variable")}
    ><h1>Buoy Variable</h1></ComboBox>;
    var variable = <ComboBox
      key='variable'
      id='variable'
      multiple
      state={this.state.variable}
      def=''
      onUpdate={this.onLocalUpdate}
      url={"/api/variables/?dataset="+this.props.dataset}
      title={_("Variable")}
    ><h1>Variable</h1></ComboBox>;
    var showmap = <SelectBox
      key='showmap'
      id='showmap'
      state={this.state.showmap}
      onUpdate={this.onLocalUpdate}
      title={_("Show Map")}
    >{_("showmap_help")}</SelectBox>;
    var latlon = <SelectBox
      key='latlon'
      id='latlon'
      state={this.state.latlon}
      onUpdate={this.onLocalUpdate}
      title={_("Show Latitude/Longitude Plots")}
    >{_("latlon_help")}</SelectBox>;
    var starttime = <ContinousTimePicker
      key='starttime'
      id='starttime'
      state={this.state.starttime}
      title={_("Start Time")}
      onUpdate={this.onLocalUpdate}
      max={this.state.endtime}
      min={this.state.mindate}
    />;
    var endtime = <ContinousTimePicker
      key='endtime'
      id='endtime'
      state={this.state.endtime}
      title={_("End Time")}
      onUpdate={this.onLocalUpdate}
      min={this.state.starttime}
      max={this.state.maxdate}
    />;
    var size = <ImageSize
      key='size'
      id='size'
      state={this.state.size}
      onUpdate={this.onLocalUpdate}
      title={_("Saved Image Size")}
    />;
    var depth = <ComboBox
      key='depth'
      id='depth'
      state={this.state.depth}
      def={""}
      onUpdate={this.onLocalUpdate}
      url={"/api/depth/?variable=" +
        this.state.variable +
        "&dataset=" +
        this.props.dataset
      }
      title={_("Depth")}
    ></ComboBox>;

    var inputs = [];
    var plot_query = {
      dataset: this.props.dataset,
      quantum: this.props.quantum,
      scale: this.state.scale,
      name: this.props.name,
      type: "drifter",
      drifter: this.props.drifter,
      showmap: this.state.showmap,
      variable: this.state.variable,
      latlon: this.state.latlon,
      buoyvariable: this.state.buoyvariable,
      size: this.state.size,
      dpi: this.state.dpi,
      depth: this.state.depth,
    };
    if (this.state.starttime) {
      if (plot_query.starttime instanceof Date) {
        plot_query.starttime = this.state.starttime.toISOString();
        plot_query.endtime = this.state.endtime.toISOString();
      } else {
        plot_query.starttime = this.state.starttime;
        plot_query.endtime = this.state.endtime;
      }
    }
    inputs = [
      dataset, showmap, latlon, starttime, endtime, buoyvariable, variable,
      depth, size
    ];

    return (
      <div className='DrifterWindow Window'>
        <div className='content'>
          <div className='inputs'>
            {inputs}
          </div>
          <PlotImage
            query={plot_query} // For image saving link.
            permlink_subquery={this.state}
            action={this.props.action}
          />
          <br className='clear' />
        </div>
      </div>
    );
  }
}

//***********************************************************************
DrifterWindow.propTypes = {
  generatePermLink: PropTypes.func,
  drifter: PropTypes.array,
  quantum: PropTypes.string,
  dataset: PropTypes.string,
  onUpdate: PropTypes.func,
  init: PropTypes.object,
  variable: PropTypes.string,
  action: PropTypes.func,
};
