import React from "react";
import {Nav, NavItem, Panel, Row,  Col, Button, 
  FormControl, FormGroup, ControlLabel} from "react-bootstrap";
import PlotImage from "./PlotImage.jsx";
import ComboBox from "./ComboBox.jsx";
import Range from "./Range.jsx";
import SelectBox from "./SelectBox.jsx";
import ContourSelector from "./ContourSelector.jsx";
import QuiverSelector from "./QuiverSelector.jsx";
import StatsTable from "./StatsTable.jsx";
import ImageSize from "./ImageSize.jsx";
import DatasetSelector from "./DatasetSelector.jsx";
import Icon from "./Icon.jsx";
import TimePicker from "./TimePicker.jsx";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");

export default class AreaWindow extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = {
      selected: 1,
      scale: props.scale + ",auto",
      scale_1: props.scale_1 + ",auto",
      scale_diff: "-10,10,auto",
      leftColormap: "default",
      rightColormap: "default",
      colormap_diff: "default",
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
      dpi: 144,
      output_timerange: false,
      output_variables: "",
      output_starttime: props.dataset_0.time,
      output_endtime: props.dataset_0.time,
      output_format: "NETCDF3_CLASSIC",
      zip: false,
    };

    if (props.init !== null) {
      $.extend(this.state, props.init);
    }

    // Function bindings
    this.onLocalUpdate = this.onLocalUpdate.bind(this);
    this.saveData = this.saveData.bind(this);
    this.onSelect = this.onSelect.bind(this);
  }

  componentWillReceiveProps(props) {
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

    // Update time indices
    if (props.dataset_0.time !== this.props.dataset_0.time) {
      this.setState(
        {
          output_starttime: props.dataset_0.time,
          output_endtime: props.dataset_0.time
        }
      );
    }
  }

  onLocalUpdate(key, value) {

    // Passthrough to capture selected variables from DatasetSelector for StatsTable
    if (key === "dataset_0") {
      if (this.state.selected === 2 && value.hasOwnProperty("variable")) {
        this.setState({variable: value.variable});
      }
      // TODO: prevent the navigator trying to get tiles for multiple variables...only one
      // variable should be passed up.
      this.props.onUpdate(key, value);
      return;
    }

    var newState = {};
    if (typeof(key) === "string") {
      newState[key] = value;
    } else {
      for (let i = 0; i < key.length; i++) {
        newState[key[i]] = value[i];
      }
    }
    this.setState(newState);

    var parentKeys = [];
    var parentValues = [];

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

  test(e) {
    console.warn(e.target.value);
  }

  saveData(key) {
    // Find max extents of drawn area
    let lat_min = this.props.area[0].polygons[0][0][0];
    let lat_max = this.props.area[0].polygons[0][0][1];
    let long_min = this.props.area[0].polygons[0][0][0];
    let long_max = this.props.area[0].polygons[0][0][1];

    for (const i in this.props.area[0].polygons[0]) {
      lat_min = Math.min(lat_min, this.props.area[0].polygons[0][i][0]);
      long_min = Math.min(long_min, this.props.area[0].polygons[0][i][1]);

      lat_max = Math.max(lat_max, this.props.area[0].polygons[0][i][0]);
      long_max = Math.max(long_max, this.props.area[0].polygons[0][i][1]);
    }

    window.location.href =  `/api/subset/${this.state.output_format}/` + 
                            `${this.props.dataset_0.dataset}/` + 
                            `${this.state.output_variables.join()}/` + // Comma-separate selected variables
                            `${lat_min},${long_min}/` +
                            `${lat_max},${long_max}/` + 
                            `${this.state.output_starttime},${this.state.output_endtime}/`+
                            `${this.state.zip ? 1 : 0}`;
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

    const mapSettings= (<Panel
      collapsible
      defaultExpanded
      header={_("Area Settings")}
      bsStyle='primary'
    >
      <Row>
        <Col xs={9}>
          <SelectBox
            id='dataset_compare'
            state={this.props.dataset_compare}
            onUpdate={this.props.onUpdate}
            title={_("Compare Datasets")}
          />
        </Col>
        <Col xs={3}>
          <Button 
            bsStyle="link"
            onClick={this.props.showHelp}
          >
            {_("Help")}
          </Button>
        </Col>
      </Row>
      <Button
        bsStyle="default"
        block
        style={{display: this.props.dataset_compare ? "block" : "none"}}
        onClick={this.props.swapViews}
      >
        {_("Swap Views")}
      </Button>

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

      <QuiverSelector 
        key='quiver' 
        id='quiver' 
        state={this.state.quiver} 
        def='' 
        onUpdate={this.onLocalUpdate} 
        dataset={this.props.dataset_0.dataset} 
        title={_("Arrows")}
      >
        {_("arrows_help")}
      </QuiverSelector>

      <ContourSelector 
        key='contour' 
        id='contour' 
        state={this.state.contour} 
        def='' 
        onUpdate={this.onLocalUpdate} 
        dataset={this.props.dataset_0.dataset} 
        title={_("Additional Contours")}
      >
        {_("contour_help")}
      </ContourSelector>

      <ImageSize 
        key='size' 
        id='size' 
        state={this.state.size} 
        onUpdate={this.onLocalUpdate} 
        title={_("Saved Image Size")} 
      />
    </Panel>);

    const subset = (<Panel
      collapsible
      defaultExpanded
      header={_("Subset")}
      bsStyle='primary'
    >
      <form>
        <ComboBox
          id='variable'
          multiple={true}
          state={this.state.output_variables}
          def={"defaults.dataset"}
          onUpdate={(keys, values) => { this.setState({output_variables: values[0],}); }}
          url={"/api/variables/?vectors&dataset=" + this.props.dataset_0.dataset
          }
          title={_("Variables")}
        />

        <SelectBox
          id='time_range'
          state={this.state.output_timerange}
          onUpdate={(key, value) => {this.setState({output_timerange: value,});}}
          title={_("Select Time Range")}
        />

        <TimePicker
          id='starttime'
          state={this.state.output_starttime}
          def=''
          quantum={this.props.dataset_0.dataset_quantum}
          url={"/api/timestamps/?dataset=" +
                this.props.dataset_0.dataset +
                "&quantum=" +
                this.props.dataset_0.dataset_quantum}
          title={this.state.output_timerange ? _("Start Time") : _("Time")}
          onUpdate={(key, value) => { this.setState({output_starttime: value,}); }}
          max={this.props.dataset_0.time + 1}
          updateDate={this.updateDate}
        />

        <div style={{display: this.state.output_timerange ? "block" : "none",}}>
          <TimePicker
            id='time'
            state={this.state.output_endtime}
            def=''
            quantum={this.props.dataset_0.dataset_quantum}
            url={"/api/timestamps/?dataset=" +
                this.props.dataset_0.dataset +
                "&quantum=" +
                this.props.dataset_0.dataset_quantum}
            title={_("End Time")}
            onUpdate={(key, value) => { this.setState({output_endtime: value,}); }}
            min={this.props.dataset_0.time}
          />
        </div>

        <FormGroup controlId="output_format">
          <ControlLabel>{_("Output Format")}</ControlLabel>
          <FormControl componentClass="select" onChange={e => { this.setState({output_format: e.target.value,}); }}>
            <option value="NETCDF3_CLASSIC">{_("NetCDF-3 Classic")}</option>
            <option value="NETCDF3_64BIT">{_("NetCDF-3 64-bit")}</option>
            <option value="NETCDF4">{_("NetCDF-4")}</option>
            <option value="NETCDF4_CLASSIC">{_("NetCDF-4 Classic")}</option>
          </FormControl>
        </FormGroup>
        
        <SelectBox 
          id='zip' 
          state={this.state.zip} 
          onUpdate={this.onLocalUpdate} 
          title={_("Compress as *.zip")}
        />

        <Button 
          bsStyle="default" 
          onClick={this.saveData}
          disabled={this.state.output_variables == ""}
        ><Icon icon="save" /> {_("Save")}</Button>
      </form>
    </Panel>
    );

    const dataset = (<Panel
      collapsible
      defaultExpanded
      header={this.props.dataset_compare ? _("Left View (Anchor)") : _("Primary View")}
      bsStyle='primary'
    >
      <DatasetSelector 
        key='dataset_0' 
        id='dataset_0'
        multiple={this.state.selected === 2}
        state={this.props.dataset_0} 
        onUpdate={this.onLocalUpdate}
        depth={true}
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
    </Panel>);
    
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

    var leftInputs = [];
    var rightInputs = [];
    const plot_query = {
      dataset: this.props.dataset_0.dataset,
      quantum: this.props.dataset_0.quantum,
      scale: this.state.scale,
      name: this.props.name,
    };

    var content = "";
    switch(this.state.selected) {
      case 1:
        plot_query.type = "map";
        plot_query.colormap = this.state.leftColormap;
        plot_query.time = this.props.dataset_0.time;
        plot_query.area = this.props.area;
        plot_query.depth = this.props.depth;
        plot_query.bathymetry = this.state.bathymetry;
        plot_query.quiver = this.state.quiver;
        plot_query.contour = this.state.contour;
        plot_query.showarea = this.state.showarea;
        plot_query.variable = this.props.dataset_0.variable; 
        plot_query.projection = this.props.projection;
        plot_query.size = this.state.size;
        plot_query.dpi = this.state.dpi;
        if (this.props.dataset_compare) {
          plot_query.compare_to = this.props.dataset_1;
          plot_query.compare_to.scale = this.state.scale_1;
          plot_query.compare_to.scale_diff = this.state.scale_diff;
          plot_query.compare_to.colormap = this.state.rightColormap;
          plot_query.compare_to.colormap_diff = this.state.colormap_diff;
        }

        leftInputs = [
          mapSettings, subset
        ];
        rightInputs = [
          dataset, compare_dataset
        ];

        content = <PlotImage
          query={plot_query} // For image saving link.
          permlink_subquery={this.state}
          action={this.props.action}
        />;
        break;
      case 2:
        plot_query.time = this.props.dataset_0.time;
        plot_query.area = this.props.area;
        plot_query.depth = this.props.depth;
        if (this.state.variable.join != undefined) {
          plot_query.variable = this.state.variable.join(",");
        } else {
          plot_query.variable = this.props.dataset_0.variable;
        }
        
        leftInputs = [dataset];

        content = <StatsTable query={plot_query}/>;
        break;
    }

    return (
      <div className='AreaWindow Window'>
        <Nav
          bsStyle="tabs"
          activeKey={this.state.selected}
          onSelect={this.onSelect}
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
  depth: PropTypes.number,
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
  scale: PropTypes.string,
  init: PropTypes.object,
  action: PropTypes.func,
  showHelp: PropTypes.func,
  swapViews: PropTypes.func,
  scale_1: PropTypes.string,
};
