import React from "react";
import { Card, Nav, Row, Col } from "react-bootstrap";
import Accordion from "react-bootstrap/Accordion";
import PlotImage from "./PlotImage.jsx";
import CheckBox from "./lib/CheckBox.jsx";
import ComboBox from "./ComboBox.jsx";
import LocationInput from "./LocationInput.jsx";
import ImageSize from "./ImageSize.jsx";
import PropTypes from "prop-types";
import CustomPlotLabels from "./CustomPlotLabels.jsx";
import DatasetSelector from "./DatasetSelector.jsx";

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
      observation_variable: [0],
      size: "10x7",
      dpi: 144,
      plotTitles: Array(7).fill(""),
      dataset_0: {
        id: props.dataset_0.id,
        variable: [props.dataset_0.variable],
        variable_range: {},
        time: props.dataset_0.time,
        depth: props.dataset_0.depth,
        starttime: props.dataset_0.starttime,
        options: props.dataset_0.options,
      },
    };

    if (props.init !== null) {
      this.state = { ...this.state, ...props.init };
    }

    // Function bindings
    this.onLocalUpdate = this.onLocalUpdate.bind(this);
    this.onSelect = this.onSelect.bind(this);
    this.updatePlotTitle = this.updatePlotTitle.bind(this);
  }

  componentWillMount() {
    let dataset_0 = this.state.dataset_0;
    dataset_0.variable_range[this.props.dataset_0.variable] = null;
    this.setState({ dataset_0: dataset_0 });
  }

  componentDidMount() {
    this._mounted = true;

    //TODO: Update check for obs
    // If an observation point has been picked, default to the
    // Observation tab.
      if (this.props.plotData.coordinates[0][2] !== undefined) {
      this.setState({
        selected: TabEnum.OBSERVATION,
      });
    }

    this.populateVariables(this.props.dataset_0.id);
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
      if (key === "dataset") {
        this.setState((prevState) => ({
          dataset_0: {
            ...prevState.dataset_0,
            ...value,
          },
        }));
        if (value.variable.length === 1) {
          value.variable = value.variable[0];
          this.props.updateDataset("dataset", value);
        }
        return;
      } else if (key === "points") {
        this.props.action("updatePoint", value);
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
    }
  }

  // Handles when a tab is selected
  onSelect(key) {
    this.setState({
      selected: parseInt(key),
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
      <Card key="global_settings" id="global_settings" variant="primary">
        <Card.Header>{"Global Settings"}</Card.Header>
        <Card.Body className="global-settings-card">
          <DatasetSelector
            key="point_window_dataset_0"
            id="dataset_0"
            onUpdate={this.onLocalUpdate}
            showQuiverSelector={false}
            showVariableRange={false}
            showAxisRange={showAxisRange}
            showTimeRange={showTimeRange}
            showDepthSelector={showDepthSelector}
            mapSettings={this.props.mapSettings}
            variables={only3dVariables ? "3d" : null}
            showVariableSelector={showVariableSelector}
            showDepthsAll={showDepthsAll}
            multipleVariables={showMultiVariableSelector}
            mountedDataset={this.props.dataset_0}
          />

          <CheckBox
            key="showmap"
            id="showmap"
            checked={this.state.showmap}
            onUpdate={this.onLocalUpdate}
            title={"Show Location"}
          >
            {"showmap_help"}
          </CheckBox>

          <div
            style={{
              display: this.props.plotData.coordinates.length == 1 ? "block" : "none",
            }}
          >
            <LocationInput
              key="points"
              id="points"
              state={this.props.plotData.coordinates}
              title={"Location"}
              onUpdate={this.onLocalUpdate}
            />
          </div>

          <Accordion>
            <Accordion.Header>Plot Options</Accordion.Header>
            <Accordion.Body className="plot-accordion">
              {plotOptions}
            </Accordion.Body>
          </Accordion>
        </Card.Body>
      </Card>
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
          url={`/api/v2.0/dataset/${this.state.dataset_0.id}/variables?vectors_only=True`}
          title={"Variable"}
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
            this.props.dataset_0.id
          }
          title={"Depth"}
        ></ComboBox>
      </div>
    ) : null;

    let observation_data = [];
    let observation_variable = <div></div>;
      if (this.props.plotData.coordinates[0][2] !== undefined) {
        if (typeof this.props.plotData.coordinates[0][2] == "number") {
        observation_variable = (
          <ComboBox
            key="observation_variable"
            id="observation_variable"
            state={this.state.observation_variable}
            url={`/api/v2.0/observation/variables/station=${this.props.plotData.coordinates[0][2]}.json`}
            title={"Observation Variable"}
            multiple
            onUpdate={this.onLocalUpdate}
          />
        );
      } else {
          observation_data = this.props.plotData.coordinates[0][2].datatypes.map(function (
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
            title={"Observation Variable"}
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
      dataset: this.state.dataset_0.id,
      point: this.props.plotData.coordinates,
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
        plot_query.variable_range = Object.values(
          this.state.dataset_0.variable_range
        );
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
          plot_query.observation = this.props.plotData.coordinates.map(function (o) {
          return o[2];
        });

        plot_query.observation_variable = this.state.observation_variable;
        plot_query.variable = this.state.dataset_0.variable;
        inputs = [global, observation_variable];

        break;
      case TabEnum.MOORING:
        plot_query.type = "timeseries";
        plot_query.variable = this.state.dataset_0.variable;
        plot_query.variable_range = Object.values(
          this.state.dataset_0.variable_range
        );
        plot_query.starttime = this.state.dataset_0.starttime;
        plot_query.endtime = this.state.dataset_0.time;
        plot_query.depth = this.state.dataset_0.depth;
        plot_query.colormap = this.state.colormap;
        plot_query.interp = this.props.mapSettings.interpType;
        plot_query.radius = this.props.mapSettings.interpRadius;
        plot_query.neighbours = this.props.mapSettings.interpNeighbours;
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
              title={"Colourmap"}
            >
              {"colourmap_help"}
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
      starttime: this.state.dataset_0.starttime,
    };

    return (
      <div className="PointWindow Window">
        <Nav
          variant="tabs"
          activeKey={this.state.selected}
          onSelect={this.onSelect}
        >
          <Nav.Item>
            <Nav.Link eventKey={TabEnum.PROFILE}>{"Profile"}</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey={TabEnum.CTD} disabled={!hasTempSalinity}>
              {"CTD Profile"}
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey={TabEnum.TS} disabled={!hasTempSalinity}>
              {"T/S Diagram"}
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey={TabEnum.SOUND} disabled={!hasTempSalinity}>
              {"Sound Speed Profile"}
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link
              eventKey={TabEnum.OBSERVATION}
              disabled={this.props.plotData.coordinates[0][2] === undefined}
            >
              {"Observation"}
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey={TabEnum.MOORING}>{"Virtual Mooring"}</Nav.Link>
          </Nav.Item>
        </Nav>
        <Row>
          <Col className="settings-col" lg={2}>
            {inputs}
          </Col>
          <Col className="plot-col" lg={10}>
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
  plotData: PropTypes.object,
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
