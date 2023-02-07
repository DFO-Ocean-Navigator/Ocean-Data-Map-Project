import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Modal, ProgressBar, Button } from "react-bootstrap";

import SelectBox from "./lib/SelectBox.jsx";
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
  const [loading, setLoading] = useState(true);
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
  }, [availableDatasets]);

  const changeDataset = (
    newDataset,
    currentVariable,
    updateParentOnSuccess = false
  ) => {
    const currentDataset = availableDatasets.filter((d) => {
      return d.id === newDataset;
    })[0];

    setLoading(true);
    setLoadingPercent(10);
    setLoadingTitle(currentDataset.value);

    const quantum = currentDataset.quantum;
    const model_class = currentDataset.model_class;

    GetVariablesPromise(newDataset).then(
      (variableResult) => {
        // Carry the currently selected variable to the new
        // dataset if said variable exists in the new dataset.
        setLoadingPercent(33);
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
            setLoadingPercent(66);
            const timeData = timeResult.data;

            const newTime = timeData[timeData.length - 1].id;
            const newStarttime =
              timeData.length > 20
                ? timeData[timeData.length - 20].id
                : timeData[0].id;

            GetDepthsPromise(newDataset, newVariable).then(
              (depthResult) => {
                setLoadingPercent(90);
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
                setLoading(false);
                setLoadingPercent(100);

                if (updateParentOnSuccess) {
                  // updateParent();
                }
              },
              (error) => {
                setLoading(false);
                setLoadingPercent(0);
                console.error(error);
              }
            );
          },
          (error) => {
            setLoading(false);
            setLoadingPercent(0);
            console.error(error);
          }
        );
      },
      (error) => {
        setLoading(false);
        setLoadingPercent(0);
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

    setDataset({ ...dataset, ...newDataset });
    setOptions({ ...options, ...newOptions });
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

  const handleGoButton = () => {
    props.onUpdate(dataset);
  };

  let datasetSelector = null;

  if (availableDatasets && availableDatasets.length > 0) {
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
        loading={loading}
      />
    );
  }

  let variableSelector = null;
  if (
    props.showVariableSelector &&
    datasetVariables &&
    datasetVariables.length > 0
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
        loading={loading}
      />
    );
  }

  let quiverSelector = null;
  if (props.showQuiverSelector) {
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
        label={"Quiver"}
        placeholder={"Quiver Variable"}
        options={quiverVariables}
        onChange={updateDataset}
        selected={quiverVariable}
        loading={loading}
      />
    );
  }

  let depthSelector = null;
  if (
    props.showDepthSelector &&
    datasetDepths &&
    datasetDepths.length > 0 &&
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
        loading={loading}
      />
    );
  }

  let timeSelector = null;
  timeSelector = (
    <TimeSlider
      key="time"
      id="time"
      dataset={dataset}
      timestamps={datasetTimestamps}
      initialValue={dataset.time}
      onChange={updateDataset}
      loading={loading}
    />
  );

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
        <Button
          variant="primary"
          type="submit"
          onClick={handleGoButton}
          disabled={loading}
        >
          Go
        </Button>
      </div>
      {timeSelector}

      <Modal
        show={loading}
        backdrop
        size="sm"
        style={{ top: "33%", opacity: 1 }}
      >
        <Modal.Header>
          <Modal.Title>Loading {loadingTitle}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ProgressBar now={loadingPercent} />
        </Modal.Body>
      </Modal>
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
