/* eslint react/no-deprecated: 0 */
/*

  Opens Window displaying the Image of a Selected Area

*/

import React from "react";
import {Nav, NavItem, Panel, Row,  Col, Button} from "react-bootstrap";
import PlotImage from "./PlotImage.jsx";
import ComboBox from "./ComboBox.jsx";
import Range from "./Range.jsx";
import CheckBox from "./lib/CheckBox.jsx";
import ContourSelector from "./ContourSelector.jsx";
import QuiverSelector from "./QuiverSelector.jsx";
import StatsTable from "./StatsTable.jsx";
import ImageSize from "./ImageSize.jsx";
import CustomPlotLabels from "./CustomPlotLabels.jsx";
import DatasetSelector from "./DatasetSelector.jsx";
import SubsetPanel from "./SubsetPanel.jsx";
import PropTypes from "prop-types";
import Accordion from "./lib/Accordion.jsx";

import { withTranslation } from "react-i18next";

class AreaWindow extends React.Component {
  constructor(props) {
    super(props);

    // Track if mounted to prevent no-op errors with the Ajax callbacks.
    this._mounted = false;
    
    this.state = {
      currentTab: 1, // Currently selected tab
      scale: props.scale + ",auto",
      scale_1: props.scale_1 + ",auto",
      scale_diff: "-10,10,auto",
      leftColormap: "default",
      rightColormap: "default",
      colormap_diff: "default",
      dataset_compare: props.dataset_compare,
      dataset_0: {
        dataset: props.dataset_0.dataset,
        variable: props.dataset_0.variable,
        quantum: props.dataset_0.quantum,
        time: props.dataset_0.time,
        depth: props.dataset_0.depth,
      },
      dataset_1: {
        dataset: props.dataset_1.dataset,
        variable: props.dataset_1.variable,
        quantum: props.dataset_1.quantum,
        time: props.dataset_1.time,
        depth: props.dataset_1.depth,
      },
      // Should dataset/variable changes in this window
      // propagate to the entire site?
      syncLocalToGlobalState: false,
      showarea: true,
      surfacevariable: "none",
      linearthresh: 200,
      bathymetry: true, // Show bathymetry on map
      plotTitle: undefined,
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
      size: "10x7", // Plot dimensions
      dpi: 144, // Plot DPI
    };

    if (props.init !== null) {
      $.extend(this.state, props.init);
    }

    // Function bindings
    this.onLocalUpdate = this.onLocalUpdate.bind(this);
    this.onTabChange = this.onTabChange.bind(this);
    this.updatePlotTitle = this.updatePlotTitle.bind(this);
  }

  componentDidMount() {
    this._mounted = true;
  }

  componentWillUnmount() {
    this._mounted = false;
  }

  //Updates Plot with User Specified Title
  updatePlotTitle(title) {
    if (title !== this.state.plotTitle) {
      this.setState({plotTitle: title,});
    }
  }

  onLocalUpdate(key, value) {
    if (this._mounted) {
      if (key === "dataset_0") {
        this.setState(prevState => ({
          dataset_0: {
            ...prevState.dataset_0,
            ...value
          }
        }));      
        return;
      }
      
      if (key === "dataset_1") {
        this.setState(prevState => ({
          dataset_1: {
            ...prevState.dataset_1,
            ...value
          }
        }));
        return;
      }

      let newState = {};
      if (typeof(key) === "string") {
        newState[key] = value;
      } else {
        for (let i = 0; i < key.length; i++) {
          newState[key[i]] = value[i];
        }
      }
      this.setState(newState);
    }
  }

  onTabChange(index) {
    this.setState({
      currentTab: index,
    });
  }

  render() {
    _("Dataset");
    _("Time");
    _("Start Time");
    _("End Time");
    _("Variable");
    _("Variable Range");
    _("Colourmap");
    _("Show Bathymetry Contours");
    _("Arrows");
    _("Additional Contours");
    _("Show Selected Area(s)");
    _("Saved Image Size");

    const plotOptions = (<div>
      {/* Image Size Selection */}
      <ImageSize 
        key='size' 
        id='size' 
        state={this.state.size} 
        onUpdate={this.onLocalUpdate} 
        title={_("Saved Image Size")} 
      ></ImageSize>

      {/* Plot Title */}
      <CustomPlotLabels
        key='title'
        id='title'
        title={_("Plot Title")}
        updatePlotTitle={this.updatePlotTitle}
        plotTitle={this.state.plotTitle}
      />
    </div>);

    const mapSettings = (<Panel 
      defaultExpanded
      bsStyle='primary'
      key='map_settings'
    >
      <Panel.Heading>{_("Area Settings")}</Panel.Heading>
      <Panel.Collapse>
        <Panel.Body>
          <Row>
            <Col xs={9}> 
              <CheckBox
                id='dataset_compare'
                key='dataset_compare'
                checked={this.state.dataset_compare}
                onUpdate={(_, checked) => { this.setState({dataset_compare: checked}); }}
                title={_("Compare Datasets")}
              />
            </Col>
            <Col xs={3}>
              <Button 
                bsStyle="link"
                key='show_help'
                onClick={this.props.showHelp}
              >
                {_("Help")}
              </Button>
            </Col>
          </Row>
        
          {/* Displays Options for Compare Datasets */}
          <Button
            bsStyle="default"
            key='swap_views'
            block
            style={{display: this.state.dataset_compare ? "block" : "none"}}
            onClick={this.props.swapViews}
          >
            {_("Swap Views")}
          </Button>

          <div
            style={{display: this.state.dataset_compare &&
                    this.state.dataset_0.variable == this.props.dataset_1.variable ? "block" : "none"}}
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
            <ComboBox 
              key='colormap_diff' 
              id='colormap_diff' 
              state={this.state.colormap_diff} 
              def='default' 
              onUpdate={this.onLocalUpdate} 
              url='/api/v2.0/plot/colormaps' 
              title={_("Diff. Colourmap")}
            >
              {_("colourmap_help")}
              <img src="/api/v2.0/plot/colormaps.png/" />
            </ComboBox>
          </div>
          {/* End of Compare Datasets options */}

          <CheckBox 
            key='bathymetry' 
            id='bathymetry' 
            checked={this.state.bathymetry} 
            onUpdate={this.onLocalUpdate} 
            title={_("Show Bathymetry Contours")}
          />

          <CheckBox 
            key='showarea' 
            id='showarea' 
            checked={this.state.showarea} 
            onUpdate={this.onLocalUpdate} 
            title={_("Show Selected Area(s)")}
          >
            {_("showarea_help")}
          </CheckBox>

          {/* Arror Selector Drop Down menu */}
          <QuiverSelector 
            key='quiver' 
            id='quiver' 
            state={this.state.quiver} 
            def='' 
            onUpdate={this.onLocalUpdate} 
            dataset={this.state.dataset_0.dataset} 
            title={_("Arrows")}
          >
            {_("arrows_help")}
          </QuiverSelector>

          {/* Contour Selector drop down menu */}
          <ContourSelector 
            key='contour' 
            id='contour' 
            state={this.state.contour} 
            def='' 
            onUpdate={this.onLocalUpdate} 
            dataset={this.state.dataset_0.dataset} 
            title={_("Additional Contours")}
          >
            {_("contour_help")}
          </ContourSelector>
          <Accordion id='area_accordion' title={"Plot Options"} content={plotOptions} />
        </Panel.Body>
      </Panel.Collapse>
    </Panel>);

    const subsetPanel = <SubsetPanel 
      id='SubsetPanel'
      key='SubsetPanel'
      dataset={this.props.dataset_0}
      area={this.props.area}
    />

    const dataset = (<Panel
      key='left_map'
      id='left_map'
      defaultExpanded
      bsStyle='primary'
    >
      <Panel.Heading>
        {this.state.dataset_compare ? _("Left Map (Anchor)") : _("Main Map")}
      </Panel.Heading>
      <Panel.Collapse>
        <Panel.Body>
          <DatasetSelector 
            key='area_window_dataset_0'
            id='dataset_0'
            onUpdate={this.props.onUpdate}
            showQuiverSelector={false}
            showVariableRange={false}
            options={this.props.options}
            mountedDataset={this.props.dataset_0.dataset}
            mountedVariable={this.props.dataset_0.variable}
          />

          <div style={{"display": this.state.currentTab == 1 ? "block" : "none"}}>
            <ComboBox 
              key='leftColormap' 
              id='leftColormap' 
              state={this.state.leftColormap} 
              def='default' 
              onUpdate={this.onLocalUpdate} 
              url='/api/v2.0/plot/colormaps' 
              title={_("Colourmap")}
            >
              {_("colourmap_help")}
              <img src="/api/v2.0/plot/colormaps.png/" />
            </ComboBox>
          </div>
        </Panel.Body>
      </Panel.Collapse>
    </Panel>);
    
    const compare_dataset = <div key='compare_dataset'>
      <div style={{"display": this.state.dataset_compare ? "block" : "none"}}>
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
                key='area_window_dataset_1'
                id='dataset_1'
                onUpdate={this.props.onUpdate}
                showQuiverSelector={false}
                showVariableRange={false}
                options={this.props.options}
                mountedDataset={this.props.dataset_1.dataset}
                mountedVariable={this.props.dataset_1.variable}
              />

              <div style={{ "display": this.state.currentTab == 1 ? "block" : "none" }}>
                <ComboBox 
                  key='rightColormap' 
                  id='rightColormap' 
                  state={this.state.rightColormap} 
                  def='default' 
                  onUpdate={this.onLocalUpdate} 
                  url='/api/v2.0/plot/colormaps' 
                  title={_("Colourmap")}
                >
                  {_("colourmap_help")}
                  <img src="/api/v2.0/plot/colormaps.png/" />
                </ComboBox>
              </div>
            </Panel.Body>
          </Panel.Collapse>
        </Panel>
      </div>
    </div>;

    let leftInputs = [];
    let rightInputs = [];
    const plot_query = {
      dataset: this.props.dataset_0.dataset,
      quantum: this.props.dataset_0.quantum,
      scale: this.state.scale,
      name: this.props.name,
    };

    let content = null;
    switch(this.state.currentTab) {
      case 1:
        plot_query.type = "map";
        plot_query.colormap = this.state.leftColormap;
        plot_query.time = this.props.dataset_0.time;
        plot_query.area = this.props.area;
        plot_query.depth = this.state.dataset_0.depth;
        plot_query.bathymetry = this.state.bathymetry;
        plot_query.quiver = this.state.quiver;
        plot_query.contour = this.state.contour;
        plot_query.showarea = this.state.showarea;
        plot_query.variable = this.props.dataset_0.variable; 
        plot_query.projection = this.props.projection;
        plot_query.size = this.state.size;
        plot_query.dpi = this.state.dpi;
        plot_query.interp = this.props.options.interpType;
        plot_query.radius = this.props.options.interpRadius;
        plot_query.neighbours = this.props.options.interpNeighbours;
        plot_query.plotTitle = this.state.plotTitle;
        if (this.state.dataset_compare) {
          plot_query.compare_to = this.props.dataset_1;
          plot_query.compare_to.scale = this.state.scale_1;
          plot_query.compare_to.scale_diff = this.state.scale_diff;
          plot_query.compare_to.colormap = this.state.rightColormap;
          plot_query.compare_to.colormap_diff = this.state.colormap_diff;
        }

        leftInputs = [mapSettings, subsetPanel]; //Left Sidebar
        rightInputs = [dataset];  //Right Sidebar

        if (this.state.dataset_compare) {   //Adds pane to right sidebar when compare is selected
          rightInputs.push(compare_dataset);
        }
        content = <PlotImage
          query={plot_query} // For image saving link.
          permlink_subquery={this.state}
          action={this.props.action}
        />;
        break;
      case 2:
        plot_query.time = this.state.dataset_0.time;
        plot_query.area = this.props.area;
        plot_query.depth = this.state.dataset_0.depth;
        if (Array.isArray(this.state.dataset_0.variable)) {
          // Multiple variables were selected
          plot_query.variable = this.state.dataset_0.variable.join(",");
        } else {
          plot_query.variable = this.state.dataset_0.variable;
        }
        
        leftInputs = [dataset];

        content = <StatsTable query={plot_query}/>;
        break;
    }

    return (
      <div className='AreaWindow Window'>
        <Nav
          bsStyle="tabs"
          activeKey={this.state.currentTab}
          onSelect={this.onTabChange}
        >
          <NavItem eventKey={1}>{_("Map")}</NavItem>
        </Nav>
        <Row>
          <Col lg={2}>
            {leftInputs}
          </Col>
          <Col lg={8}>
            {content}
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
AreaWindow.propTypes = {
  area: PropTypes.array.isRequired,
  eneratePermLink: PropTypes.func,
  dataset_1: PropTypes.object.isRequired,
  dataset_compare: PropTypes.bool,
  variable: PropTypes.string,
  projection: PropTypes.string,
  dataset_0: PropTypes.object.isRequired,
  name: PropTypes.string,
  onUpdate: PropTypes.func,
  init: PropTypes.object,
  action: PropTypes.func,
  showHelp: PropTypes.func,
  swapViews: PropTypes.func,
  options: PropTypes.object,
};

export default withTranslation()(AreaWindow);