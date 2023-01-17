import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";

import {
  Modal,
  ProgressBar,
  Button,
  Tooltip,
  OverlayTrigger,
} from "react-bootstrap";

import DatasetDropdown from "./DatasetDropdown.jsx";
import SelectBox from "./lib/SelectBox.jsx"
import Range from "./Range.jsx"

import {
  GetDatasetsPromise,
  GetVariablesPromise,
  GetTimestampsPromise,
  GetDepthsPromise,
} from "../remote/OceanNavigator.js";

import { DATASET_DEFAULTS, MAP_SETTINGS } from "./Defaults.js";

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
    GetDatasetsPromise().then(
      (result) => {
        setAvailableDatasets(result.data)
      }
    );
  }, []);

  useEffect(() => {
    if (props.mountedDataset && props.mountedVariable) {
      changeDataset(
        props.mountedDataset,
        props.mountedVariable
      );
    } else if (availableDatasets.length > 0) {
      // Use defaults in DATASET_DEFAULTS
      changeDataset(dataset.dataset, dataset.variable, true);
    }
  }, [props, availableDatasets]);

  const changeDataset = (newDataset, currentVariable, updateParentOnSuccess = false) => {
    const currentDataset = availableDatasets.filter((d) => {
      return d.id === newDataset;
    })[0];

    setLoading(true);
    setLoadingPercent(10);
    setLoadingTitle(`${currentDataset.value}`)

    const quantum = currentDataset.quantum;
    const model_class = currentDataset.model_class;

    GetVariablesPromise(newDataset).then(
      (variableResult) => {
        setLoadingPercent(33);

        // Carry the currently selected variable to the new
        // dataset if said variable exists in the new dataset.
        let newVariable = currentVariable;
        let newVariableScale = dataset.variable_scale;
        let variable_range = {};
        variable_range[newVariable] = null;
        let interpType = props.options.interpType;
        let interpRadius = props.options.interpRadius;
        let interpNeighbours = props.options.interpNeighbours;
        const variableIds = variableResult.data.map((v) => {
          return v.id;
        });

        if (!variableIds.includes(currentVariable)) {
          newVariable = variableResult.data[0].id;
          newVariableScale = variableResult.data[0].scale;
          variable_range[newVariable] = null;
          interpType =
            variableResult.data[0].interp?.interpType || MAP_SETTINGS.interpType;
          interpRadius =
            variableResult.data[0].interp?.interpRadius ||
            MAP_SETTINGS.interpRadius;
          interpNeighbours =
            variableResult.data[0].interp?.interpNeighbours ||
            MAP_SETTINGS.interpNeighbours;
        }

        GetTimestampsPromise(newDataset, newVariable).then(
          (timeResult) => {
            setLoadingPercent(75);

            const timeData = timeResult.data;

            const newTime = timeData[timeData.length - 1].id;
            const newStarttime =
              timeData.length > 20
                ? timeData[timeData.length - 20].id
                : timeData[0].id;

            GetDepthsPromise(newDataset, newVariable).then(
              (depthResult) => {
                setLoadingPercent(90);

                // Update everything in one shot/
                // transaction
                // if ALL API requests succeed.
                // Avoids many small state updates
                // which leads to bad performance,
                // increases risk of race
                // conditions, and having the UI
                // in a bad state if one of the
                // API calls fail.

                setLoading(false);
                setLoadingPercent(0);
                setDataset({
                  dataset: newDataset,
                  model_class: model_class,
                  quantum: quantum,
                  time: newTime,
                  depth: 0,
                  starttime: newStarttime,
                  datasetTimestamps: timeData,
                  variable: newVariable,
                  variable_scale: newVariableScale,
                  variable_range: variable_range,
                })
                setDatasetVariables(variableResult.data)
                setDatasetTimestamps(timeData)
                setDatasetDepths(depthResult.data)
                setOptions({
                  ...props.options,
                  interpType: interpType,
                  interpRadius: interpRadius,
                  interpNeighbours: interpNeighbours,
                })

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
    )
  }

  const nothingChanged = (key, value) => {
    return this.state[key] === value;
  }

  const datasetChanged = (key) => {
    return key === "dataset";
  }

  const variableChanged = (key) => {
    return key === "variable";
  }

  const onUpdate = () => {
    if (nothingChanged(key, value)) {
      return;
    }

    // There's extra logic involved with changing datasets
    // and variables so delegate that to their own
    // functions.
    if (datasetChanged(key)) {
      changeDataset(value, dataset.variable);
      return;
    }

    if (variableChanged(key)) {
      changeVariable(value);
      return;
    }

    if (key == "variable_range") {
      let range = dataset.variable_range;
      range[value[0]] = value[1]
      setDataset({ ...dataset, variable_range: range })
      return;
    }

    const newState = {
      [key]: value,
    };

    this.setState(newState);
  }

  const changeVariable = (newVariable) => {
    if (datasetDepths.length === 0) {
      setLoading(true);
      setLoadingPercent(70);

      GetDepthsPromise(dataset.dataset, newVariable).then((depthResult) => {
        setDatasetDepths(depthResult.data)
        setDataset({...dataset, depth: 0})
        setLoading(false)
        setLoadingPercent(0)
      });
    }

    let newState = {};

    // Multiple variables were selected
    // so don't update everything else
    if (newVariable instanceof HTMLCollection) {
      let variables = Array.from(newVariable).map((o) => o.value);
      let variableRanges = {};
      variables.forEach(v => {
        variableRanges[v] = null;
      });
      newState = {
        variable: variables,
        variable_range: variableRanges,
        variable_two_dimensional: false,
      };
    } else {
      const variable = datasetVariables.find(
        (v) => v.id === newVariable
      );
      let newVariableRange = {};
      newVariableRange[newVariable] = null;

      setDataset({
        ...dataset,
        variable: newVariable,
        variable_scale: [variable.scale],
        variable_range: newVariableRange,
        variable_two_dimensional: variable.two_dimensional,        
      }),

      setOptions({
        ...options,
        interpType: variable.interp?.interpType || MAP_SETTINGS.interpType,
        interpRadius:
          variable.interp?.interpRadius || MAP_SETTINGS.interpRadius,
        interpNeighbours:
          variable.interp?.interpNeighbours || MAP_SETTINGS.interpNeighbours,
      });
    }
  }

  let datasetSelector = null;

  if (
    availableDatasets &&
    availableDatasets.length > 0 &&
    !loading
  ) {
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
        name={"Dataset"}
        label={"Dataset"}
        options={availableDatasets}
        onChange={onUpdate}
        selected={dataset.dataset}
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
        onChange={onUpdate}
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
        label={"Quiver Variable"}
        placeholder={"Quiver Variable"}
        options={quiverVariables}
        onChange={onUpdate}
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
        onChange={onUpdate}
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

  // let timeSelector = null;
  //   if (datasetTimestamps && !loading) {
  //     let v = Array.isArray(dataset.variable) ? dataset.variable[0] : dataset.variable;
  //     if (props.showTimeRange) {
  //       timeSelector = (
  //         <div>
  //           <TimePicker
  //             key="starttime"
  //             id="starttime"
  //             state={dataset.starttime}
  //             def=""
  //             quantum={dataset.quantum}
  //             title={"Start Time (UTC)"}
  //             onUpdate={onUpdate}
  //             max={dataset.time}
  //             dataset={dataset.dataset}
  //             variable={v}
  //           />
  //           <TimePicker
  //             key="time"
  //             id="time"
  //             state={dataset.time}
  //             def=""
  //             quantum={dataset.quantum}
  //             title={"End Time (UTC)"}
  //             onUpdate={onUpdate}
  //             min={dataset.starttime}
  //             dataset={dataset.dataset}
  //             variable={v}
  //           />
  //         </div>
  //       );
  //     } else {
  //       timeSelector = (
  //         <TimePicker
  //           key="time"
  //           id="time"
  //           state={dataset.time}
  //           def={-1}
  //           quantum={dataset.quantum}
  //           onUpdate={onUpdate}
  //           title={"Time (UTC)"}
  //           dataset={dataset.dataset}
  //           variable={v}
  //         />
  //       );
  //     }
  //   }

  let variableRange = null;
    if (
      props.showVariableRange &&
      datasetVariables &&
      datasetVariables.length > 0 &&
      !loading
    ) {
      variableRange = (
        <Range
          id="variable_scale"
          state={dataset.variable_scale}
          title={"Colormap Range"}
          onUpdate={onUpdate}
          default_scale={
            datasetVariables.find(
              (v) => v.id === dataset.variable
            ).scale
          }
          autourl={
            "/api/v2.0/range/" +
            dataset.dataset +
            "/" +
            dataset.variable +
            "/" +
            options.interpType +
            "/" +
            options.interpRadius +
            "/" +
            options.interpNeighbours +
            "/" +
            options.projection +
            "/" +
            options.extent.join(",") +
            "/" +
            dataset.depth +
            "/" +
            dataset.time
          }
        />
      );
    }



  return (
    <div id={`dataset-selector-${props.id}`} className="DatasetSelector">
      {datasetSelector}

      {variableSelector}

      {quiverSelector}

      {depthSelector}

      {/* {timeSelector} */}

      {variableRange}
{/* 
      {axisRange} */}

      {/* <OverlayTrigger placement="bottom" overlay={goButtonTooltip}>
        <Button bsStyle="primary" block onClick={handleGoButton}>
          Go
        </Button>
      </OverlayTrigger> */}

      <Modal
        show={loading}
        backdrop
        size="sm"
        style={{ top: "33%" }}
      >
        <Modal.Header>
          <Modal.Title>Loading {loadingTitle}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ProgressBar now={loadingPercent} />
        </Modal.Body>
      </Modal>
    </div>
  );
};

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