import React from "react";
import {Nav, NavItem} from "react-bootstrap";
import PlotImage from "./PlotImage.jsx";
import ComboBox from "./ComboBox.jsx";
import TimePicker from "./TimePicker.jsx";
import Range from "./Range.jsx";
import SelectBox from "./SelectBox.jsx";
import ContourSelector from "./ContourSelector.jsx";
import QuiverSelector from "./QuiverSelector.jsx";
import StatsTable from "./StatsTable.jsx";
import ImageSize from "./ImageSize.jsx";
var i18n = require("../i18n.js");

class AreaWindow extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selected: 1,
      scale: props.scale + ",auto",
      colormap: "default",
      showarea: true,
      surfacevariable: "none",
      linearthresh: 200,
      bathymetry: true,
      quiver: {
        variable: "",
        magnitude: "length",
        colormap: "default",
      },
      contour: {
        variable: "",
        colormap: "default",
        levels: "auto",
        legend: true,
        hatch: false,
      },
      variable: [props.variable],
      size: "10x7",
      dpi: 72,
    };

    if (props.init != null) {
      $.extend(this.state, props.init);
    }
  }

  componentWillReceiveProps(props) {
    if (props.depth != this.props.depth) {
      this.setState({
        depth: props.depth,
      });
    }
    if (props.scale != this.props.scale) {
      if (this.state.scale.indexOf("auto") != -1) {
        this.setState({
          scale: props.scale + ",auto"
        });
      } else {
        this.setState({
          scale: props.scale,
        });
      }
    }
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

    if (newState.hasOwnProperty("variable_scale")) {
      if (typeof(this.state.variable) === "string" ||
        this.state.variable.length == 1) {
        parentKeys.push("variable_scale");
        parentValues.push(newState.variable_scale);
      }
    }

    if (newState.hasOwnProperty("variable")) {
      if (typeof(this.state.variable) === "string") {
        parentKeys.push("variable");
        parentValues.push(newState.variable);
      } else if (this.state.variable.length == 1) {
        parentKeys.push("variable");
        parentValues.push(newState.variable[0]);
      }
    }

    if (parentKeys.length > 0) {
      this.props.onUpdate(parentKeys, parentValues);
    }
  }

  onSelect(key) {
    this.setState({
      selected: key
    });
  }

  render() {
    _("Dataset");
    _("Time");
    _("Start Time");
    _("End Time");
    _("Depth");
    _("Variable");
    _("Variable Range");
    _("Colourmap");
    _("Show Bathymetry Contours");
    _("Arrows");
    _("Additional Contours");
    _("Show Selected Area(s)");
    _("Saved Image Size");
    var dataset = <ComboBox 
      key='dataset' 
      id='dataset' 
      state={this.props.dataset} 
      def='' 
      url='/api/datasets/' 
      title={_("Dataset")} 
      onUpdate={this.props.onUpdate} />;
    var time = <TimePicker 
      key='time' 
      id='time' 
      state={this.props.time} 
      def='' 
      quantum={this.props.quantum} 
      url={"/api/timestamps/?dataset=" +
          this.props.dataset +
          "&quantum=" +
          this.props.quantum
      } 
      title={_("Time")} 
      onUpdate={this.props.onUpdate} />;
    var depth = <ComboBox 
      key='depth' 
      id='depth' 
      state={this.props.depth} 
      def={""} 
      onUpdate={this.props.onUpdate.bind(this)} 
      url={"/api/depth/?variable=" +
          this.state.variable +
          "&dataset=" +
          this.props.dataset
      } 
      title={_("Depth")}></ComboBox>;
    var variable = <ComboBox 
      key='variable' 
      id='variable' 
      state={this.props.variable} 
      def='' 
      onUpdate={this.onLocalUpdate.bind(this)} 
      url={"/api/variables/?vectors&dataset="+this.props.dataset + "&anom"} 
      title={_("Variable")}><h1>{_("Variable")}</h1></ComboBox>;
    var multivariable = <ComboBox 
      key='variable' 
      id='variable' 
      multiple 
      state={this.state.variable} 
      def='' 
      onUpdate={this.onLocalUpdate.bind(this)} 
      url={"/api/variables/?dataset="+this.props.dataset + "&anom"} 
      title={_("Variable")}><h1>{_("Variable")}</h1></ComboBox>;
    var scale = <Range 
      auto 
      key='scale' 
      id='scale' 
      state={this.state.scale} 
      def={""} 
      onUpdate={this.onLocalUpdate.bind(this)} 
      title={_("Variable Range")} />;
    var colormap = <ComboBox 
      key='colormap' 
      id='colormap' 
      state={this.state.colormap} 
      def='default' 
      onUpdate={this.onLocalUpdate.bind(this)} 
      url='/api/colormaps/' 
      title={_("Colourmap")}>{_("colourmap_help")}<img src="/colormaps.png" /></ComboBox>;
    var bathymetry = <SelectBox 
      key='bathymetry' 
      id='bathymetry' 
      state={this.state.bathymetry} 
      onUpdate={this.onLocalUpdate.bind(this)} 
      title={_("Show Bathymetry Contours")} />;
    var quiver = <QuiverSelector 
      key='quiver' 
      id='quiver' 
      state={this.state.quiver} 
      def='' 
      onUpdate={this.onLocalUpdate.bind(this)} 
      dataset={this.props.dataset} 
      title={_("Arrows")}>{_("arrows_help")}</QuiverSelector>;
    var contour = <ContourSelector 
      key='contour' 
      id='contour' 
      state={this.state.contour} 
      def='' 
      onUpdate={this.onLocalUpdate.bind(this)} 
      dataset={this.props.dataset} 
      title={_("Additional Contours")}>{_("contour_help")}</ContourSelector>;
    var showarea = <SelectBox 
      key='showarea' 
      id='showarea' 
      state={this.state.showarea} 
      onUpdate={this.onLocalUpdate.bind(this)} 
      title={_("Show Selected Area(s)")}>{_("showarea_help")}</SelectBox>;
    var size = <ImageSize 
      key='size' 
      id='size' 
      state={this.state.size} 
      onUpdate={this.onLocalUpdate.bind(this)} 
      title={_("Saved Image Size")} />;

    var inputs = [];
    var plot_query = {
      dataset: this.props.dataset,
      quantum: this.props.quantum,
      scale: this.state.scale,
      colormap: this.state.colormap,
      name: this.props.name,
    };

    var content = "";
    switch(this.state.selected) {
      case 1:
        plot_query.type = "map";
        plot_query.time = this.props.time;
        plot_query.area = this.props.area;
        plot_query.depth = this.props.depth;
        plot_query.bathymetry = this.state.bathymetry;
        plot_query.quiver = this.state.quiver;
        plot_query.contour = this.state.contour;
        plot_query.showarea = this.state.showarea;
        plot_query.variable = this.props.variable;
        plot_query.projection = this.props.projection;
        plot_query.size = this.state.size;
        plot_query.dpi = this.state.dpi;
        inputs = [
          dataset, time, showarea, variable, depth, scale, colormap,
          bathymetry, quiver, contour, size
        ];

        content = <PlotImage
          query={plot_query}
          permlink={this.props.generatePermLink(this.state)}
        />;
        break;
      case 2:
        plot_query.time = this.props.time;
        plot_query.area = this.props.area;
        plot_query.depth = this.props.depth;
        if (this.state.variable.join != undefined) {
          plot_query.variable = this.state.variable.join(",");
        } else {
          plot_query.variable = this.state.variable;
        }
        inputs = [dataset, time, multivariable, depth];
        content = <StatsTable query={plot_query}/>;
        break;
    }

    return (
            <div className='AreaWindow Window'>
              <Nav
                bsStyle="tabs"
                activeKey={this.state.selected}
                onSelect={this.onSelect.bind(this)}
              >
                    <NavItem eventKey={1}>{_("Map")}</NavItem>
                    <NavItem eventKey={2}>{_("Statistics")}</NavItem>
                </Nav>
                <div className='content'>
                    <div className='inputs'>
                        {inputs}
                    </div>
                    {content}
                    <br className='clear' />
                </div>
            </div>
    );
  }
}

export default AreaWindow;
