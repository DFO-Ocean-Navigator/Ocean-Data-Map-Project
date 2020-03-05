/* eslint react/no-deprecated: 0 */
/*

  Opens Window displaying the Image corresponding to a Selected Line

*/
import React from "react";
import {Nav, NavItem, Panel, Row, Col, Button} from "react-bootstrap";
import PlotImage from "./PlotImage.jsx";
import ComboBox from "./ComboBox.jsx";
import Range from "./Range.jsx";
import SelectBox from "./SelectBox.jsx";
import NumberBox from "./NumberBox.jsx";
import ImageSize from "./ImageSize.jsx";
import DepthLimit from "./DepthLimit.jsx";
import DatasetSelector from "./DatasetSelector.jsx";
import PropTypes from "prop-types";
import CustomPlotLabels from "./CustomPlotLabels.jsx";


const i18n = require("../i18n.js");
const stringify = require("fast-stable-stringify");

export default class LineWindow extends React.Component {
  constructor(props) {
    super(props);

    // Track if mounted to prevent no-op errors with the Ajax callbacks.
    this._mounted = false;
    
    this.state = {
      selected: 1,
      scale: props.scale + ",auto",
      scale_1: props.scale_1 + ",auto",
      scale_diff: "-10,10,auto",
      colormap: "default",
      colormap_right: "default", // Colourmap for second (right) plot
      colormap_diff: "default", // Colourmap for difference plot
      showmap: true,
      surfacevariable: "none",
      linearthresh: 200,
      size: "10x7",
      dpi: 144,
      depth_limit: false,
      plotTitles: Array(2).fill(""),
      selectedPlots: [0, 1, 1]
    };

    if (props.init !== null) {
      $.extend(this.state, props.init);
    }

    // Function bindings
    this.onLocalUpdate = this.onLocalUpdate.bind(this);
    this.onSelect = this.onSelect.bind(this);
    this.updatePlotTitle = this.updatePlotTitle.bind(this);
    this.updateSelectedPlots = this.updateSelectedPlots.bind(this);
  }

  componentDidMount() {
    this._mounted = true;
  }

  componentWillUnmount() {
    this._mounted = false;
  }

  componentWillReceiveProps(props) {

    if (stringify(this.props) !== stringify(props) && this._mounted) {

      if (props.depth !== this.props.depth) {
        this.setState({
          depth: props.depth,
        });
      }
      if (props.scale !== this.props.scale) {
        if (this.state.scale.indexOf("auto") !== -1) {
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
  }

  //Updates Plot with User Specified Title
  updatePlotTitle (title) {
    if (title !== this.state.plotTitles[this.state.selected - 1]) {   //If new plot title
      const newTitles = this.state.plotTitles;
      newTitles[this.state.selected - 1] = title;
      this.setState({plotTitles: newTitles,});   //Update Plot Title
    }
  }

  updateSelectedPlots (plots_selected, compare) {

    let temp = [1, 0, 0];
    
    if(plots_selected[0]) {
      temp[0] = 1;
    } else {
      temp[0] = 0;
    }
    if(plots_selected[1]) {
      temp[1] = 1;
    } else {
      temp[1] = 0;
    }
    if(plots_selected[2]) {
      temp[2] = 1;
    } else {
      temp[2] = 0;
    }

    if (compare) {
      this.setState({
        comparePlots: temp, 
      });
    } else {
      this.setState({
        selectedPlots: temp,
      });
    }
    
  }

  onLocalUpdate(key, value) {
    if (this._mounted) {
      
      var newState = {};
      if (typeof(key) === "string") {
        newState[key] = value;
      } 
      else {
        for (let i = 0; i < key.length; ++i) {
          newState[key[i]] = value[i];
        }
      }
      
      this.setState(newState);
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
    _("Show Location");
    _("Linear Threshold");
    _("Surface Variable");
    _("Saved Image Size");

    const global = (<Panel 
      key='global_settings'
      id='global_settings'
      defaultExpanded
      bsStyle='primary'
    >
      <Panel.Heading>{_("Global Settings")}</Panel.Heading>
      <Panel.Collapse>
        <Panel.Body>
          <Row>
            <Col xs={9}>
              <SelectBox
                id='dataset_compare'
                key='dataset_compare'
                state={this.props.dataset_compare}
                onUpdate={this.props.onUpdate}
                title={_("Compare Datasets")}
              />
            </Col>
            <Col xs={3}>
              <Button 
                bsStyle="link"
                key='show_help'
                id='show_help'
                onClick={this.props.showHelp}
              >
                {_("Help")}
              </Button>
            </Col>
          </Row>
          <Button
            key='swap_views'
            id='swap_views'
            bsStyle="default"
            block
            style={{display: this.props.dataset_compare ? "block" : "none"}}
            onClick={this.props.swapViews}
          >
            {_("Swap Views")}
          </Button>
          
          {/*Show range widget for difference plot iff in compare mode and both variables are equal*/}
          <div
            style={{display: this.props.dataset_compare &&
                            this.props.dataset_0.variable == this.props.dataset_1.variable ? "block" : "none"}}
          >
            <Range
              auto
              key='scale_diff'
              id='scale_diff'
              state={this.state.scale_diff}
              def={""}
              onUpdate={this.onLocalUpdate}
              title={_("Diff. Variable Range")}
            />
          </div>

          <SelectBox
            key='showmap'
            id='showmap'
            state={this.state.showmap}
            onUpdate={this.onLocalUpdate}
            title={_("Show Map Location")}
          >
            {_("showmap_help")}
          </SelectBox>
            
          <ImageSize
            key='size'
            id='size'
            state={this.state.size}
            onUpdate={this.onLocalUpdate}
            title={_("Saved Image Size")}
          />
          <CustomPlotLabels
            key='title'
            id='title'
            title={_("Plot Title")}
            updatePlotTitle={this.updatePlotTitle}
            plotTitle={this.state.plotTitles[this.state.selected - 1]}
          ></CustomPlotLabels>
        </Panel.Body>
      </Panel.Collapse>
    </Panel>);

    const transectSettings = <Panel
      key='transect_settings'
      id='transect_settings'
      defaultExpanded
      bsStyle='primary'
    >
      <Panel.Heading>{_("Transect Settings")}</Panel.Heading>
      <Panel.Collapse>
        <Panel.Body>
          <ComboBox
            key='surfacevariable'
            id='surfacevariable'
            state={this.state.surfacevariable}
            onUpdate={this.onLocalUpdate}
            title={_("Surface Variable")}
            url={"/api/v1.0/variables/?dataset=" + this.props.dataset_0.dataset}
          >{_("surfacevariable_help")}</ComboBox>

          <NumberBox
            key='linearthresh'
            id='linearthresh'
            state={this.state.linearthresh}
            onUpdate={this.onLocalUpdate}
            title={_("Linear Threshold")}
          >{_("linearthresh_help")}</NumberBox>

          <DepthLimit
            key='depth_limit'
            id='depth_limit'
            state={this.state.depth_limit}
            onUpdate={this.onLocalUpdate}
          />

          <div
            style={{display: this.props.dataset_compare &&
                            this.props.dataset_0.variable == this.props.dataset_1.variable ? "block" : "none"}}>
            <ComboBox
              key='colormap_diff'
              id='colormap_diff'
              state={this.state.colormap_diff}
              def='default'
              onUpdate={this.onLocalUpdate}
              url='/api/v1.0/colormaps/'
              title={_("Diff. Colour Map")}>{_("colourmap_help")}<img src="/colormaps.png" />
            </ComboBox>
          </div>
        </Panel.Body>
      </Panel.Collapse>
    </Panel>;
    
    const dataset = <Panel 
      key='left_map'
      id='left_map'
      defaultExpanded
      bsStyle='primary'
    >
      <Panel.Heading>
        {this.props.dataset_compare ? _("Left Map (Anchor)") : _("Main Map")}
      </Panel.Heading>
      <Panel.Collapse>
        <Panel.Body>
          <DatasetSelector
            key='dataset_0'
            id='dataset_0'
            state={this.props.dataset_0}
            onUpdate={this.props.onUpdate}
            depth={this.state.selected == 2}
            variables={this.state.selected == 2 ? "all" : "3d"}
            time={this.state.selected == 2 ? "range" : "single"}
            line={true}
            updateSelectedPlots={this.updateSelectedPlots}
            compare={this.props.dataset_compare}
          />

          <Range
            auto
            key='scale'
            id='scale'
            state={this.state.scale}
            def={""}
            onUpdate={this.onLocalUpdate}
            title={_("Variable Range")}
          />

          <ComboBox
            key='colormap'
            id='colormap'
            state={this.state.colormap}
            def='default'
            onUpdate={this.onLocalUpdate}
            url='/api/v1.0/colormaps/'
            title={_("Colour Map")}>{_("colourmap_help")}<img src="/colormaps.png" />
          </ComboBox>
        </Panel.Body>
      </Panel.Collapse>
    </Panel>;
    
    const compare_dataset = 
    <div key='compare_dataset'>
      
      <Panel 
        key='right_map'
        id='right_map'
        defaultExpanded
        bsStyle='primary'
      >
        <Panel.Heading>{_("Right Map")}</Panel.Heading>
        <Panel.Collapse>
          <Panel.Body>
            <DatasetSelector
              key='dataset_1'
              id='dataset_1'
              state={this.props.dataset_1}
              onUpdate={this.props.onUpdate}
              depth={this.state.selected == 2}
              variables={this.state.selected == 2 ? "all" : "3d"}
              time={this.state.selected == 2 ? "range" : "single"}
            />
            <Range
              auto
              key='scale_1'
              id='scale_1'
              state={this.state.scale_1}
              def={""}
              onUpdate={this.onLocalUpdate}
              title={_("Variable Range")}
            />
            <ComboBox
              key='colormap_right'
              id='colormap_right'
              state={this.state.colormap_right}
              def='default'
              onUpdate={this.onLocalUpdate}
              url='/api/v1.0/colormaps/'
              title={_("Colour Map")}>{_("colourmap_help")}<img src="/colormaps.png" />
            </ComboBox>
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
      
    </div>;

    // Input panels
    const leftInputs = [global];
    const rightInputs = [dataset];
    if (this.props.dataset_compare) {
      rightInputs.push(compare_dataset);
    }
    const plot_query = {
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
      plotTitle: this.state.plotTitles[this.state.selected - 1],
    };

    switch(this.state.selected) {
      case 1:
        plot_query.type = "transect";
        plot_query.time = this.props.time;
        plot_query.surfacevariable = this.state.surfacevariable;
        plot_query.linearthresh = this.state.linearthresh;
        plot_query.depth_limit = this.state.depth_limit;
        plot_query.selectedPlots = this.state.selectedPlots.toString();
        if (this.props.dataset_compare) {
          plot_query.compare_to = this.props.dataset_1;
          plot_query.compare_to.scale = this.state.scale_1;
          plot_query.compare_to.scale_diff = this.state.scale_diff;
          plot_query.compare_to.colormap = this.state.colormap_right;
          plot_query.compare_to.colormap_diff = this.state.colormap_diff;
        }
        leftInputs.push(transectSettings);
        break;
      case 2:
        plot_query.type = "hovmoller";
        plot_query.endtime = this.props.time;
        plot_query.starttime = this.props.dataset_0.starttime;
        plot_query.depth = this.props.depth;
        if (this.props.dataset_compare) {
          plot_query.compare_to = this.props.dataset_1;
          plot_query.compare_to.scale = this.state.scale_1;
          plot_query.compare_to.scale_diff = this.state.scale_diff;
          plot_query.compare_to.colormap = this.state.colormap_right;
          plot_query.compare_to.colormap_diff = this.state.colormap_diff;
        }
        break;
    }

    return (
      <div className='LineWindow Window'>
        <Nav
          bsStyle="tabs"
          activeKey={this.state.selected}
          onSelect={this.onSelect}
        >
          <NavItem eventKey={1}>{_("Transect")}</NavItem>
          <NavItem eventKey={2}>{_("Hovmöller Diagram")}</NavItem>
        </Nav>
        <Row>
          <Col lg={2}>
            {leftInputs}
          </Col>
          <Col lg={8}>
            <PlotImage
              query={plot_query}
              permlink_subquery={this.state}
              action={this.props.action}
            />
          </Col>
          <Col lg={2}>
            {rightInputs}
          </Col>
        </Row>
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
  scale: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
  scale_1: PropTypes.string,
  init: PropTypes.object,
  action: PropTypes.func,
  swapViews: PropTypes.func,
  showHelp: PropTypes.func,
};
