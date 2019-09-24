import React from "react";
import PlotImage from "./PlotImage.jsx";
import ComboBox from "./ComboBox.jsx";
import SelectBox from "./SelectBox.jsx";
import { Button, Nav, NavItem, Panel, Row, Col } from "react-bootstrap";
import ContinousTimePicker from "./ContinousTimePicker.jsx";
import ImageSize from "./ImageSize.jsx";
import PropTypes from "prop-types";
import DataSelection from "./DataSelection.jsx";
import moment from "moment-timezone";
import TimePicker from "./time/TimePicker.jsx";

const i18n = require("../i18n.js");

export default class DrifterWindow extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showmap: true,
      variable: '', //props.data.variable.indexOf(",") == -1 ? [props.data.variable] : props.data.variable.split(","),
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
    this.updateData = this.updateData.bind(this);
    this.populateVariables = this.populateVariables.bind(this);
  }

  componentDidMount() {
    $.ajax({
      url: `/api/drifters/time/${this.props.drifter}`,
      dataType: "json",
      cache: true,
      success: function(data) {
        let data_min = moment(data.min).tz('GMT')
        let data_max = moment(data.max).tz('GMT')
        this.setState({
          mindate: data_min,
          maxdate: data_max,
          starttime: data_min,
          endtime: data_max,
        }, this.updatePlot);
        
      }.bind(this),
      error: function(xhr, status, err) {
        console.error(xhr.url, status, err.toString());
      }.bind(this)
    });
  }

  populateVariables(dataset) {
    if (dataset === undefined) {
      return
    }
    $.ajax({
      url: "/api/v1.0/variables/?dataset=" + dataset,
      dataType: "json",
      cache: true,

      success: function (data) {
        if (this._mounted) {
          const vars = data.map(function (d) {
            return d.id;
          });

          //if (vars.indexOf(this.props.variable.split(",")[0]) === -1) {
          //  this.props.onUpdate("variable", vars[0]);
          //}

          this.setState({
            variables: data.map(function (d) {
              return d.id;
            }),
          }, () => {
            this.updatePlot()
          });
        }
        //this.updatePlot()
      }.bind(this),

      error: function (xhr, status, err) {
        if (this._mounted) {
          console.error(this.props.url, status, err.toString());
        }
      }.bind(this)
    });
  }

  updateData(selected) {
    selected = selected.split(',')
    let data = this.props.data

    let layer = selected[0]
    let index = selected[1]
    let dataset = selected[2]
    let variable = ''

    if (selected.length > 4) {
      for (let v = 3; v < selected.length; v=v+1) {
        if (variable === '') {
          variable = selected[v]
        } else {
          variable = variable + ',' + selected[v]  
        }
      }
    } else {
      variable = [selected[3]]
    }
    let display = data[layer][index][dataset][variable].display
    let colourmap = data[layer][index][dataset][variable].colourmap
    let quantum = data[layer][index][dataset][variable].quantum
    let scale = data[layer][index][dataset][variable].scale
    //let time = data[layer][index][dataset][variable].time
    //console.warn("TIME: ", time)
    //time = moment.tz(time, 'GMT')
    //console.warn("MOMENT: ", time)
    //time.setUTCMonth(time.getUTCMonth() - 1)
    this.setState({
      layer: layer,
      index: index,
      dataset: dataset,
      variable: variable,

      display: display,
      colourmap: colourmap,
      quantum: quantum,
      scale: scale,
      //time: time,
    }, () => {
      this.updatePlot()
      this.populateVariables(dataset)
    })
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
    this.updatePlot()
  }

  updatePlot() {
    var plot_query = {
      dataset: this.state.dataset,
      quantum: this.state.quantum,
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
      plot_query.starttime = this.state.starttime;
      plot_query.endtime = this.state.endtime;
    }

    this.setState({
      plot_query: plot_query
    })
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
      state={this.state.dataset}
      def=''
      url='/api/v1.0/datasets/'
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
      url={"/api/v1.0/drifters/vars/" + this.props.drifter}
      title={_("Buoy Variable")}
    ><h1>Buoy Variable</h1></ComboBox>;
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

    var timeRange = null
    if (dataset !== undefined) {
      timeRange = <TimePicker
        range={true}
        key={'timeRange'}  //toISOString()}
        dataset={this.state.dataset}
        quantum={this.state.quantum}
        startDate={this.state.starttime}
        date={this.state.endtime}
        onTimeUpdate={this.onTimeUpdate}
      />
    }
   
    /*
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
    />;*/
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
      url={"/api/v1.0/depth/?variable=" +
        this.state.variable +
        "&dataset=" +
        this.state.dataset
      }
      title={_("Depth")}
    ></ComboBox>;

    var inputs = [];
    
    inputs = [
      dataset, showmap, latlon, timeRange, /*starttime, endtime,*/ buoyvariable, variable,
      depth, size
    ];

    
    let dataSelection = <DataSelection
      data={this.props.data}
      localUpdate={this.updateData}
    ></DataSelection>

    var plotImage = null
    if (this.state.plot_query !== undefined) {
      plotImage = <PlotImage
        query={this.state.plot_query} // For image saving link.
        permlink_subquery={this.state}
        action={this.props.action}
      />
    }

    return (
      <div className='DrifterWindow Window'>
        <div className='content'>
          <div className='inputs'>
            <Panel
              key='data_selection'
              id='data_selection'
              collapsible
              defaultExpanded
              header={_("Layer")}
              bsStyle='primary'
            >
              {dataSelection}
            </Panel>
            {inputs}
          </div>
          {plotImage}
          
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
