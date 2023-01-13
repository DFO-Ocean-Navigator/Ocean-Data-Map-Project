/* eslint react/no-deprecated: 0 */
/*

  Opens Window displaying the Image corresponding to a Selected Point

*/

import React from "react";
import { Nav, NavItem, Panel, Row, Col } from "react-bootstrap";
import PlotImage from "./PlotImage.jsx";
import CheckBox from "./lib/CheckBox.jsx";
import ComboBox from "./ComboBox.jsx";
import LocationInput from "./LocationInput.jsx";
import ImageSize from "./ImageSize.jsx";
import PropTypes from "prop-types";
import CustomPlotLabels from "./CustomPlotLabels.jsx";
import DatasetSelector from "./DatasetSelector.jsx";
import Accordion from "./lib/Accordion.jsx";

import { GetVariablesPromise } from "../remote/OceanNavigator.js";

import { withTranslation } from "react-i18next";

const TabEnum = {
  PROFILE: 1,
  CTD: 2,
  TS: 3,
  STICK: 4,
  SOUND: 5,
  OBSERVATION: 6,
  MOORING: 7,
};

class PointWindow extends React.Component {
  constructor(props) {
    super(props);

    // Track if mounted to prevent no-op errors with the Ajax callbacks.
    this._mounted = false;

    this.state = {
      selected: TabEnum.PROFILE,
      showmap: false,
      colormap: "default",
      datasetVariables: [],
      variable: [props.variable],
      observation_variable: [0],
      size: "10x7",
      dpi: 144,
      plotTitles: Array(7).fill(""),
      dataset_0: {
        dataset: props.dataset_0.dataset,
        variable: [props.dataset_0.variable],
        variable_range: {},
        time: props.dataset_0.time,
        depth: props.dataset_0.depth,
        starttime: props.dataset_0.starttime,
        options: props.dataset_0.options,
      },
    };

    if (props.init !== null) {
      $.extend(this.state, props.init);
    }

    // Function bindings
    this.onLocalUpdate = this.onLocalUpdate.bind(this);
    this.onSelect = this.onSelect.bind(this);
    this.updatePlotTitle = this.updatePlotTitle.bind(this);
  }

  componentWillMount() {
    let dataset_0 = this.state.dataset_0;
    dataset_0.variable_range[this.props.dataset_0.variable] = null;
    this.setState({ dataset_0: dataset_0 })
  }

  componentDidMount() {
    this._mounted = true;

    // If an observation point has been picked, default to the
    // Observation tab.
    if (this.props.point[0][2] !== undefined) {
      this.setState({
        selected: TabEnum.OBSERVATION,
      });
    }

    this.populateVariables(this.props.dataset_0.dataset);
  }

  componentWillUnmount() {
    this._mounted = false;
  }

  populateVariables(dataset) {
    GetVariablesPromise(dataset).then(
      (variableResult) => {
        this.setState({
          datasetVariables: variableResult.data.map((v) => {
            return v.id;
          }),
        });
      },
      (error) => {
        console.error(error);
      }
    );
  }

  //Updates Plot with User Specified Title
  updatePlotTitle(title) {
    if (title !== this.state.plotTitles[this.state.selected - 1]) {
      //If new plot title
      const newTitles = this.state.plotTitles;
      newTitles[this.state.selected - 1] = title;
      this.setState({ plotTitles: newTitles }); //Update Plot Title
    }
  }

  onLocalUpdate(key, value) {
    if (this._mounted) {
      if (key === "dataset_0") {
        this.setState((prevState) => ({
          dataset_0: {
            ...prevState.dataset_0,
            ...value,
          },
        }));
        return;
      }

      let newState = {};

      if (typeof key === "string") {
        newState[key] = value;
      } else {
        for (let i = 0; i < key.length; i++) {
          newState[key[i]] = value[i];
        }
      }
      this.setState(newState);

      let parentKeys = [];
      let parentValues = [];

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

      if (
        newState.hasOwnProperty("variable_scale") &&
        this.state.variable.length === 1
      ) {
        parentKeys.push("variable_scale");
        parentValues.push(newState.variable_scale);
      }

      if (
        newState.hasOwnProperty("variable") &&
        newState.variable.length == 1
      ) {
        parentKeys.push("variable");
        parentValues.push(newState.variable[0]);
      }

      if (parentKeys.length > 0) {
        this.props.onUpdate(parentKeys, parentValues);
      }
    }
  }

  // Handles when a tab is selected
  onSelect(key) {
    this.setState({
      selected: key,
    });
  }

  render() {
    _("Location");
    _("Colourmap");
    _("Saved Image Size");

    const only3dVariables =
      this.state.selected == TabEnum.PROFILE ||
      this.state.selected == TabEnum.OBSERVATION;
    const showDepthSelector = this.state.selected === TabEnum.MOORING;
    const showDepthsAll = this.state.selected === TabEnum.MOORING;
    const showTimeRange =
      this.state.selected === TabEnum.STICK ||
      this.state.selected === TabEnum.MOORING;
    const showVariableSelector =
      this.state.selected === TabEnum.PROFILE ||
      this.state.selected === TabEnum.MOORING;
    const showMultiVariableSelector = this.state.selected === TabEnum.PROFILE;
    const showAxisRange =
      this.state.selected === TabEnum.PROFILE ||
      this.state.selected === TabEnum.MOORING;

    const plotOptions = (
      <div>
        <ImageSize
          key="size"
          id="size"
          state={this.state.size}
          onUpdate={this.onLocalUpdate}
          title={_("Saved Image Size")}
        />

        <CustomPlotLabels
          key="title"
          id="title"
          title={_("Plot Title")}
          updatePlotTitle={this.updatePlotTitle}
          plotTitle={this.state.plotTitles[this.state.selected - 1]}
        />
      </div>
    );

    // Rendered across all tabs
    const global = (
      <Panel
        key="global_settings"
        id="global_settings"
        defaultExpanded
        bsStyle="primary"
      >
        <Panel.Heading>{_("Global Settings")}</Panel.Heading>
        <Panel.Collapse>
          <Panel.Body>
            <DatasetSelector
              key="point_window_dataset_0"
              id="dataset_0"
              onUpdate={this.onLocalUpdate}
              showQuiverSelector={false}
              showVariableRange={false}
              showAxisRange={showAxisRange}
              showTimeRange={showTimeRange}
              showDepthSelector={showDepthSelector}
              options={this.props.options}
              variables={only3dVariables ? "3d" : null}
              showVariableSelector={showVariableSelector}
              showDepthsAll={showDepthsAll}
              multipleVariables={showMultiVariableSelector}
              mountedDataset={this.props.dataset_0.dataset}
              mountedVariable={this.props.dataset_0.variable}
            />

            <CheckBox
              key='showmap'
              id='showmap'
              checked={this.state.showmap}
              onUpdate={this.onLocalUpdate}
              title={_("Show Location")}
            >
              {_("showmap_help")}
            </CheckBox>

            <div
              style={{
                display: this.props.point.length == 1 ? "block" : "none",
              }}
            >
              <LocationInput
                key="point"
                id="point"
                state={this.props.point}
                title={_("Location")}
                onUpdate={this.onLocalUpdate}
              />
            </div>
            <Accordion
              id="point_accordion"
              title={"Plot Options"}
              content={plotOptions}
            />
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    );

    // Show multidepth selector on for Stick tab
    const showMultiDepthAndVector = this.state.selected === TabEnum.STICK;
    const multiDepthVector = showMultiDepthAndVector ? (
      <div>
        <ComboBox
          key="variable"
          id="variable"
          state={this.state.dataset_0.variable}
          def=""
          onUpdate={this.onLocalUpdate}
          url={`/api/v2.0/dataset/${this.state.dataset_0.dataset}/variables?vectors_only=True`}
          title={_("Variable")}
        >
          <h1>Variable</h1>
        </ComboBox>

        <ComboBox
          key="depth"
          id="depth"
          multiple
          state={this.state.depth}
          def={""}
          onUpdate={this.onLocalUpdate}
          url={
            "/api/v2.0/depth/?variable=" +
            this.state.dataset_0.variable +
            "&dataset=" +
            this.props.dataset_0.dataset
          }
          title={_("Depth")}
        ></ComboBox>
      </div>
    ) : null;

    let observation_data = [];
    let observation_variable = <div></div>;
    if (this.props.point[0][2] !== undefined) {
      if (typeof this.props.point[0][2] == "number") {
        observation_variable = (
          <ComboBox
            key="observation_variable"
            id="observation_variable"
            state={this.state.observation_variable}
            url={`/api/v2.0/observation/variables/station=${this.props.point[0][2]}.json`}
            title={_("Observation Variable")}
            multiple
            onUpdate={this.onLocalUpdate}
          />
        );
      } else {
        observation_data = this.props.point[0][2].datatypes.map(function (
          o,
          i
        ) {
          return { id: i, value: o.replace(/ \[.*\]/, "") };
        });
        observation_variable = (
          <ComboBox
            key="observation_variable"
            id="observation_variable"
            state={this.state.observation_variable}
            data={observation_data}
            title={_("Observation Variable")}
            multiple
            onUpdate={this.onLocalUpdate}
          />
        );
      }
    }

    // Checks if the current dataset's variables contain Temperature
    // and Salinity. This is used to enable/disable some tabs.
    const temperatureRegex = /temp/;
    // eslint-disable-next-line max-len
    const hasTemperature = this.state.datasetVariables.some((v) =>
      v.match(temperatureRegex)
    );

    const salinityRegex = /salin/;
    // eslint-disable-next-line max-len
    const hasSalinity = this.state.datasetVariables.some((v) =>
      v.match(salinityRegex)
    );

    const hasTempSalinity = hasTemperature && hasSalinity;

    // Start constructing query for image
    const plot_query = {
      dataset: this.state.dataset_0.dataset,
      point: this.props.point,
      showmap: this.state.showmap,
      names: this.props.names,
      size: this.state.size,
      dpi: this.state.dpi,
      plotTitle: this.state.plotTitles[this.state.selected - 1],
    };

    let inputs = [];

    switch (this.state.selected) {
      case TabEnum.PROFILE:
        plot_query.type = "profile";
        plot_query.time = this.state.dataset_0.time;
        plot_query.variable = this.state.dataset_0.variable;
        plot_query.variable_range = Object.values(this.state.dataset_0.variable_range);
        inputs = [global];
        break;

      case TabEnum.CTD:
        plot_query.type = "profile";
        plot_query.time = this.state.dataset_0.time;
        plot_query.variable = "";
        if (hasTemperature) {
          // TODO: find index of matching variable in regex
          // since not all datasets call temp votemper
          plot_query.variable += "votemper,";
        }
        if (hasSalinity) {
          // TODO: find index of matching variable in regex
          // for same reason as above
          plot_query.variable += "vosaline";
        }
        inputs = [global];
        break;

      case TabEnum.TS:
        plot_query.type = "ts";
        plot_query.time = this.state.dataset_0.time;
        inputs = [global];
        break;

      case TabEnum.SOUND:
        plot_query.type = "sound";
        plot_query.time = this.state.dataset_0.time;
        inputs = [global];
        break;
      case TabEnum.OBSERVATION:
        plot_query.type = "observation";
        plot_query.observation = this.props.point.map(function (o) {
          return o[2];
        });

        plot_query.observation_variable = this.state.observation_variable;
        plot_query.variable = this.state.dataset_0.variable;
        inputs = [global, observation_variable];

        break;
      case TabEnum.MOORING:
        plot_query.type = "timeseries";
        plot_query.variable = this.state.dataset_0.variable;
        plot_query.variable_range = Object.values(this.state.dataset_0.variable_range);
        plot_query.starttime = this.state.dataset_0.starttime;
        plot_query.endtime = this.state.dataset_0.time;
        plot_query.depth = this.state.dataset_0.depth;
        plot_query.colormap = this.state.colormap;
        plot_query.interp = this.state.dataset_0.options.interpType;
        plot_query.radius = this.state.dataset_0.options.interpRadius;
        plot_query.neighbours = this.state.dataset_0.options.interpNeighbours;
        //plot_query.scale = "auto";

        inputs = [global];
        if (this.state.dataset_0.depth == "all") {
          // Add Colormap selector
          inputs.push(
            <ComboBox
              key="colormap"
              id="colormap"
              state={this.state.colormap}
              def="default"
              onUpdate={this.onLocalUpdate}
              url="/api/v2.0/plot/colormaps"
              title={_("Colourmap")}
            >
              {_("colourmap_help")}
              <img src="/plot/colormaps.png/" />
            </ComboBox>
          );
        }

        break;
      case TabEnum.STICK:
        plot_query.type = "stick";
        plot_query.variable = this.state.dataset_0.variable;
        plot_query.starttime = this.state.dataset_0.starttime;
        plot_query.endtime = this.state.dataset_0.time;
        plot_query.depth = this.state.dataset_0.depth;

        inputs = [global, multiDepthVector];

        break;
    }

    const permlink_subquery = {
      selected: this.state.selected,
      depth: this.state.dataset_0.depth,
      colormap: this.state.colormap,
      starttime: this.state.dataset_0.starttime,
    };

    return (
      <div className="PointWindow Window">
        <Nav
          bsStyle="tabs"
          activeKey={this.state.selected}
          onSelect={this.onSelect}
        >
          <NavItem eventKey={TabEnum.PROFILE}>{_("Profile")}</NavItem>
          <NavItem eventKey={TabEnum.CTD} disabled={!hasTempSalinity}>
            {_("CTD Profile")}
          </NavItem>
          <NavItem eventKey={TabEnum.TS} disabled={!hasTempSalinity}>
            {_("T/S Diagram")}
          </NavItem>
          <NavItem eventKey={TabEnum.SOUND} disabled={!hasTempSalinity}>
            {_("Sound Speed Profile")}
          </NavItem>
          <NavItem disabled eventKey={TabEnum.STICK}>
            {_("Stick Plot")}
          </NavItem>
          <NavItem
            eventKey={TabEnum.OBSERVATION}
            disabled={this.props.point[0][2] === undefined}
          >
            {_("Observation")}
          </NavItem>
          <NavItem eventKey={TabEnum.MOORING}>{_("Virtual Mooring")}</NavItem>
        </Nav>
        <Row>
          <Col lg={2}>{inputs}</Col>
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
  dpi: PropTypes.number,
  names: PropTypes.array,
  onUpdate: PropTypes.func,
  init: PropTypes.object,
  action: PropTypes.func,
  dataset_compare: PropTypes.bool,
  swapViews: PropTypes.func,
  showHelp: PropTypes.func,
  dataset_0: PropTypes.object,
  dataset_1: PropTypes.object,
};

export default withTranslation()(PointWindow);
