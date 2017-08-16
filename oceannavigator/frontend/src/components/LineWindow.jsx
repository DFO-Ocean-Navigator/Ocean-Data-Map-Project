import React from "react";
import {Nav, NavItem, Panel} from "react-bootstrap";
import PlotImage from "./PlotImage.jsx";
import ComboBox from "./ComboBox.jsx";
import Range from "./Range.jsx";
import SelectBox from "./SelectBox.jsx";
import NumberBox from "./NumberBox.jsx";
import ImageSize from "./ImageSize.jsx";
import DepthLimit from "./DepthLimit.jsx";
import DatasetSelector from "./DatasetSelector.jsx";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");

export default class LineWindow extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = {
      selected: 1,
      scale: props.scale + ",auto",
      colormap: "default",
      showmap: true,
      surfacevariable: "none",
      linearthresh: 200,
      size: "10x7",
      dpi: 144,
      depth_limit: false,
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
      for (let i = 0; i < key.length; i++) {
        newState[key[i]] = value[i];
      }
    }
    this.setState(newState);
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
    _("Show Location");
    _("Linear Threshold");
    _("Surface Variable");
    _("Saved Image Size");

    /*
      <ComboBox
        key='colormap'
        id='colormap'
        state={this.state.colormap}
        def='default'
        onUpdate={this.onLocalUpdate.bind(this)}
        url='/api/colormaps/'
        title={_("Colourmap")}>{_("colourmap_help")}<img src="/colormaps.png" />
      </ComboBox>
    */

    const global = <Panel 
      collapsible
      defaultExpanded
      header={_("Global Settings")}
      bsStyle='primary'
    >
      <SelectBox
        key='dataset_compare'
        id='dataset_compare'
        state={this.props.dataset_compare}
        onUpdate={this.props.onUpdate}
        title={_("Compare Dataset")}
      />

      <Range
        auto
        key='scale'
        id='scale'
        state={this.state.scale}
        def={""}
        onUpdate={this.onLocalUpdate.bind(this)}
        title={_("Variable Range")}
      />

      <SelectBox
        key='showmap'
        id='showmap'
        state={this.state.showmap}
        onUpdate={this.onLocalUpdate.bind(this)}
        title={_("Show Location")}>{_("showmap_help")}</SelectBox>
        
      <ImageSize
        key='size'
        id='size'
        state={this.state.size}
        onUpdate={this.onLocalUpdate.bind(this)}
        title={_("Saved Image Size")}
      />
    </Panel>;

    const transectSettings = <Panel
      collapsible
      defaultExpanded
      header={_("Transect Settings")}
      bsStyle='primary'
    >
      <ComboBox
        key='surfacevariable'
        id='surfacevariable'
        state={this.state.surfacevariable}
        onUpdate={this.onLocalUpdate.bind(this)}
        title={_("Surface Variable")}
        url={"/api/variables/?dataset=" + this.props.dataset_0.dataset}
      >{_("surfacevariable_help")}</ComboBox>

      <NumberBox
        key='linearthresh'
        id='linearthresh'
        state={this.state.linearthresh}
        onUpdate={this.onLocalUpdate.bind(this)}
        title={_("Linear Threshold")}
      >{_("linearthresh_help")}</NumberBox>

      <DepthLimit
        key='depth_limit'
        id='depth_limit'
        state={this.state.depth_limit}
        onUpdate={this.onLocalUpdate.bind(this)}
      />

    </Panel>;
    
    const dataset = <Panel 
      collapsible
      defaultExpanded
      header={this.props.dataset_compare ? _("Left View") : _("Primary View")}
      bsStyle='primary'
    >
      <DatasetSelector
        key='dataset_0'
        id='dataset_0'
        state={this.props.dataset_0}
        onUpdate={this.props.onUpdate}
        depth={this.state.selected == 2}
        variables={this.state.selected == 2 ? "all" : "3d"}
        time={this.state.selected == 2 ? "range" : "single"}
      />
    </Panel>;
    
    const compare_dataset = <div key='compare_dataset'>
      <div style={{"display": this.props.dataset_compare ? "block" : "none"}}>
        <Panel 
          collapsible
          defaultExpanded
          header={_("Right View")}
          bsStyle='primary'
        >
          <DatasetSelector
            key='dataset_1'
            id='dataset_1'
            state={this.props.dataset_1}
            onUpdate={this.props.onUpdate}
            depth={this.state.selected == 2}
            variables={this.state.selected == 2 ? "all" : "3d"}
            time={this.state.selected == 2 ? "range" : "single"}
          />
        </Panel>
      </div>
    </div>;

    var inputs = [];
    var plot_query = {
      dataset: this.props.dataset_0.dataset,
      quantum: this.props.quantum,
      variable: this.props.variable,
      path: this.props.line[0],
      scale: this.state.scale,
      colormap: this.state.colormap,
      showmap: this.state.showmap,
      name: this.props.names[0],
      size: this.state.size,
      dpi: this.state.dpi,
    };

    switch(this.state.selected) {
      case 1:
        plot_query.type = "transect";
        plot_query.time = this.props.time;
        plot_query.surfacevariable = this.state.surfacevariable;
        plot_query.linearthresh = this.state.linearthresh;
        plot_query.depth_limit = this.state.depth_limit;
        if (this.props.dataset_compare) {
          plot_query.compare_to = this.props.dataset_1;
        }
        inputs = [
          global, dataset, compare_dataset, transectSettings
        ];
        break;
      case 2:
        plot_query.type = "hovmoller";
        plot_query.endtime = this.props.time;
        plot_query.starttime = this.props.starttime;
        plot_query.depth = this.props.depth;
        if (this.props.dataset_compare) {
          plot_query.compare_to = {
            starttime: this.state.starttime_1,
            endtime: this.props.dataset_1.time,
            depth: this.props.dataset_1.depth,
            dataset: this.props.dataset_1.dataset,
            variable: this.props.dataset_1.variable,
          };
        }
        inputs = [
          global, dataset, compare_dataset
        ];
        break;
    }

    return (
      <div className='LineWindow Window'>
        <Nav
          bsStyle="tabs"
          activeKey={this.state.selected}
          onSelect={this.onSelect.bind(this)}
        >
          <NavItem eventKey={1}>{_("Transect")}</NavItem>
          <NavItem eventKey={2}>{_("Hovmöller Diagram")}</NavItem>
        </Nav>
        <div className='content'>
          <div className='inputs'>
            {inputs}
          </div>
          <PlotImage
            query={plot_query}
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
LineWindow.propTypes = {
  generatePermLink: PropTypes.func,
  depth: PropTypes.number,
  time: PropTypes.number,
  dataset_compare: PropTypes.bool,
  dataset_1: PropTypes.object,
  names: PropTypes.array,
  line: PropTypes.array,
  variable: PropTypes.string,
  quantum: PropTypes.string,
  dataset_0: PropTypes.object,
  onUpdate: PropTypes.func,
  scale: PropTypes.string,
  starttime: PropTypes.number,
  init: PropTypes.object,
  action: PropTypes.func,
};
