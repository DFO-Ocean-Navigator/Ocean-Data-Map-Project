/* eslint react/no-deprecated: 0 */
/*

  Opens Window displaying the Image of a Selected Area

*/

import React from "react";
import {Nav, NavItem, Panel, Row,  Col, Button, 
  FormControl, FormGroup, ControlLabel, DropdownButton, MenuItem} from "react-bootstrap";
import PlotImage from "./PlotImage.jsx";
import ComboBox from "./ComboBox.jsx";
import Range from "./Range.jsx";
import SelectBox from "./SelectBox.jsx";
import ContourSelector from "./ContourSelector.jsx";
import QuiverSelector from "./QuiverSelector.jsx";
import StatsTable from "./StatsTable.jsx";
import ImageSize from "./ImageSize.jsx";
import CustomPlotLabels from "./CustomPlotLabels.jsx";
import DatasetSelector from "./DatasetSelector.jsx";
import Icon from "./Icon.jsx";
import TimePicker from "./TimePicker.jsx";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");
const stringify = require("fast-stable-stringify");

export default class AreaWindow extends React.Component {
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
      dataset_0: {
        dataset: props.dataset_0.dataset,
        variable: props.dataset_0.variable,
        dataset_quantum: props.dataset_0.dataset_quantum,
        time: props.dataset_0.time,
        depth: props.dataset_0.depth,
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
      output_timerange: false,
      output_variables: "",
      output_starttime: props.dataset_0.time,
      output_endtime: props.dataset_0.time,
      output_format: "NETCDF4", // Subset output format
      convertToUserGrid: false,
      zip: false, // Should subset file(s) be zipped
    };

    if (props.init !== null) {
      $.extend(this.state, props.init);
    }

    // Function bindings
    this.onLocalUpdate = this.onLocalUpdate.bind(this);
    this.subsetArea = this.subsetArea.bind(this);
    this.onTabChange = this.onTabChange.bind(this);
    this.updatePlotTitle = this.updatePlotTitle.bind(this);
    this.saveScript = this.saveScript.bind(this);
  }

  componentDidMount() {
    this._mounted = true;
  }

  componentWillUnmount() {
    this._mounted = false;
  }

  componentWillReceiveProps(props) {
    if (this._mounted && stringify(this.props) !== stringify(props)) {

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

      // Update time indices
      if (props.dataset_0.time !== this.state.dataset_0.time) {
        this.setState(
          {
            output_starttime: props.dataset_0.time,
            output_endtime: props.dataset_0.time
          }
        );
      }
    }
  }

  //Updates Plot with User Specified Title
  updatePlotTitle(title) {
    if (title !== this.state.plotTitle) {
      this.setState({plotTitle: title,});
    }
  }

  onLocalUpdate(key, value) {
    if (this._mounted) {

      /*
      // Passthrough to capture selected variables from DatasetSelector for StatsTable
      if (key === "dataset_0") {
        if (this.state.currentTab === 2 && value.hasOwnProperty("variable")) {
          this.setState({
            variable: value.variable
          });
        }

        this.setState({dataset_0: value,});

        // TODO: prevent the navigator trying to get tiles for multiple variables...only one
        // variable should be passed up.
        if (this.state.syncLocalToGlobalState) {
          this.props.onUpdate(key, value);
        }

        return;
      }
      */

      let newState = {};
      if (typeof(key) === "string") {
        newState[key] = value;
      } else {
        for (let i = 0; i < key.length; i++) {
          newState[key[i]] = value[i];
        }
      }
      this.setState(newState);

      if (this.state.syncLocalToGlobalState) {
        this.props.onUpdate(key, value);

        let parentKeys = [];
        let parentValues = [];

        if (newState.hasOwnProperty("variable_scale")) {
          if (typeof(this.state.variable) === "string" ||
            this.state.variable.length === 1) {
            parentKeys.push("variable_scale");
            parentValues.push(newState.variable_scale);
          }
        }

        if (newState.hasOwnProperty("variable")) {
          if (typeof(this.state.variable) === "string") {
            parentKeys.push("variable");
            parentValues.push(newState.variable);
          } else if (this.state.variable.length === 1) {
            parentKeys.push("variable");
            parentValues.push(newState.variable[0]);
          }
        }

        if (parentKeys.length > 0) {
          this.props.onUpdate(parentKeys, parentValues);
        }
      }
    }
  }

  // Find max extents of drawn area
  calculateAreaBoundingBox(area) {
    let lat_min = area.polygons[0][0][0];
    let lat_max = area.polygons[0][0][1];
    let long_min = area.polygons[0][0][0];
    let long_max = area.polygons[0][0][1];

    for (let i = 0; i < area.polygons[0].length; ++i) {
      lat_min = Math.min(lat_min, area.polygons[0][i][0]);
      long_min = Math.min(long_min, area.polygons[0][i][1]);

      lat_max = Math.max(lat_max, area.polygons[0][i][0]);
      long_max = Math.max(long_max, area.polygons[0][i][1]);
    }

    return [lat_min, lat_max, long_min, long_max];
  }

  subsetArea() {
    const AABB = this.calculateAreaBoundingBox(this.props.area[0]);
    
    window.location.href = "/subset/?" +
       "&output_format=" + this.state.output_format +
       "&dataset_name=" + this.state.dataset_0.dataset +
       "&variables=" + this.state.output_variables.join() +
       "&min_range=" + [AABB[0], AABB[2]].join() +
       "&max_range=" + [AABB[1], AABB[3]].join() +
       "&time=" + [this.state.output_starttime, this.state.output_endtime].join() +
       "&user_grid=" + (this.state.convertToUserGrid ? 1 : 0) +
       "&should_zip=" + (this.state.zip ? 1 : 0);
  }

  saveScript(key) {
    const AABB = this.calculateAreaBoundingBox(this.props.area[0]);
    
    let query = {
      "output_format": this.state.output_format,
      "dataset_name": this.state.dataset_0.dataset,
      "variables": this.state.output_variables.join(),
      "min_range": [AABB[0], AABB[2]].join(),
      "max_range": [AABB[1], AABB[3]].join(),
      "time": [this.state.output_starttime, this.state.output_endtime].join(),
      "user_grid": (this.state.convertToUserGrid ? 1:0),
      "should_zip": (this.state.zip ? 1:0)
    };

    window.location.href = window.location.origin + "/api/v1.0/generatescript/" + stringify(query) + "/" + key + "/";
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
    _("Depth");
    _("Variable");
    _("Variable Range");
    _("Colourmap");
    _("Show Bathymetry Contours");
    _("Arrows");
    _("Additional Contours");
    _("Show Selected Area(s)");
    _("Saved Image Size");

    const mapSettings = (<Panel
      collapsible
      defaultExpanded
      header={_("Area Settings")}
      bsStyle='primary'
      key='map_settings'
    >
      <Row>   {/* Contains compare dataset and help button */}
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
        style={{display: this.props.dataset_compare ? "block" : "none"}}
        onClick={this.props.swapViews}
      >
        {_("Swap Views")}
      </Button>

      <div
        style={{display: this.props.dataset_compare &&
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
          url='/api/colormaps/' 
          title={_("Diff. Colourmap")}
        >
          {_("colourmap_help")}
          <img src="/colormaps.png" />
        </ComboBox>
      </div>
      {/* End of Compare Datasets options */}

      <SelectBox 
        key='bathymetry' 
        id='bathymetry' 
        state={this.state.bathymetry} 
        onUpdate={this.onLocalUpdate} 
        title={_("Show Bathymetry Contours")}
      />

      <SelectBox 
        key='showarea' 
        id='showarea' 
        state={this.state.showarea} 
        onUpdate={this.onLocalUpdate} 
        title={_("Show Selected Area(s)")}
      >
        {_("showarea_help")}
      </SelectBox>

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
      ></CustomPlotLabels>
      
    </Panel>);

    const subsetPanel = (<Panel
      key='subset'
      collapsible
      defaultExpanded
      header={_("Subset")}
      bsStyle='primary'
    >
      <form>
        <ComboBox
          id='variable'
          key='variable'
          multiple={true}
          state={this.state.output_variables}
          def={"defaults.dataset"}
          onUpdate={(keys, values) => { this.setState({output_variables: values[0],}); }}
          url={"/api/variables/?vectors&dataset=" + this.state.dataset_0.dataset
          }
          title={_("Variables")}
        />

        <SelectBox
          id='time_range'
          key='time_range'
          state={this.state.output_timerange}
          onUpdate={(key, value) => {this.setState({output_timerange: value,});}}
          title={_("Select Time Range")}
        />

        <TimePicker
          id='starttime'
          key='starttime'
          state={this.state.output_starttime}
          def=''
          quantum={this.state.dataset_0.dataset_quantum}
          url={"/api/timestamps/?dataset=" +
                this.state.dataset_0.dataset +
                "&quantum=" +
                this.state.dataset_0.dataset_quantum}
          title={this.state.output_timerange ? _("Start Time") : _("Time")}
          onUpdate={(key, value) => { this.setState({output_starttime: value,}); }}
          max={this.state.dataset_0.time + 1}
          updateDate={this.updateDate}
        />

        <div style={{display: this.state.output_timerange ? "block" : "none",}}>
          <TimePicker
            id='time'
            key='time'
            state={this.state.output_endtime}
            def=''
            quantum={this.state.dataset_0.dataset_quantum}
            url={"/api/timestamps/?dataset=" +
                this.state.dataset_0.dataset +
                "&quantum=" +
                this.state.dataset_0.dataset_quantum}
            title={_("End Time")}
            onUpdate={(key, value) => { this.setState({output_endtime: value,}); }}
            min={this.state.dataset_0.time}
          />
        </div>

        <FormGroup controlId="output_format">
          <ControlLabel>{_("Output Format")}</ControlLabel>
          <FormControl componentClass="select" onChange={e => { this.setState({output_format: e.target.value,}); }}>
            <option value="NETCDF4">{_("NetCDF-4")}</option>
            <option value="NETCDF3_CLASSIC">{_("NetCDF-3 Classic")}</option>
            <option value="NETCDF3_64BIT">{_("NetCDF-3 64-bit")}</option>
            <option value="NETCDF3_NC" disabled={
              this.state.dataset_0.dataset.indexOf("giops") === -1 &&
              this.state.dataset_0.dataset.indexOf("riops") === -1 // Disable if not a giops or riops dataset
            }>
              {_("NetCDF-3 NC")}
            </option>
            <option value="NETCDF4_CLASSIC">{_("NetCDF-4 Classic")}</option>
          </FormControl>
        </FormGroup>

        {/*
        <SelectBox
          id='convertToUserGrid'
          key='convertToUserGrid'
          state={this.state.convertToUserGrid}
          onUpdate={this.onLocalUpdate}
          title={_("Convert to User Grid")}
        />
*/}        
        <SelectBox 
          id='zip'
          key='zip'
          state={this.state.zip} 
          onUpdate={this.onLocalUpdate} 
          title={_("Compress as *.zip")}
        />

        <Button 
          bsStyle="default" 
          key='save'
          id='save'
          onClick={this.subsetArea}
          disabled={this.state.output_variables == ""}
        ><Icon icon="save" /> {_("Save")}</Button>
        
        <DropdownButton
          id="script"
          title={<span><Icon icon="file-code-o" /> {_("API Scripts")}</span>}
          bsStyle={"default"}
          disabled={this.state.output_variables == ""}
          onSelect={this.saveScript}
          dropup
        >
          <MenuItem
            eventKey="python"
          ><Icon icon="code" /> {_("Python 3")}</MenuItem>
          <MenuItem
            eventKey="r"
          ><Icon icon="code" /> {_("R")}</MenuItem>
        </DropdownButton>
      </form>
    </Panel>
    );

    const globalSettings = (<Panel
      collapsible
      defaultExpanded
      header={_("Global Settings")}
      bsStyle='primary'
      key='global_settings'
    >
      <SelectBox
        id='syncToGlobal'
        key='syncToGlobal'
        state={this.state.syncLocalToGlobalState}
        onUpdate={(key, value) => { this.setState({syncLocalToGlobalState: value,}); } }
        title={_("Sync to Global State")}
      />
    </Panel>
    );

    const dataset = (<Panel
      key='left_map'
      id='left_map'
      collapsible
      defaultExpanded
      header={this.props.dataset_compare ? _("Left Map (Anchor)") : _("Main Map")}
      bsStyle='primary'
    >
      <DatasetSelector 
        key='dataset_0'
        id='dataset_0'
        multiple={this.state.currentTab === 2}
        state={this.state.dataset_0} 
        onUpdate={this.onLocalUpdate}
        depth={true}
      />

      <div style={{"display": this.state.currentTab == 1 ? "block" : "none"}}>
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
          key='leftColormap' 
          id='leftColormap' 
          state={this.state.leftColormap} 
          def='default' 
          onUpdate={this.onLocalUpdate} 
          url='/api/colormaps/' 
          title={_("Colourmap")}
        >
          {_("colourmap_help")}
          <img src="/colormaps.png" />
        </ComboBox>
      </div>
    </Panel>);
    
    const compare_dataset = <div key='compare_dataset'>
      <div style={{"display": this.props.dataset_compare ? "block" : "none"}}>
        <Panel
          key='right_map'
          id='right_map'
          collapsible
          defaultExpanded
          header={_("Right Map")}
          bsStyle='primary'
        >
          <DatasetSelector
            key='dataset_1'
            id='dataset_1'
            state={this.props.dataset_1}
            onUpdate={this.props.onUpdate}
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
            key='rightColormap' 
            id='rightColormap' 
            state={this.state.rightColormap} 
            def='default' 
            onUpdate={this.onLocalUpdate} 
            url='/api/colormaps/' 
            title={_("Colourmap")}
          >
            {_("colourmap_help")}
            <img src="/colormaps.png" />
          </ComboBox>

        </Panel>
      </div>
    </div>;

    let leftInputs = [];
    let rightInputs = [];
    const plot_query = {
      dataset: this.state.dataset_0.dataset,
      quantum: this.state.dataset_0.dataset_quantum,
      scale: this.state.scale,
      name: this.props.name,
    };

    let content = null;
    switch(this.state.currentTab) {
      case 1:
        plot_query.type = "map";
        plot_query.colormap = this.state.leftColormap;
        plot_query.time = this.state.dataset_0.time;
        plot_query.area = this.props.area;
        plot_query.depth = this.state.dataset_0.depth;
        plot_query.bathymetry = this.state.bathymetry;
        plot_query.quiver = this.state.quiver;
        plot_query.contour = this.state.contour;
        plot_query.showarea = this.state.showarea;
        plot_query.variable = this.state.dataset_0.variable; 
        plot_query.projection = this.props.projection;
        plot_query.size = this.state.size;
        plot_query.dpi = this.state.dpi;
        plot_query.interp = this.props.options.interpType;
        plot_query.radius = this.props.options.interpRadius;
        plot_query.neighbours = this.props.options.interpNeighbours;
        plot_query.plotTitle = this.state.plotTitle;
        if (this.props.dataset_compare) {
          plot_query.compare_to = this.props.dataset_1;
          plot_query.compare_to.scale = this.state.scale_1;
          plot_query.compare_to.scale_diff = this.state.scale_diff;
          plot_query.compare_to.colormap = this.state.rightColormap;
          plot_query.compare_to.colormap_diff = this.state.colormap_diff;
        }

        leftInputs = [globalSettings, mapSettings, subsetPanel]; //Left Sidebar
        rightInputs = [dataset];  //Right Sidebar

        if (this.props.dataset_compare) {   //Adds pane to right sidebar when compare is selected
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
        
        leftInputs = [globalSettings, dataset];

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
          <NavItem eventKey={2}>{_("Statistics")}</NavItem>
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
  depth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  area: PropTypes.array,
  time: PropTypes.number,
  generatePermLink: PropTypes.func,
  dataset_1: PropTypes.object,
  dataset_compare: PropTypes.bool,
  variable: PropTypes.string,
  projection: PropTypes.string,
  dataset_0: PropTypes.object,
  quantum: PropTypes.string,
  name: PropTypes.string,
  onUpdate: PropTypes.func,
  scale: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
  init: PropTypes.object,
  action: PropTypes.func,
  showHelp: PropTypes.func,
  swapViews: PropTypes.func,
  scale_1: PropTypes.string,
  options: PropTypes.object,
};
