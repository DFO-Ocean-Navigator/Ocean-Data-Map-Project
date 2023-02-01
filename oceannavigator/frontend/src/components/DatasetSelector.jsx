import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";

import {
  Modal,
  ProgressBar,
  Button,
  Tooltip,
  OverlayTrigger,
  Form,
  Row,
  Col,
} from "react-bootstrap";

import DatasetDropdown from "./DatasetDropdown.jsx";
import SelectBox from "./lib/SelectBox.jsx";
import Range from "./Range.jsx";
import TimeSlider from "./TimeSlider.jsx";

import {
  GetDatasetsPromise,
  GetVariablesPromise,
  GetTimestampsPromise,
  GetDepthsPromise,
} from "../remote/OceanNavigator.js";

import { DATASET_DEFAULTS, MAP_DEFAULTS } from "./Defaults.js";

const MODEL_CLASSES_WITH_QUIVER = Object.freeze(["Mercator"]);

function DatasetSelector(props) {
  const [loading, setLoading] = useState(false);
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [loadingTitle, setLoadingTitle] = useState("");
  const [datasetVariables, setDatasetVariables] = useState([]);
  const [datasetTimestamps, setDatasetTimestamps] = useState([]);
  const [datasetDepths, setDatasetDepths] = useState([]);
  const [options, setOptions] = useState(props.options);
  const [dataset, setDataset] = useState(DATASET_DEFAULTS);
  const [availableDatasets, setAvailableDatasets] = useState([]);
  const [quiverVariable, setQuiverVariable] = useState("none");

  useEffect(() => {
    GetDatasetsPromise().then((result) => {
      setAvailableDatasets(result.data);
    });
  }, []);

  useEffect(() => {
    if (props.mountedDataset && props.mountedVariable) {
      changeDataset(props.mountedDataset, props.mountedVariable);
    } else if (availableDatasets.length > 0) {
      // Use defaults in DATASET_DEFAULTS
      changeDataset(dataset.id, dataset.variable, true);
    }
  }, [props, availableDatasets]);

  const changeDataset = (
    newDataset,
    currentVariable,
    updateParentOnSuccess = false
  ) => {
    const currentDataset = availableDatasets.filter((d) => {
      return d.id === newDataset;
    })[0];

    const quantum = currentDataset.quantum;
    const model_class = currentDataset.model_class;

    GetVariablesPromise(newDataset).then(
      (variableResult) => {
        // Carry the currently selected variable to the new
        // dataset if said variable exists in the new dataset.
        let newVariable = currentVariable;
        let newVariableScale = dataset.variable_scale;
        let variable_range = {};
        variable_range[newVariable] = null;
        let interpType = props.mapSettings.interpType;
        let interpRadius = props.mapSettings.interpRadius;
        let interpNeighbours = props.mapSettings.interpNeighbours;
        const variableIds = variableResult.data.map((v) => {
          return v.id;
        });

        if (!variableIds.includes(currentVariable)) {
          newVariable = variableResult.data[0].id;
          newVariableScale = variableResult.data[0].scale;
          variable_range[newVariable] = null;
          interpType =
            variableResult.data[0].interp?.interpType ||
            MAP_DEFAULTS.interpType;
          interpRadius =
            variableResult.data[0].interp?.interpRadius ||
            MAP_DEFAULTS.interpRadius;
          interpNeighbours =
            variableResult.data[0].interp?.interpNeighbours ||
            MAP_DEFAULTS.interpNeighbours;
        }

        GetTimestampsPromise(newDataset, newVariable).then(
          (timeResult) => {
            const timeData = timeResult.data;

            const newTime = timeData[timeData.length - 1].id;
            const newStarttime =
              timeData.length > 20
                ? timeData[timeData.length - 20].id
                : timeData[0].id;

            GetDepthsPromise(newDataset, newVariable).then(
              (depthResult) => {
                setDataset({
                  id: newDataset,
                  model_class: model_class,
                  quantum: quantum,
                  time: newTime,
                  depth: 0,
                  starttime: newStarttime,
                  variable: newVariable,
                  variable_scale: newVariableScale,
                  variable_range: variable_range,
                });
                setDatasetVariables(variableResult.data);
                setDatasetTimestamps(timeData);
                setDatasetDepths(depthResult.data);
                setOptions({
                  ...props.options,
                  interpType: interpType,
                  interpRadius: interpRadius,
                  interpNeighbours: interpNeighbours,
                });

                if (updateParentOnSuccess) {
                  // updateParent();
                }
              },
              (error) => {
                // update loading bar
                console.error(error);
              }
            );
          },
          (error) => {
            // update loading bar
            console.error(error);
          }
        );
      },
      (error) => {
        // update loading bar
        console.error(error);
      }
    );
  };

  const changeVariable = (newVariable) => {
    if (datasetDepths.length === 0) {
      GetDepthsPromise(dataset.id, newVariable).then((depthResult) => {
        setDatasetDepths(depthResult.data);
        setDataset({ ...dataset, depth: 0 });
      });
    }

    let newDataset = {};
    let newOptions = {};

    // Multiple variables were selected
    // so don't update everything else
    if (newVariable instanceof HTMLCollection) {
      let variables = Array.from(newVariable).map((o) => o.value);
      let variableRanges = {};
      variables.forEach((v) => {
        variableRanges[v] = null;
      });
      newDataset = {
        variable: variables,
        variable_range: variableRanges,
        variable_two_dimensional: false,
      };
    } else {
      const variable = datasetVariables.find((v) => v.id === newVariable);
      let newVariableRange = {};
      newVariableRange[newVariable] = null;

      newDataset = {
        variable: newVariable,
        variable_scale: [variable.scale],
        variable_range: newVariableRange,
        variable_two_dimensional: variable.two_dimensional,
      };
      newOptions = {
        ...props.mapSettings,
        interpType: variable.interp?.interpType || MAP_DEFAULTS.interpType,
        interpRadius:
          variable.interp?.interpRadius || MAP_DEFAULTS.interpRadius,
        interpNeighbours:
          variable.interp?.interpNeighbours || MAP_DEFAULTS.interpNeighbours,
      };
    }

    setDataset({...dataset, ...newDataset});
    setOptions({...options, ...newOptions});
  };

  const nothingChanged = (key, value) => {
    return dataset[key] === value;
  };

  const datasetChanged = (key) => {
    return key === "dataset";
  };

  const variableChanged = (key) => {
    return key === "variable";
  };

  const updateDataset = (key, value) => {
    if (nothingChanged(key, value)) {
      return;
    }

    if (datasetChanged(key)) {
      changeDataset(value, dataset.variable);
      return;
    }

    if (variableChanged(key)) {
      changeVariable(value);
      return;
    }

    let newDataset = { ...dataset, [key]: value };
    setDataset(newDataset);
  };

  let datasetSelector = null;

  if (availableDatasets && availableDatasets.length > 0 && !loading) {
    const helpContent = availableDatasets.map((d) => {
      return (
        <p key={`help-${d.id}`}>
          <em>{d.value}</em>
          <span dangerouslySetInnerHTML={{ __html: d.help }} />
        </p>
      );
    });

    datasetSelector = (
      <SelectBox
        id={`dataset-selector-dataset-selector-${props.id}`}
        key={`dataset-selector-dataset-selector-${props.id}`}
        name={"dataset"}
        label={"Dataset"}
        options={availableDatasets}
        onChange={updateDataset}
        selected={dataset.id}
        helpContent={helpContent}
      />
    );
  }

  let variableSelector = null;
  if (
    props.showVariableSelector &&
    datasetVariables &&
    datasetVariables.length > 0 &&
    !loading
  ) {
    let options = [];
    if (props.variables === "3d") {
      options = datasetVariables.filter((v) => {
        return v.two_dimensional === false;
      });
    } else {
      options = datasetVariables;
    }

    // Work-around for when someone selected a plot that requires
    // 3D variables, but the selected dataset doesn't have any LOL.
    // This check prevents a white-screen crash.
    const stillHasVariablesToShow = options.length > 0;

    let selected = dataset.variable;
    if (props.multipleVariables && !Array.isArray(selected)) {
      selected = [selected];
    }

    variableSelector = stillHasVariablesToShow && (
      <SelectBox
        id={`dataset-selector-variable-selector-${props.id}`}
        name={"variable"}
        label={"Variable"}
        placeholder={"Variable"}
        options={options}
        onChange={updateDataset}
        selected={selected}
        multiple={props.multipleVariables}
      />
    );
  }

  let quiverSelector = null;
  if (props.showQuiverSelector && !loading) {
    let quiverVariables = [];
    if (
      datasetVariables &&
      MODEL_CLASSES_WITH_QUIVER.includes(dataset.model_class)
    ) {
      quiverVariables = datasetVariables.filter((variable) => {
        return variable.vector_variable;
      });
    }
    quiverVariables.unshift({ id: "none", value: "None" });

    quiverSelector = (
      <SelectBox
        id={`dataset-selector-quiver-selector-${props.id}`}
        name="quiverVariable"
        label={"Quiver"} // Variable"}
        placeholder={"Quiver Variable"}
        options={quiverVariables}
        onChange={updateDataset}
        selected={quiverVariable}
      />
    );
  }

  let depthSelector = null;
  if (
    props.showDepthSelector &&
    datasetDepths &&
    datasetDepths.length > 0 &&
    !loading &&
    !dataset.variable_two_dimensional
  ) {
    depthSelector = (
      <SelectBox
        id={`dataset-selector-depth-selector-${props.id}`}
        name={"depth"}
        label={"Depth"}
        placeholder={"Depth"}
        options={
          props.showDepthsAll
            ? datasetDepths
            : datasetDepths.filter((d) => d.id !== "all")
        }
        onChange={updateDataset}
        selected={
          datasetDepths.filter((d) => {
            let depth = parseInt(dataset.depth);
            if (isNaN(depth)) {
              // when depth == "bottom" or "all"
              depth = dataset.depth;
            }

            return d.id === depth;
          })[0].id
        }
      />
    );
  }

  let timeSelector = null;
  if (datasetTimestamps && datasetTimestamps.length > 0) {
    timeSelector = (
      <TimeSlider
        key="time"
        id="time"
        dataset={dataset}
        timestamps={datasetTimestamps}
        initialValue={dataset.time}
        onChange={updateDataset}
      />
    );
  }


  return (
    <>
      <div
        id={`dataset-selector-${props.id}`}
        className="DatasetSelector-horizontal"
      >
        {datasetSelector}
        {variableSelector}
        {quiverSelector}
        {depthSelector}
        <Button variant="primary" type="submit">
          Go
        </Button>
      </div>
      {timeSelector}
    </>
  );
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
  showAxisRange: PropTypes.bool,
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
  showAxisRange: false,
  showVariableSelector: true,
  showDepthsAll: false,
};

export default DatasetSelector;
