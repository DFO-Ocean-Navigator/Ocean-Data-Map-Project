import React from "react";
import PropTypes from "prop-types";
import {
  Modal,
  ProgressBar,
  Button,
  Tooltip,
  OverlayTrigger,
} from "react-bootstrap";

import DatasetDropdown from "./DatasetDropdown.jsx";
import Range from "./Range.jsx";
import TimePicker from "./TimePicker.jsx";
import SelectBox from "./lib/SelectBox.jsx";

import {
  GetDatasetsPromise,
  GetVariablesPromise,
  GetTimestampsPromise,
  GetDepthsPromise,
} from "../remote/OceanNavigator.js";

import { DATASET_DEFAULTS } from "./Defaults.js";

import { withTranslation } from "react-i18next";

// Default properties for a dataset-state
const PARENT_ATTRIBUTES_TO_UPDATE = Object.freeze([
  "dataset",
  "dataset_attribution",
  "quantum",
  "variable",
  "variable_scale", // Default range values for variable
  "depth",
  "time",
  "starttime",
  "quiverVariable",
  "options",
]);

const MODEL_CLASSES_WITH_QUIVER = Object.freeze(["Mercator"]);

class DatasetSelector extends React.Component {
  constructor(props) {
    super(props);

    // TODO: Move these into Default.js
    this.DEF_INTERP_TYPE = Object.freeze("gaussian");
    this.DEF_INTERP_RADIUS_KM = Object.freeze(25);
    this.DEF_INTERP_NUM_NEIGHBOURS = Object.freeze(10);

    this.state = {
      loading: false,
      loadingPercent: 0,
      loadingTitle: "",
      datasetVariables: [],
      datasetTimestamps: [],
      datasetDepths: [],
      options: {
        ...props.options,
      },
      ...DATASET_DEFAULTS,
    };

    // Function bindings
    this.onUpdate = this.onUpdate.bind(this);
    this.handleGoButton = this.handleGoButton.bind(this);
  }

  changeDataset(newDataset, currentVariable, updateParentOnSuccess = false) {
    const currentDataset = this.state.availableDatasets.filter((d) => {
      return d.id === newDataset;
    })[0];

    this.setState({
      loading: true,
      loadingPercent: 10,
      loadingTitle: `${currentDataset.value}`,
    });

    const quantum = currentDataset.quantum;
    const model_class = currentDataset.model_class;

    GetVariablesPromise(newDataset).then(
      (variableResult) => {
        this.setState({ loadingPercent: 33 });

        // Carry the currently selected variable to the new
        // dataset if said variable exists in the new dataset.
        let newVariable = currentVariable;
        let newVariableScale = this.state.variable_scale;
        let interpType = this.state.options.interpType;
        let interpRadius = this.state.options.interpRadius;
        let interpNeighbours = this.state.options.interpNeighbours;
        const variableIds = variableResult.data.map((v) => {
          return v.id;
        });
        if (!variableIds.includes(currentVariable)) {
          newVariable = variableResult.data[0].id;
          newVariableScale = variableResult.data[0].scale;
          interpType =
            variableResult.data[0].interp?.interpType || this.DEF_INTERP_TYPE;
          interpRadius =
            variableResult.data[0].interp?.interpRadius ||
            this.DEF_INTERP_RADIUS_KM;
          interpNeighbours =
            variableResult.data[0].interp?.interpNeighbours ||
            this.DEF_INTERP_NUM_NEIGHBOURS;
        }

        // eslint-disable-next-line max-len
        GetTimestampsPromise(newDataset, newVariable).then(
          (timeResult) => {
            this.setState({ loadingPercent: 75 });

            const timeData = timeResult.data;

            const newTime = timeData[timeData.length - 1].id;
            const newStarttime =
              timeData.length > 20
                ? timeData[timeData.length - 20].id
                : timeData[0].id;

            // eslint-disable-next-line max-len
            GetDepthsPromise(newDataset, newVariable).then(
              (depthResult) => {
                this.setState({ loadingPercent: 90 });

                // Update everything in one shot/
                // transaction
                // if ALL API requests succeed.
                // Avoids many small state updates
                // which leads to bad performance,
                // increases risk of race
                // conditions, and having the UI
                // in a bad state if one of the
                // API calls fail.
                this.setState(
                  {
                    loading: false,
                    loadingPercent: 0,

                    dataset: newDataset,
                    model_class: model_class,
                    quantum: quantum,

                    datasetVariables: variableResult.data,
                    variable: newVariable,
                    variable_scale: newVariableScale,
                    quiverVariable: "none",

                    time: newTime,
                    starttime: newStarttime,
                    datasetTimestamps: timeData,

                    datasetDepths: depthResult.data,
                    depth: 0, // Default to surface for simplicity but could change later

                    options: {
                      ...this.props.options,
                      interpType: interpType,
                      interpRadius: interpRadius,
                      interpNeighbours: interpNeighbours,
                    },
                  },
                  () => {
                    if (updateParentOnSuccess) {
                      this.updateParent();
                    }
                  }
                );
              },
              (error) => {
                this.setState({ loading: false, loadingPercent: 0 });
                console.error(error);
              }
            );
          },
          (error) => {
            this.setState({ loading: false, loadingPercent: 0 });
            console.error(error);
          }
        );
      },
      (error) => {
        this.setState({ loading: false, loadingPercent: 0 });
        console.error(error);
      }
    );
  }

  changeVariable(newVariable) {
    if (this.state.datasetDepths.length === 0) {
      this.setState({
        loading: true,
        loadingPercent: 70,
      });
      GetDepthsPromise(this.state.dataset, newVariable).then((depthResult) => {
        this.setState({
          datasetDepths: depthResult.data,
          depth: 0,
          loading: false,
          loadingPercent: 0,
        });
      });
    }

    let newState = {};

    // Multiple variables were selected
    // so don't update everything else
    if (newVariable instanceof HTMLCollection) {
      newState = {
        variable: Array.from(newVariable).map((o) => o.value),
        variable_two_dimensional: false,
      };
    } else {
      const variable = this.state.datasetVariables.find(
        (v) => v.id === newVariable
      );

      newState = {
        variable: newVariable,
        variable_scale: variable.scale,
        variable_two_dimensional: variable.two_dimensional,
        options: {
          ...this.state.options,
          interpType: variable.interp?.interpType || this.DEF_INTERP_TYPE,
          interpRadius:
            variable.interp?.interpRadius || this.DEF_INTERP_RADIUS_KM,
          interpNeighbours:
            variable.interp?.interpNeighbours || this.DEF_INTERP_NUM_NEIGHBOURS,
        },
      };
    }

    this.setState(newState);
  }

  componentDidMount() {
    GetDatasetsPromise().then(
      (result) => {
        this.setState(
          {
            availableDatasets: result.data,
          },
          () => {
            // This if-check passes when a point, line, or area window
            // is first created by drawing something on the main map.
            // We wish to copy the selected dataset and variable to
            // the pop up windows for convenience.
            if (this.props.mountedDataset && this.props.mountedVariable) {
              this.changeDataset(
                this.props.mountedDataset,
                this.props.mountedVariable
              );
            } else {
              // Use defaults in DATASET_DEFAULTS
              this.changeDataset(this.state.dataset, this.state.variable, true);
            }
          }
        );
      },
      (error) => {
        console.error(error);
      }
    );
  }

  nothingChanged(key, value) {
    return this.state[key] === value;
  }

  datasetChanged(key) {
    return key === "dataset";
  }

  variableChanged(key) {
    return key === "variable";
  }

  onUpdate(key, value) {
    if (this.nothingChanged(key, value)) {
      return;
    }

    // There's extra logic involved with changing datasets
    // and variables so delegate that to their own
    // functions.
    if (this.datasetChanged(key)) {
      this.changeDataset(value, this.state.variable);
      return;
    }

    if (this.variableChanged(key)) {
      this.changeVariable(value);
      return;
    }

    const newState = {
      [key]: value,
    };

    this.setState(newState);
  }

  updateParent() {
    const parentState = {};
    for (const attrib of PARENT_ATTRIBUTES_TO_UPDATE) {
      parentState[attrib] = this.state[attrib];
    }

    this.props.onUpdate(this.props.id, parentState);
  }

  handleGoButton() {
    this.updateParent();
  }

  render() {
    _("Dataset");
    _("Variable");
    _("Depth");
    _("Time (UTC)");
    _("Start Time (UTC)");
    _("End Time (UTC)");
    _("Quiver Variable");
    _("Variable Range");

    let datasetSelector = null;
    // eslint-disable-next-line max-len
    if (
      this.state.availableDatasets &&
      this.state.availableDatasets.length > 0 &&
      !this.state.loading
    ) {
      const helpContent = this.state.availableDatasets.map((d) => {
        return (
          <p key={`help-${d.id}`}>
            <em>{d.value}</em>
            <span dangerouslySetInnerHTML={{ __html: d.help }} />
          </p>
        );
      });

      datasetSelector = (
        <DatasetDropdown
          id={`dataset-selector-dataset-selector-${this.props.id}`}
          key={`dataset-selector-dataset-selector-${this.props.id}`}
          datasets={this.state.availableDatasets.map((d) => {
            return { id: d.id, value: d.value, group: d.group, subgroup: d.subgroup};
          })}
          label={_("Dataset")}
          onChange={this.onUpdate}
          selected={this.state.dataset}
          helpContent={helpContent}
        />
      );
    }

    let timeSelector = null;
    if (this.state.datasetTimestamps && !this.state.loading) {
      if (this.props.showTimeRange) {
        timeSelector = (
          <div>
            <TimePicker
              key="starttime"
              id="starttime"
              state={this.state.starttime}
              def=""
              quantum={this.state.quantum}
              title={_("Start Time (UTC)")}
              onUpdate={this.onUpdate}
              max={this.state.time}
              dataset={this.state.dataset}
              variable={this.state.variable}
            />
            <TimePicker
              key="time"
              id="time"
              state={this.state.time}
              def=""
              quantum={this.state.quantum}
              title={_("End Time (UTC)")}
              onUpdate={this.onUpdate}
              min={this.state.starttime}
              dataset={this.state.dataset}
              variable={this.state.variable}
            />
          </div>
        );
      } else {
        timeSelector = (
          <TimePicker
            key="time"
            id="time"
            state={this.state.time}
            def={-1}
            quantum={this.state.quantum}
            onUpdate={this.onUpdate}
            title={_("Time (UTC)")}
            dataset={this.state.dataset}
            variable={this.state.variable}
          />
        );
      }
    }

    let quiverSelector = null;
    if (this.props.showQuiverSelector && !this.state.loading) {
      let quiverVariables = [];
      if (
        this.state.datasetVariables &&
        MODEL_CLASSES_WITH_QUIVER.includes(this.state.model_class)
      ) {
        quiverVariables = this.state.datasetVariables.filter((variable) => {
          return variable.vector_variable;
        });
      }
      quiverVariables.unshift({ id: "none", value: "None" });

      quiverSelector = (
        <SelectBox
          id={`dataset-selector-quiver-selector-${this.props.id}`}
          name="quiverVariable"
          label={_("Quiver Variable")}
          placeholder={_("Quiver Variable")}
          options={quiverVariables}
          onChange={this.onUpdate}
          selected={this.state.quiverVariable}
        />
      );
    }

    let depthSelector = null;
    // eslint-disable-next-line max-len
    if (
      this.props.showDepthSelector &&
      this.state.datasetDepths &&
      this.state.datasetDepths.length > 0 &&
      !this.state.loading &&
      !this.state.variable_two_dimensional
    ) {
      depthSelector = (
        <SelectBox
          id={`dataset-selector-depth-selector-${this.props.id}`}
          name={"depth"}
          label={_("Depth")}
          placeholder={_("Depth")}
          options={
            this.props.showDepthsAll
              ? this.state.datasetDepths
              : this.state.datasetDepths.filter((d) => d.id !== "all")
          }
          onChange={this.onUpdate}
          selected={
            this.state.datasetDepths.filter((d) => {
              let depth = parseInt(this.state.depth);
              if (isNaN(depth)) {
                // when depth == "bottom" or "all"
                depth = this.state.depth;
              }

              return d.id === depth;
            })[0].id
          }
        />
      );
    }

    let variableSelector = null;
    if (
      this.props.showVariableSelector &&
      this.state.datasetVariables &&
      this.state.datasetVariables.length > 0 &&
      !this.state.loading
    ) {
      let options = [];
      if (this.props.variables === "3d") {
        options = this.state.datasetVariables.filter((v) => {
          return v.two_dimensional === false;
        });
      } else {
        options = this.state.datasetVariables;
      }

      // Work-around for when someone selected a plot that requires
      // 3D variables, but the selected dataset doesn't have any LOL.
      // This check prevents a white-screen crash.
      const stillHasVariablesToShow = options.length > 0;

      let selected = this.state.variable;
      if (this.props.multipleVariables && !Array.isArray(selected)) {
        selected = [selected];
      }

      variableSelector = stillHasVariablesToShow && (
        <SelectBox
          id={`dataset-selector-variable-selector-${this.props.id}`}
          name={"variable"}
          label={_("Variable")}
          placeholder={_("Variable")}
          options={options}
          onChange={this.onUpdate}
          selected={selected}
          multiple={this.props.multipleVariables}
        />
      );
    }

    let variableRange = null;
    if (
      this.props.showVariableRange &&
      this.state.datasetVariables &&
      this.state.datasetVariables.length > 0 &&
      !this.state.loading
    ) {
      variableRange = (
        <Range
          id="variable_scale"
          state={this.state.variable_scale}
          title={_("Colormap Range")}
          onUpdate={this.onUpdate}
          default_scale={
            this.state.datasetVariables.find(
              (v) => v.id === this.state.variable
            ).scale
          }
          autourl={
            "/api/v2.0/range/" +
            this.state.dataset +
            "/" +
            this.state.variable +
            "/" +
            this.props.options.interpType +
            "/" +
            this.props.options.interpRadius +
            "/" +
            this.props.options.interpNeighbours +
            "/" +
            this.props.projection +
            "/" +
            this.props.extent.join(",") +
            "/" +
            this.state.depth +
            "/" +
            this.state.time +
            ".json"
          }
        />
      );
    }

    const goButtonTooltip = (
      <Tooltip id="goButtonTooltip">{_("Click to apply selections")}</Tooltip>
    );

    return (
      <div id={`dataset-selector-${this.props.id}`} className="DatasetSelector">
        {datasetSelector}

        {variableSelector}

        {quiverSelector}

        {depthSelector}

        {timeSelector}

        {variableRange}

        <OverlayTrigger placement="bottom" overlay={goButtonTooltip}>
          <Button bsStyle="primary" block onClick={this.handleGoButton}>
            Go
          </Button>
        </OverlayTrigger>

        <Modal
          show={this.state.loading}
          backdrop
          size="sm"
          style={{ top: "33%" }}
        >
          <Modal.Header>
            <Modal.Title>Loading {this.state.loadingTitle}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <ProgressBar active now={this.state.loadingPercent} />
          </Modal.Body>
        </Modal>
      </div>
    );
  }
}

//***********************************************************************
DatasetSelector.propTypes = {
  onUpdate: PropTypes.func.isRequired,
  id: PropTypes.string.isRequired,
  variables: PropTypes.string,
  multipleVariables: PropTypes.bool,
  showQuiverSelector: PropTypes.bool,
  showTimeRange: PropTypes.bool,
  showDepthSelector: PropTypes.bool,
  showVariableRange: PropTypes.bool,
  showVariableSelector: PropTypes.bool,
  showDepthsAll: PropTypes.bool,
  mountedDataset: PropTypes.string,
  mountedVariable: PropTypes.string,
};

DatasetSelector.defaultProps = {
  showQuiverSelector: true,
  multipleVariables: false,
  showTimeRange: false,
  showDepthSelector: true,
  showVariableRange: true,
  showVariableSelector: true,
  showDepthsAll: false,
};

export default withTranslation()(DatasetSelector);
