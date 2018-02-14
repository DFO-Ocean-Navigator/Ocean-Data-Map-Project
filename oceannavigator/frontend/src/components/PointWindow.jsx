import React from "react";
import {Nav, NavItem, Panel, Row, Col, Button} from "react-bootstrap";
import PlotImage from "./PlotImage.jsx";
import ComboBox from "./ComboBox.jsx";
import TimePicker from "./TimePicker.jsx";
import LocationInput from "./LocationInput.jsx";
import SelectBox from "./SelectBox.jsx";
import Range from "./Range.jsx";
import ImageSize from "./ImageSize.jsx";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");
const stringify = require("fast-stable-stringify");

const TabEnum = {
  PROFILE: 1,
  CTD: 2,
  TS: 3,
  STICK: 4,
  SOUND: 5,
  OBSERVATION: 6,
  MOORING: 7,
};

export default class PointWindow extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = {
      selected: TabEnum.CTD,
      scale: props.scale + ",auto",
      depth: props.depth,
      colormap: "default",
      starttime: Math.max(props.time - 24, 0),
      variables: [],
      variable: [props.variable],
      observation_variable: [7],
      size: "10x7",
      dpi: 144,
    };

    if (props.init != null) {
      $.extend(this.state, props.init);
    }

    // Function bindings
    this.onLocalUpdate = this.onLocalUpdate.bind(this);
  }

  populateVariables(dataset) {
    $.ajax({
      url: "/api/variables/?dataset=" + dataset + "&anom",
      dataType: "json",
      cache: true,
      success: function(data) {
        const vars = data.map(function(d) { return d.id; });
        if ($.inArray(this.props.variable.split(",")[0], vars) == -1) {
          this.props.onUpdate("variable", vars[0]);
          this.setState({
            selected: TabEnum.PROFILE,
          });
        }
        this.setState({
          variables: data.map(function(d) { return d.id; }),
        });
      }.bind(this),
      error: function(xhr, status, err) {
        console.error(this.props.url, status, err.toString());
      }.bind(this)
    });
  }

  componentDidMount() {
    this.populateVariables(this.props.dataset);
    if (this.props.point[0][2] !== undefined) {
      this.setState({
        selected: TabEnum.OBSERVATION,
      });
    }
  }

  componentWillReceiveProps(props) {

    if (stringify(this.props) !== stringify(props)) {

      const state = {};

      if (!Array.isArray(this.state.depth)) {
        state.depth = props.depth;
      }
      if (this.state.scale.indexOf("auto") != -1) {
        state.scale = props.scale + ",auto";
      } 
      else {
        state.scale = props.scale;
      }
      this.setState(state);
      if (this.props.dataset != props.dataset) {
        this.populateVariables(props.dataset);
      }
    }
  }

  onLocalUpdate(key, value) {
    var newState = {};
    
    if (typeof(key) === "string") {
      newState[key] = value;
    } 
    else {
      for (let i = 0; i < key.length; i++) {
        newState[key[i]] = value[i];
      }
    }
    this.setState(newState);

    var parentKeys = [];
    var parentValues = [];

    if (newState.hasOwnProperty("depth") && newState.depth != "all") {
      if (!Array.isArray(newState.depth)) {
        parentKeys.push("depth");
        parentValues.push(newState.depth);
      } else if (newState.depth.length > 1) {
        parentKeys.push("depth");
        parentValues.push(newState.depth[0]);
      }
    }

    if (newState.hasOwnProperty("point")) {
      parentKeys.push("point");
      parentValues.push(newState.point);

      parentKeys.push("names");
      parentValues.push([]);
    }

    if (newState.hasOwnProperty("variable_scale") &&
      this.state.variable.length == 1) {
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

  // Handles when a tab is selected
  onSelect(key) {
    this.setState({
      selected: key
    });
  }

  render() {

    _("Dataset");
    _("Time");
    _("Location");
    _("Start Time");
    _("End Time");
    _("Depth");
    _("Variable");
    _("Variable Range");
    _("Colourmap");
    _("Saved Image Size");

    const global = (<Panel
      key='global_settings'
      id='global_settings'
      collapsible
      defaultExpanded
      header={_("Global Settings")}
      bsStyle='primary'
    >
      <div style={{display: this.props.point.length == 1 ? "block" : "none",}}>
        <LocationInput
          key='point'
          id='point'
          state={this.props.point}
          title={_("Location")}
          onUpdate={this.onLocalUpdate}
        />
      </div>
      
      <ImageSize
        key='size'
        id='size'
        state={this.state.size}
        onUpdate={this.onLocalUpdate}
        title={_("Saved Image Size")}
      />
    </Panel>);

    const dataset = <ComboBox
      key='dataset'
      id='dataset'
      state={this.props.dataset}
      def=''
      url='/api/datasets/'
      title={_("Dataset")}
      onUpdate={this.props.onUpdate}
    />;
    const time = <TimePicker
      key='time'
      id='time'
      state={this.props.time}
      def=''
      quantum={this.props.quantum}
      url={"/api/timestamps/?dataset=" + this.props.dataset + "&quantum=" + this.props.quantum}
      title={_("Time")}
      onUpdate={this.props.onUpdate}
    />;
    const starttime = <TimePicker
      key='starttime'
      id='starttime'
      state={this.state.starttime}
      def=''
      quantum={this.props.quantum}
      url={"/api/timestamps/?dataset=" + this.props.dataset + "&quantum=" + this.props.quantum}
      title={_("Start Time")}
      onUpdate={this.onLocalUpdate}
      max={this.props.time}
    />;
    const endtime = <TimePicker
      key='time'
      id='time'
      state={this.props.time}
      def=''
      quantum={this.props.quantum}
      url={"/api/timestamps/?dataset=" + this.props.dataset + "&quantum=" + this.props.quantum} title={_("End Time")}
      onUpdate={this.props.onUpdate}
      min={this.state.starttime}
    />;
    const depth = <ComboBox
      key='depth'
      id='depth'
      state={this.state.depth}
      def={""}
      onUpdate={this.onLocalUpdate}
      url={"/api/depth/?variable=" + this.props.variable + "&dataset=" + this.props.dataset + "&all=True"}
      title={_("Depth")}></ComboBox>;
    const multidepth = <ComboBox
      key='depth'
      id='depth'
      multiple
      state={this.state.depth}
      def={""}
      onUpdate={this.onLocalUpdate}
      url={"/api/depth/?variable=" + this.state.variable + "&dataset=" + this.props.dataset}
      title={_("Depth")}></ComboBox>;
    const variable = <ComboBox
      key='variable'
      id='variable'
      state={this.props.variable}
      def=''
      onUpdate={this.props.onUpdate}
      url={"/api/variables/?vectors&dataset="+this.props.dataset}
      title={_("Variable")}><h1>{_("Variable")}</h1></ComboBox>;
    const profilevariable = <ComboBox
      key='variable'
      id='variable'
      multiple
      state={this.state.variable}
      def=''
      onUpdate={this.onLocalUpdate}
      url={"/api/variables/?3d_only&dataset="+this.props.dataset + "&anom"}
      title={_("Variable")}><h1>Variable</h1></ComboBox>;
    const vectorvariable = <ComboBox
      key='variable'
      id='variable'
      state={this.state.variable}
      def=''
      onUpdate={this.onLocalUpdate}
      url={"/api/variables/?vectors_only&dataset="+this.props.dataset}
      title={_("Variable")}><h1>Variable</h1></ComboBox>;
    const scale = <Range
      auto
      key='scale'
      id='scale'
      state={this.state.scale}
      def={""}
      onUpdate={this.onLocalUpdate}
      title={_("Variable Range")} />;
    const colormap = <ComboBox
      key='colormap'
      id='colormap'
      state={this.state.colormap}
      def='default'
      onUpdate={this.onLocalUpdate}
      url='/api/colormaps/'
      title={_("Colourmap")}>{_("colourmap_help")}<img src="/colormaps.png" />
    </ComboBox>;
    const dataset_compare = (
      <div key='compare_dataset'>
        <div style={{"display": this.props.dataset_compare ? "block" : "none"}}>
          <Panel
            key='right_map'
            id='right_map'
            collapsible
            defaultExpanded
            header={_("Right Map")}
            bsStyle='primary'
          >

          </Panel>
        </div>
      </div>);


    let observation_data = [];
    let observation_variable = <div></div>;
    if (this.props.point[0][2] !== undefined) {
      if (typeof(this.props.point[0][2]) == "number") {
        observation_variable = <ComboBox
          key='observation_variable'
          id='observation_variable'
          state={this.state.observation_variable}
          url='/api/observationvariables/'
          title={_("Observation Variable")}
          multiple
          onUpdate={this.onLocalUpdate}
        />;
      } 
      else {
        observation_data = this.props.point[0][2].datatypes.map(
          function (o, i) {
            return { id: i, value: o.replace(/ \[.*\]/, "") };
          }
        );
        observation_variable = <ComboBox
          key='observation_variable'
          id='observation_variable'
          state={this.state.observation_variable}
          data={observation_data}
          title={_("Observation Variable")}
          multiple
          onUpdate={this.onLocalUpdate}
        />;
      }
    }

    const hasTempSalinity =
      (
        $.inArray("votemper", this.state.variables) != -1
        ||
        $.inArray("temp", this.state.variables) != -1
      ) && (
        $.inArray("vosaline", this.state.variables) != -1
        ||
        $.inArray("salinity", this.state.variables) != -1
      );

    var inputs = [];

    const plot_query = {
      dataset: this.props.dataset,
      quantum: this.props.quantum,
      point: this.props.point,
      names: this.props.names,
      size: this.state.size,
      dpi: this.state.dpi,
    };

    let active = this.state.selected;
    if (!hasTempSalinity && (
      active == TabEnum.CTD ||
      active == TabEnum.TS ||
      active == TabEnum.SOUND
    )) {
      active = TabEnum.PROFILE;
    }

    switch(active) {
      case TabEnum.PROFILE:
        plot_query.type = "profile";
        plot_query.time = this.props.time;
        plot_query.variable = this.state.variable;
        inputs = [global, dataset, time, profilevariable];
        break;
      case TabEnum.CTD:
        plot_query.type = "profile";
        plot_query.time = this.props.time;
        plot_query.variable = "";
        if ($.inArray("votemper", this.state.variables) != -1) {
          plot_query.variable += "votemper,";
        } else if ($.inArray("temp", this.state.variables) != -1) {
          plot_query.variable += "temp,";
        }
        if ($.inArray("vosaline", this.state.variables) != -1) {
          plot_query.variable += "vosaline";
        } else if ($.inArray("salinity", this.state.variables) != -1) {
          plot_query.variable += "salinity";
        }
        inputs = [global, dataset, time];
        break;
      case TabEnum.TS:
        plot_query.type = "ts";
        plot_query.time = this.props.time;
        if (this.props.dataset_compare) {
          plot_query.compare_to = this.props.dataset_1;
        }

        inputs = [global, dataset, time];
        break;
      case TabEnum.SOUND:
        plot_query.type = "sound";
        plot_query.time = this.props.time;
        inputs = [global, dataset, time];
        break;
      case TabEnum.OBSERVATION:
        plot_query.type = "observation";
        plot_query.observation = this.props.point.map(function (o) {
          return o[2];
        });
        
        plot_query.observation_variable = this.state.observation_variable;
        plot_query.variable = this.state.variable;
        inputs = [global, dataset, observation_variable, profilevariable];
        
        break;
      case TabEnum.MOORING:
        plot_query.type = "timeseries";
        plot_query.variable = this.props.variable;
        plot_query.starttime = this.state.starttime;
        plot_query.endtime = this.props.time;
        plot_query.depth = this.state.depth;
        plot_query.colormap = this.state.colormap;
        plot_query.scale = this.state.scale;

        inputs = [global, dataset, starttime, endtime, variable, depth, scale];
        if (this.state.depth == "all") {
          inputs.push(colormap);
        }

        break;
      case TabEnum.STICK:
        plot_query.type = "stick";
        plot_query.variable = this.state.variable;
        plot_query.starttime = this.state.starttime;
        plot_query.endtime = this.props.time;
        plot_query.depth = this.state.depth;

        inputs = [global, dataset, starttime, endtime, vectorvariable, multidepth];

        break;
    }

    const permlink_subquery = {
      selected: this.state.selected,
      scale: this.state.scale,
      depth: this.state.depth,
      colormap: this.state.colormap,
      starttime: this.state.starttime,
    };

    return (
      <div className='PointWindow Window'>
        <Nav
          bsStyle="tabs"
          activeKey={active}
          onSelect={this.onSelect.bind(this)}>
          <NavItem
            eventKey={TabEnum.PROFILE}>{_("Profile")}</NavItem>
          <NavItem
            eventKey={TabEnum.CTD}
            disabled={!hasTempSalinity}>{_("CTD Profile")}</NavItem>
          <NavItem
            eventKey={TabEnum.TS}
            disabled={!hasTempSalinity}>{_("T/S Diagram")}</NavItem>
          <NavItem
            eventKey={TabEnum.SOUND}
            disabled={!hasTempSalinity}>{_("Sound Speed Profile")}</NavItem>
          <NavItem
            eventKey={TabEnum.STICK}>{_("Stick Plot")}</NavItem>
          <NavItem
            eventKey={TabEnum.OBSERVATION}
            disabled={this.props.point[0][2] === undefined}
          >{_("Observation")}</NavItem>
          <NavItem
            eventKey={TabEnum.MOORING}>{_("Virtual Mooring")}</NavItem>
        </Nav>
        <Row>
          <Col lg={2}>
            {inputs}
          </Col>
          <Col lg={10}>
            <PlotImage
              query={plot_query} // For image saving link.
              permlink_subquery={permlink_subquery}
              action={this.props.action}
            />
          </Col>
        </Row>
      </div>
    );
  }
}

//***********************************************************************
PointWindow.propTypes = {
  generatePermLink: PropTypes.func,
  point: PropTypes.array,
  time: PropTypes.number,
  variable: PropTypes.string,
  dpi: PropTypes.number,
  names: PropTypes.array,
  quantum: PropTypes.string,
  dataset: PropTypes.string,
  onUpdate: PropTypes.func,
  scale: PropTypes.string,
  depth: PropTypes.number,
  init: PropTypes.object,
  action: PropTypes.func,
  dataset_compare: PropTypes.bool,
  swapViews: PropTypes.func,
  showHelp: PropTypes.func,
  dataset_1: PropTypes.object,
};
