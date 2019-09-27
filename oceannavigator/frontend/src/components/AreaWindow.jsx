/* eslint react/no-deprecated: 0 */
/*

  Opens Window displaying the Image of a Selected Area

*/

import React from "react";
import {
  Nav, NavItem, Panel, Row, Col, Button,
  FormControl, Checkbox, FormGroup, ControlLabel, DropdownButton, MenuItem
} from "react-bootstrap";
import moment from "moment-timezone";
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
import TimePicker from "./time/TimePicker.jsx";
import PropTypes from "prop-types";
import Spinner from '../images/spinner.gif';
import DataSelection from './DataSelection.jsx';

const i18n = require("../i18n.js");
const stringify = require("fast-stable-stringify");

export default class AreaWindow extends React.Component {
  constructor(props) {
    super(props);

    // Track if mounted to prevent no-op errors with the Ajax callbacks.
    this._mounted = false;

    this.state = {
      currentTab: 1, // Currently selected tab
      plot_query: undefined,

      //scale: props.scale + ",auto",
      //scale_1: props.scale_1 + ",auto",
      scale_diff: "-10,10,auto",
      leftColormap: "default",
      rightColormap: "default",
      colormap_diff: "default",
      data: {},
      data_compare: {},
      //dataset_0: {
      //dataset: props.dataset_0.dataset,
      //variable: props.dataset_0.variable,
      //dataset_quantum: props.dataset_0.dataset_quantum,
      //time: props.dataset_0.time,
      //depth: props.dataset_0.depth,
      //},
      // Should dataset/variable changes in this window
      // propagate to the entire site?
      syncLocalToGlobalState: false,
      dataset_compare: false,
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
        clabel: false,
        hatch: false,
      },
      size: "10x7", // Plot dimensions
      dpi: 144, // Plot DPI
      output_timerange: false,
      output_variables: "",
      //output_starttime: props.dataset_0.time,
      //output_endtime: props.dataset_0.time,
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
    this.updatePlot = this.updatePlot.bind(this);
    this.updateLabel = this.updateLabel.bind(this);

    this.updateData = this.updateData.bind(this);
    this.updateCompareData = this.updateCompareData.bind(this);
    this.populateVariables = this.populateVariables.bind(this);
    this.onTimeUpdate = this.onTimeUpdate.bind(this);
  }

  componentDidMount() {
    this._mounted = true;
    //this.updatePlot();
  }

  componentWillUnmount() {
    this._mounted = false;
  }

  /*

  */
  onTimeUpdate(key, value) {
    if (typeof (key) === typeof ('string')) {
      value = moment(value.valueOf())
      value.tz('GMT')
      this.setState({
        [key]: value
      })
    } else {
      //let date = moment.tz(key, 'GMT')
      //date.setUTCMonth(date.getUTCMonth() +1)
      value = moment(key.valueOf())
      value.tz('GMT')
      this.setState({
        time: key
      })
    }
  }

  /*
  onTimeUpdate(key, value) {
    let new_state = this.props.state
    if (typeof(key) === typeof('string')) {
      value = moment(value.valueOf())
      value.tz('GMT')

      new_state[key] = value
    } else {
      value = moment(key.valueOf())
      value.tz('GMT')

      new_state.time = value
    }
    this.props.onUpdate(jQuery.extend({}, new_state))
  }*/

  /*
    If selected_right is null, empty, or undefined, will only load left map data
  */
  updateData(selected_left, selected_right) {
    let selected = selected_left.split(',')
    let data = this.props.data

    // Initialize non compare data
    let layer = selected[0]
    let index = selected[1]
    let dataset = selected[2]
    //let variable = [selected[3]]
    let variable = ''

    if (selected.length > 4) {
      for (let v = 3; v < selected.length; v = v + 1) {
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
    let time = data[layer][index][dataset][variable].time
    let compare_time = moment(time.valueOf())
    compare_time.tz('GMT')
    time = moment(time.valueOf())
    time.tz('GMT')
    let output_starttime = moment(time.valueOf())
    let output_endtime = moment(time.valueOf())
    let depth = data[layer][index][dataset][variable].depth

    if (jQuery.isEmptyObject(this.props.data_compare)) {
      let data_compare = {
        layer: layer,
        index: index,
        dataset: dataset,
        variable: variable,
        display: display,
        colourmap: colourmap,
        dataset_quantum: quantum,
        scale: scale + ',auto',
        depth: depth,
        time: compare_time
      }
      this.setState({
        data_compare: data_compare,
        output_starttime: output_starttime,
        output_endtime: output_endtime,
      })
    } else {
      let compare_display = data[layer][index][dataset][variable].display
      let compare_colourmap = data[layer][index][dataset][variable].colourmap
      let compare_quantum = data[layer][index][dataset][variable].quantum
      let compare_scale = data[layer][index][dataset][variable].scale
      compare_time = data[layer][index][dataset][variable].time
      let depth = data[layer][index][dataset][variable].depth
      let data_compare = {
        layer: layer,
        index: index,
        dataset: dataset,
        depth: depth,
        variable: variable,
        display: compare_display,
        colourmap: compare_colourmap,
        quantum: compare_quantum,
        scale: compare_scale + ',auto',
        time: moment(compare_time.valueOf()),
      }

      this.setState({
        data_compare: data_compare,
        output_starttime: output_starttime,
        output_endtime: output_endtime
      })
    }

    this.setState({
      data: {
        layer: layer,
        index: index,
        dataset: dataset,
        variable: variable,

        display: display,
        colourmap: colourmap,
        dataset_quantum: quantum,
        scale: scale + ',auto',
        time: time,
        starttime: null,
      }
    }, () => {
      this.updatePlot()
      //this.populateVariables(dataset)
    })

  }

  updateCompareData(selected) {
    return
  }

  populateVariables(dataset) {
    if (dataset === undefined) {
      return
    }
    $.ajax({
      url: "/api/v1.0/variables/?dataset=" + dataset + "&anom",
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

  /*
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
    
  }*/

  //Updates Plot with User Specified Title
  updatePlotTitle(title) {
    if (title !== this.state.plotTitle) {
      this.setState({ plotTitle: title, });
    }
  }

  onLocalUpdate(key, value) {
    /*
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
  }*/
    if (this._mounted) {

      let newState = this.state;
      if (key === 'data') {
        newState[key] = value;
      } else if (key === 'data_compare') {
        newState[key] = value;
      } else if (key === 'compare_scale') {
        newState['data_compare']['scale'] = value
      } else if (typeof (key) === "string") {
        newState[key] = value;
      }
      else {
        for (let i = 0; i < key.length; ++i) {
          newState[key[i]] = value[i];
        }
      }

      this.setState(newState);

      /*this.setState({
        [key]: value
      })*/
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

    window.location.href = "/api/v1.0/subset/?" +
      "&output_format=" + this.state.output_format +
      "&dataset_name=" + this.state.data.dataset +
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
      "dataset_name": this.state.data.dataset,
      "variables": this.state.output_variables.join(),
      "min_range": [AABB[0], AABB[2]].join(),
      "max_range": [AABB[1], AABB[3]].join(),
      "time": [this.state.output_starttime, this.state.output_endtime].join(),
      "user_grid": (this.state.convertToUserGrid ? 1 : 0),
      "should_zip": (this.state.zip ? 1 : 0)
    };

    window.location.href = window.location.origin + "/api/v1.0/generatescript/" + stringify(query) + "/" + key + "/" + "SUBSET/";
  }

  onTabChange(index) {
    this.setState({
      currentTab: index,
    });
  }

  updateLabel(e) {
    let new_contour = this.state.contour
    new_contour.clabel = !new_contour.clabel

    this.setState({
      contour: new_contour
    })
  }

  updatePlot() {
    if (jQuery.isEmptyObject(this.state.data)) {
      return
    }
    switch (this.state.currentTab) {
      case 1:
        //this.plotQuery = undefined

        //if (this.plot_query === undefined) {
        let plotQuery = {
          dataset: this.state.data.dataset,
          quantum: this.state.data.dataset_quantum,
          scale: this.state.data.scale,
          name: this.props.name,
        };

        plotQuery.type = "map";
        plotQuery.colormap = this.state.data.colourmap; //this.state.leftColormap;
        plotQuery.time = this.state.data.time;
        plotQuery.area = this.props.area;
        plotQuery.depth = this.state.data.depth;
        plotQuery.bathymetry = this.state.bathymetry;
        plotQuery.quiver = this.state.quiver;
        plotQuery.contour = this.state.contour;
        plotQuery.showarea = this.state.showarea;
        plotQuery.variable = this.state.data.variable;
        plotQuery.projection = this.props.projection;
        plotQuery.size = this.state.size;
        plotQuery.dpi = this.state.dpi;
        plotQuery.interp = this.props.options.interpType;
        plotQuery.radius = this.props.options.interpRadius;
        plotQuery.neighbours = this.props.options.interpNeighbours;
        plotQuery.plotTitle = this.state.plotTitle;
        plotQuery.random = Math.random()
        if (this.state.dataset_compare) {
          let compare = jQuery.extend({}, plotQuery.compare_to)
          compare = this.state.data_compare
          let time = moment(this.state.data_compare.time.valueOf())
          time.tz('GMT')
          compare.time = time;
          compare.scale_diff = this.state.scale_diff;
          compare.colormap_diff = this.state.colormap_diff;
          plotQuery.compare_to = compare
        }
        this.setState({
          plot_query: jQuery.extend({}, plotQuery)
        })
        break;
      case 2:
        this.plot_query.time = this.state.data.time;
        this.plot_query.area = this.props.area;
        this.plot_query.depth = this.state.depth;
        if (Array.isArray(this.state.data.variable)) {
          // Multiple variables were selected
          this.plot_query.variable = this.state.data.variable.join(",");
        } else {
          this.plot_query.variable = this.state.data.variable;
        }

        this.setState({
          plot_query: jQuery.extend({}, plotQuery)
        })

        break;
    }
    //this.render()

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

    let dataSelection = <DataSelection
      data={this.props.data}
      localUpdate={this.updateData}
    ></DataSelection>

    let contour_label = undefined;
    if (this.state.contour.variable != '') {
      contour_label = <Checkbox
        id='clabel'
        onChange={this.updateLabel}
        checked={this.state.contour.clabel}
        style={this.props.style}
      >
        Contour Labels
      </Checkbox>
    }
    let applyChanges2 = <Button
      key='2'
      onClick={this.updatePlot}
    >Apply Changes</Button>

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
            state={this.state.dataset_compare}
            onUpdate={this.onLocalUpdate}
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
        style={{ display: this.props.dataset_compare ? "block" : "none" }}
        onClick={this.props.swapViews}
      >
        {_("Swap Views")}
      </Button>

      <div
        style={{
          display: this.state.dataset_compare &&
            this.state.data.variable == this.state.data_compare.variable ? "block" : "none"
        }}
      >
        <Range
          auto
          key='scale_diff'
          id='scale_diff'
          state={this.state.scale_diff}//_diff}
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
          url='/api/v1.0/colormaps/'
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

      {/* Arrow Selector Drop Down menu */}
      <QuiverSelector
        key='quiver'
        id='quiver'
        state={this.state.quiver}
        def=''
        onUpdate={this.onLocalUpdate}
        dataset={this.state.data.dataset}
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
        dataset={this.state.data.dataset}
        title={_("Additional Contours")}
      >
        {_("contour_help")}
      </ContourSelector>

      {contour_label}

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
      {applyChanges2}
    </Panel>);

    let time = "";
    let timeObj = this.state.output_endtime//new Date(this.props.state.time);
    let starttimeObj = this.state.output_starttime//new Date(this.props.state.starttime);

    var subsetPanel = null;
    if (this._mounted) {
      subsetPanel = (<Panel
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
            onUpdate={(keys, values) => { this.setState({ output_variables: values[0], }); }}
            url={"/api/v1.0/variables/?vectors&dataset=" + this.state.data.dataset
            }
            title={_("Variables")}
          />


          <SelectBox
            id='time_range'
            key='time_range'
            state={this.state.output_timerange}
            onUpdate={(key, value) => { this.setState({ output_timerange: value, }); }}
            title={_("Select Time Range")}
          />

          <TimePicker
            range={this.state.output_timerange}
            startid='output_starttime'
            key='output_starttime'
            id='output_endtime'
            dataset={this.state.data.dataset}
            variable={this.state.data.variable}
            quantum={this.state.data.dataset_quantum}
            startDate={starttimeObj}
            date={timeObj}
            onTimeUpdate={this.onTimeUpdate}
          ></TimePicker>
          {/*
          <TimePicker
            id='output_starttime'
            key='starttime'
            state={this.state.output_starttime}
            //def=''
            quantum={this.state.data.quantum}
            date={this.state.data.time}
            onTimeUpdate={}
            //url={"/api/timestamps/?dataset=" +
            //  this.state.data.dataset +
            //  "&quantum=" +
            //  this.state.data.quantum}
            //title={this.state.output_timerange ? _("Start Time") : _("Time")}
            
            //onUpdate={(key, value) => { this.setState({ output_starttime: value, }); }}
            //max={this.state.data.time + 1}
            //updateDate={this.updateDate}
          />
          */}
          {/* 
          <div style={{ display: this.state.output_timerange ? "block" : "none", }}>
            <TimePicker
              id='output_endtime'
              startid='output_starttime'
              range={true}
              key='time'
              dataset={this.state.data.dataset}
              quantum={this.state.data.quantum}
              startDate={this.state.output_starttime}
              date={this.state.output_endtime}
              //state={this.state.output_endtime}
              //def=''
              //url={"/api/timestamps/?dataset=" +
              //  this.state.data.dataset +
              //  "&quantum=" +
              //  this.state.data.quantum}
              //title={_("End Time")}
              //onUpdate={(key, value) => { this.setState({ output_endtime: value, }); }}
              //min={this.state.data.time}
            />
          </div>
          */}

          <FormGroup controlId="output_format">
            <ControlLabel>{_("Output Format")}</ControlLabel>
            <FormControl componentClass="select" onChange={e => { this.setState({ output_format: e.target.value, }); }}>
              <option value="NETCDF4">{_("NetCDF-4")}</option>
              <option value="NETCDF3_CLASSIC">{_("NetCDF-3 Classic")}</option>
              <option value="NETCDF3_64BIT">{_("NetCDF-3 64-bit")}</option>
              <option value="NETCDF3_NC" disabled={
                this.state.data.dataset.indexOf("giops") === -1 &&
                this.state.data.dataset.indexOf("riops") === -1 // Disable if not a giops or riops dataset
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
    }

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
          onUpdate={(key, value) => { this.setState({ syncLocalToGlobalState: value, }); }}
          title={_("Sync to Global State")}
        />
      </Panel>
      );

      let applyChanges1 = <Button
        key='1'
        onClick={this.updatePlot}
      >Apply Changes</Button>
      var dataset = null
      if (this.state.data.scale !== undefined) {
        dataset = (<Panel
          key='left_map'
          id='left_map'
          collapsible
          defaultExpanded
          header={this.state.dataset_compare ? _("Left Map (Anchor)") : _("Main Map")}
          bsStyle='primary'
        >
          {<DatasetSelector
            key='data'
            id='data'
            multiple={this.state.currentTab === 2}
            state={this.state.data}
            onUpdate={this.onLocalUpdate}
            depth={true}
          />}
          <div style={{ "display": this.state.currentTab == 1 ? "block" : "none" }}>
            <Range
              auto
              key='scale'
              id='scale'
              state={this.state.data.scale}
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
          {applyChanges1}
        </Panel>);
      }

      let applyChanges_compare = <Button
        key='compare'
        onClick={this.updatePlot}
      >Apply Changes</Button>

      const compare_dataset = <div key='compare_dataset'>
        <div style={{ "display": this.state.dataset_compare ? "block" : "none" }}>
          <Panel
            key='right_map'
            id='right_map'
            collapsible
            defaultExpanded
            header={_("Right Map")}
            bsStyle='primary'
          >
            <DatasetSelector
              key='data_compare'
              id='data_compare'
              state={this.state.data_compare}
              onUpdate={this.onLocalUpdate}
            />

            <Range
              auto
              key='compare_scale'
              id='compare_scale'
              state={this.state.data_compare.scale}
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
              url='/api/v1.0/colormaps/'
              title={_("Colourmap")}
            >
              {_("colourmap_help")}
              <img src="/colormaps.png" />
            </ComboBox>
            {applyChanges_compare}
          </Panel>
        </div>
      </div>;

      let leftInputs = [];
      let rightInputs = [];


      //this.updatePlot()

      switch (this.state.currentTab) {
        case 1:
          leftInputs = [/*globalSettings*/mapSettings, subsetPanel];

          if (this.state.dataset_compare) {
            rightInputs = [dataset, compare_dataset]
          } else {
            rightInputs = [dataset];
          }
          break;
        case 2:
          leftInputs = [/*globalSettings*/dataset, applyChanges1];
          break;
      }

      let content;
      if (this.state.plot_query !== undefined) {
        switch (this.state.currentTab) {
          case 1:
            if (this.state.data.time !== undefined) {
              content = <PlotImage
                query={this.state.plot_query} // For image saving link.
                permlink_subquery={this.state}
                action={this.props.action}
              />;
            }

            break;
          case 2:
            content = <StatsTable query={this.state.plot_query} />;
            break;
        }
      } else {
        content = <img src={Spinner} />;
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
            <Col lg={3}>
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
              {leftInputs}
            </Col>
            <Col lg={6}>
              {content}
            </Col>
            <Col lg={3}>
              {rightInputs}
            </Col>
          </Row>
        </div>
      );
    }
  }

  //***********************************************************************
  AreaWindow.propTypes = {
    data: PropTypes.object,
    data_compare: PropTypes.object,
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
