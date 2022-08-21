import React from "react";
import PlotImage from "./PlotImage.jsx";
import ComboBox from "./ComboBox.jsx";
import CheckBox from "./lib/CheckBox.jsx";
import ContinousTimePicker from "./ContinousTimePicker.jsx";
import ImageSize from "./ImageSize.jsx";
import Accordion from "./lib/Accordion.jsx";
import PropTypes from "prop-types";

import { withTranslation } from "react-i18next";


class TrackWindow extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      showmap: true,
      variable: props.variable.indexOf(",") == -1 ? [props.variable] : props.variable.split(","),
      latlon: false,
      trackvariable: [0],
      starttime: null,
      endtime: null,
      size: "10x7",
      dpi: 72,
      depth: 0,
      track_quantum: 'month'
    };

    if (this.props.obs_query) {
      let pairs = this.props.obs_query.split(';').map(x => x.split('='));
      let dict = pairs.reduce(function(d, p) {d[p[0]] = p[1]; return d}, {});
      this.state['starttime'] = new Date(dict.start_date);
      this.state['endtime'] = new Date(dict.end_date);
      this.state['track_quantum'] = dict.quantum;
    }

    if (props.init != null) {
      $.extend(this.state, props.init);
    }

    // Function bindings
    this.onLocalUpdate = this.onLocalUpdate.bind(this);
  }

  componentDidMount() {
    $.ajax({
      url: `/api/v1.0/observation/tracktimerange/${this.props.track}.json`,
      dataType: "json",
      cache: true,
      success: function(data) {
        this.setState({
          mindate: new Date(data.min),
          maxdate: new Date(data.max),
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
    _("Observed Variable");
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
      url='/api/v1.0/datasets/'
      title={_("Dataset")}
      onUpdate={this.props.onUpdate}
    />;
    var trackvariable = <ComboBox
      key='trackvariable'
      id='trackvariable'
      multiple
      state={this.state.trackvariable}
      def=''
      onUpdate={this.onLocalUpdate}
      url={`/api/v1.0/observation/variables/platform=${this.props.track[0]}.json`}
      title={_("Observed Variable")}
    ><h1>Track Variable</h1></ComboBox>;
    var variable = <ComboBox
      key='variable'
      id='variable'
      multiple
      state={this.state.variable}
      def=''
      onUpdate={this.onLocalUpdate}
      url={"/api/v1.0/variables/?dataset="+this.props.dataset}
      title={_("Variable")}
    ><h1>Variable</h1></ComboBox>;
    var showmap = <CheckBox
      key='showmap'
      id='showmap'
      checked={this.state.showmap}
      onUpdate={this.onLocalUpdate}
      title={_("Show Map")}
    >{_("showmap_help")}</CheckBox>;
    var latlon = <CheckBox
      key='latlon'
      id='latlon'
      checked={this.state.latlon}
      onUpdate={this.onLocalUpdate}
      title={_("Show Latitude/Longitude Plots")}
    >{_("latlon_help")}</CheckBox>;
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
    var track_quantum = <ComboBox
      key='track_quantum'
      id='track_quantum'
      state={this.state.track_quantum}
      data={[
        {id: 'minute', value: 'Minute'},
        {id: 'hour', value: 'Hour'},
        {id: 'day', value: 'Day'},
        {id: 'week', value: 'Week'},
        {id: 'month', value: 'Month'},
        {id: 'year', value: 'Year'},
      ]}
      title='Track Simplification'
      onUpdate={this.onLocalUpdate}
    />;
    var size = <ImageSize
      key='size'
      id='size'
      state={this.state.size}
      onUpdate={this.onLocalUpdate}
      title={_("Saved Image Size")}
    />;
    var accordion = <Accordion 
      id='track_accordion'
      title={"Plot Options"}
      content={size}
    />;
    var depth = <ComboBox
      key='depth'
      id='depth'
      state={this.state.depth}
      def={""}
      onUpdate={this.onLocalUpdate}
      url={"/api/v1.0/depth/?variable=" +
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
      type: "track",
      track: this.props.track,
      showmap: this.state.showmap,
      variable: this.state.variable,
      latlon: this.state.latlon,
      trackvariable: this.state.trackvariable,
      size: this.state.size,
      dpi: this.state.dpi,
      depth: this.state.depth,
      track_quantum: this.state.track_quantum,
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
      dataset, showmap, latlon, starttime, endtime, track_quantum,
      trackvariable, variable, depth, accordion
    ];

    return (
      <div className='TrackWindow Window'>
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
TrackWindow.propTypes = {
  generatePermLink: PropTypes.func,
  track: PropTypes.array,
  quantum: PropTypes.string,
  dataset: PropTypes.string,
  onUpdate: PropTypes.func,
  init: PropTypes.object,
  variable: PropTypes.string,
  action: PropTypes.func,
  obs_query: PropTypes.string
};

export default withTranslation()(TrackWindow);
