import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Modal, ProgressBar, Button } from "react-bootstrap";

import AxisRange from "./AxisRange.jsx";
import SelectBox from "./lib/SelectBox.jsx";
import TimeSlider from "./TimeSlider.jsx";
import TimePicker from "./TimePicker.jsx";

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
  const [dataset, setDataset] = useState(props.mountedDataset ? props.mountedDataset : DATASET_DEFAULTS);
  const [availableDatasets, setAvailableDatasets] = useState([]);
  const [updateParent, setUpdateParent] = useState(false);

  useEffect(() => {
    GetDatasetsPromise().then((result) => {
      setAvailableDatasets(result.data);
    });
  }, []);

  useEffect(() => {
    if (availableDatasets.length > 0) {
      if (props.mountedDataset) {
        changeDataset(props.mountedDataset.id, props.mountedDataset.variable);
      } else {
        // Use defaults in DATASET_DEFAULTS
        changeDataset(dataset.id, dataset.variable, true);
      }
    }
  }, [availableDatasets]);

  useEffect(() => {
    if (updateParent) {
      props.onUpdate("dataset", dataset);
      setUpdateParent(false);
    }
  }, [dataset]);

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
                  quiverVariable: "None"
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
                  setUpdateParent(true);
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
        variable_scale: variable.scale,
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
    props.onUpdate("dataset", dataset);
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
        horizontalLayout={props.horizontalLayout}
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
        horizontalLayout={props.horizontalLayout}
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
        selected={dataset.quiverVariable}
        loading={loading}
        horizontalLayout={props.horizontalLayout}
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
        horizontalLayout={props.horizontalLayout}
      />
    );
  }

  let timeSelector = null;
  if (props.showTimeSlider) {
    timeSelector = (
      <TimeSlider
        key="time"
        id="time"
        dataset={dataset}
        timestamps={datasetTimestamps}
        selected={dataset.time}
        onChange={updateDataset}
        loading={loading}
      />
    );
  } else if (datasetTimestamps && !loading) {
    if (props.showTimeRange) {
      timeSelector = (
        <div>
          <TimePicker
            key="starttime"
            id="starttime"
            state={dataset.starttime}
            title={"Start Time (UTC)"}
            onUpdate={updateDataset}
            max={dataset.time}
            dataset={dataset}
            timestamps={datasetTimestamps}
          />
          <TimePicker
            key="time"
            id="time"
            state={dataset.time}
            title={"End Time (UTC)"}
            onUpdate={updateDataset}
            min={dataset.starttime}
            dataset={dataset}
            timestamps={datasetTimestamps}
          />
        </div>
      );
    } else {
      timeSelector = (
        <TimePicker
          key="time"
          id="time"
          state={dataset.time}
          onUpdate={updateDataset}
          title={"Time (UTC)"}
          dataset={dataset}
          timestamps={datasetTimestamps}
        />
      );
    }
  }

  const goButton = (
    <Button
      className="go-button"
      variant="primary"
      type="submit"
      onClick={handleGoButton}
      disabled={loading}
    >
      Go
    </Button>
  );

  function updateAxisRange(key, value) {
    let range = dataset.variable_range;
    range[value[0]] = value[1]
    setDataset({...dataset, variable_range: range})
  }

  let axisRange = [];
    if (
      props.showAxisRange &&
      datasetVariables &&
      datasetVariables.length > 0 &&
      !loading
    ) {
      let axisVariables = Array.isArray(dataset.variable) ? dataset.variable : [dataset.variable];
      let variableData = datasetVariables.filter((v) => axisVariables.includes(v.id));
      let axisVariableRanges = variableData.map((v) => v.scale);
      let axisVariableNames = variableData.map((v) => v.value);
      for (let i = 0; i < axisVariables.length; ++i) {
        let range = <AxisRange
          key={axisVariables[i] + "_axis_range"}
          id={axisVariables[i] + "_axis_range"}
          title={axisVariableNames[i] + " Range"}
          variable={axisVariables[i]}
          range={axisVariableRanges[i]}
          onUpdate={updateAxisRange}
        />
        axisRange.push(range)
      }
    }

  return (
    <>
      <div
        id={`dataset-selector-${props.id}`}
        className={
          props.horizontalLayout
            ? "DatasetSelector-horizontal"
            : "DatasetSelector"
        }
      >
        {datasetSelector}
        {variableSelector}
        {quiverSelector}
        {depthSelector}
        {props.horizontalLayout ? goButton : null}
      </div>
      {timeSelector}

      {axisRange}
      {props.horizontalLayout ? null : goButton}

      <Modal show={loading} backdrop size="sm" dialogClassName="loading-modal">
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
  mountedDataset: PropTypes.object,
  horizontalLayout: PropTypes.bool,
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
  horizontalLayout: false,
};

export default DatasetSelector;
