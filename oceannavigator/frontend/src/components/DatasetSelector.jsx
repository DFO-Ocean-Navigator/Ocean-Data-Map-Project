import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Slider from "rc-slider";
import { Modal, ProgressBar, Button, Form } from "react-bootstrap";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

import AxisRange from "./AxisRange.jsx";
import DatasetDropdown from "./DatasetDropdown.jsx";
import SelectBox from "./lib/SelectBox.jsx";
import TimeSlider from "./TimeSlider.jsx";
import TimePicker from "./TimePicker.jsx";
import DatasetSearchWindow from "./DatasetSearchWindow.jsx";
import { DATASET_FILTER_DEFAULTS } from "./Defaults.js";

import {
  GetDatasetsPromise,
  GetVariablesPromise,
  GetTimestampsPromise,
  GetDepthsPromise,
} from "../remote/OceanNavigator.js";

import { withTranslation } from "react-i18next";

import "rc-slider/assets/index.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

const MODEL_CLASSES_WITH_QUIVER = Object.freeze(["Mercator"]);

function DatasetSelector({
  onUpdate,
  id,
  variables,
  multipleVariables = false,
  showQuiverSelector = true,
  showTimeRange = false,
  showDepthSelector = true,
  showAxisRange = false,
  showVariableSelector = true,
  showDepthsAll = false,
  horizontalLayout = false,
  datasetSearch = false,
  mountedDataset,
  showTimeSlider,
  compareDatasets,
  showCompare,
  action,
  t,
}) {
  const [loading, setLoading] = useState(true);
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [loadingTitle, setLoadingTitle] = useState("");
  const [datasetVariables, setDatasetVariables] = useState([]);
  const [datasetTimestamps, setDatasetTimestamps] = useState([]);
  const [datasetDepths, setDatasetDepths] = useState([]);
  const [dataset, setDataset] = useState(mountedDataset);
  const [availableDatasets, setAvailableDatasets] = useState([]);
  const [updateParent, setUpdateParent] = useState(false);
  const [showDatasetSearch, setShowDatasetSearch] = useState(false);
  const [datasetSearchFilters, setDatasetSearchFilters] = useState(
    DATASET_FILTER_DEFAULTS
  );

  useEffect(() => {
    GetDatasetsPromise().then((result) => {
      setAvailableDatasets(result.data);
    });
  }, []);

  useEffect(() => {
    if (availableDatasets.length > 0) {
      changeDataset(mountedDataset.id, mountedDataset.variable, true);
    }
  }, [availableDatasets]);

  useEffect(() => {
    if (
      mountedDataset.id !== dataset.id ||
      mountedDataset.variable !== dataset.variable
    ) {
      changeDataset(mountedDataset.id, mountedDataset.variable, true);
    }
  }, [mountedDataset]);

  useEffect(() => {
    if (updateParent) {
      onUpdate("dataset", dataset);
      setUpdateParent(false);
    }
  }, [dataset]);

  const changeDataset = (
    newDataset,
    newVariable,
    updateParentOnSuccess = false,
    newQuiverVariable,
    newVariableScale,
    date
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
        newVariable = newVariable ?? mountedDataset.variable
        newVariableScale = newVariableScale ?? mountedDataset.variable_scale;
        newQuiverVariable = newQuiverVariable ?? mountedDataset.quiverVariable;
        let newQuiverDensity = mountedDataset.quiverDensity;
        let variable_range = {};
        variable_range[newVariable] = null;
        const variableIds = variableResult.data.map((v) => {
          return v.id;
        });

        if (!variableIds.includes(newVariable)) {
          newVariable = variableResult.data[0].id;
          newVariableScale = variableResult.data[0].scale;
          variable_range[newVariable] = null;
        }

        GetTimestampsPromise(newDataset, newVariable).then(
          (timeResult) => {
            setLoadingPercent(66);
            const timeData = timeResult.data;
            let newTime, newStarttime;
            if (date) {
              let dates = timeData.map((t) => new Date(t.value));
              let [, timeIdx] = dates.reduce((prev, curr, idx) => {
                let diff = Math.abs(curr - date)
                return diff <= prev[0] ? [diff, idx] : prev;
              }, [Infinity, 0]);
              newTime = timeData[timeIdx].id;
              newStarttime = timeIdx > 20
                  ? timeData[timeIdx - 20].id
                  : timeData[0].id;
            } else {
              newTime = timeData[timeData.length - 1].id;
              newStarttime = timeData.length > 20
                  ? timeData[timeData.length - 20].id
                  : timeData[0].id;
              if (mountedDataset && mountedDataset.id === newDataset) {
                newTime =
                  mountedDataset.time > 0 ? mountedDataset.time : newTime;
                newStarttime =
                  mountedDataset.starttime > 0
                    ? mountedDataset.starttime
                    : newStarttime;
              }
            }
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
                  quiverVariable: newQuiverVariable,
                  quiverDensity: newQuiverDensity,
                  default_location: currentDataset.default_location,
                });
                setDatasetVariables(variableResult.data);
                setDatasetTimestamps(timeData);
                setDatasetDepths(depthResult.data);
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
      });
    }

    let newDataset = {};

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
      if (variables.length === 1) {
        const variable = datasetVariables.find((v) => v.id === variables[0]);
        newDataset = { ...newDataset, variable_scale: variable.scale };
      }
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
    }

    setDataset((prevDataset) => {
      return { ...prevDataset, ...newDataset };
    });
  };

  const changeTime = (newTime) => {
    newTime = Number(newTime)
    let newStarttime = dataset.starttime;
    if (dataset.starttime > newTime) {
      const timeIdx = datasetTimestamps.findIndex(
        (timestamp) => timestamp.id === newTime
      );
      newStarttime =
        timeIdx > 20
          ? datasetTimestamps[timeIdx - 20].id
          : datasetTimestamps[0].id;
    }

    const newDataset = { ...dataset, time: newTime };

    if (newStarttime !== dataset.starttime) {
      newDataset.starttime = newStarttime;
    }

    if (
      mountedDataset.dataset === dataset.dataset &&
      mountedDataset.variable === dataset.variable
    ) {
      newDataset.variable_scale = mountedDataset.variable_scale;
    }

    setDataset(newDataset);
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

  const timeChanged = (key) => {
    return key === "time";
  };

  const updateDataset = (key, value, quiverVariable = null) => {
    if (nothingChanged(key, value)) {
      return;
    }

    if (datasetChanged(key)) {
      changeDataset(value, dataset.variable, quiverVariable);
      return;
    }

    if (variableChanged(key)) {
      changeVariable(value);
      return;
    }

    if (timeChanged(key)) {
      changeTime(value);
      return;
    }

    let newDataset = { ...dataset, [key]: value };
    setDataset(newDataset);
  };

  const handleGoButton = () => {
    onUpdate("dataset", dataset);
  };

  const toggleSearchDatasets = () => {
    setShowDatasetSearch((prevState) => !prevState);
  };

  const updateSearchFilters = (key, value) => {
    if (!key) {
      setDatasetSearchFilters(DATASET_FILTER_DEFAULTS);
    } else {
      value = value ? value : DATASET_FILTER_DEFAULTS[key];
      setDatasetSearchFilters((prevFilters) => ({
        ...prevFilters,
        [key]: value,
      }));
    }
  };

  let datasetSelector = null;

  if (availableDatasets && availableDatasets.length > 0) {
    datasetSelector = (
      <DatasetDropdown
        id={`dataset-selector-dataset-selector-${id}`}
        key={`dataset-selector-dataset-selector-${id}`}
        options={availableDatasets}
        label={t("Dataset")}
        placeholder={t("Dataset")}
        onChange={updateDataset}
        selected={dataset.id}
        horizontalLayout={horizontalLayout}
      />
    );
  }

  let variableSelector = null;
  if (showVariableSelector && datasetVariables && datasetVariables.length > 0) {
    let variableOptions = [];
    if (variables === "3d") {
      variableOptions = datasetVariables.filter((v) => {
        return v.two_dimensional === false;
      });
    } else {
      variableOptions = datasetVariables;
    }

    // Work-around for when someone selected a plot that requires
    // 3D variables, but the selected dataset doesn't have any LOL.
    // This check prevents a white-screen crash.
    const stillHasVariablesToShow = variableOptions.length > 0;

    let selected = dataset.variable;
    if (multipleVariables && !Array.isArray(selected)) {
      selected = [selected];
    }

    variableSelector = stillHasVariablesToShow && (
      <SelectBox
        id={`dataset-selector-variable-selector-${id}`}
        name={t("variable")}
        label={t("Variable")}
        placeholder={t("Variable")}
        options={variableOptions}
        onChange={updateDataset}
        selected={selected}
        multiple={multipleVariables}
        loading={loading}
        horizontalLayout={horizontalLayout}
      />
    );
  }

  let quiverSelector = null;
  if (showQuiverSelector) {
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
      <div className="quiver-options">
        <SelectBox
          id={`dataset-selector-quiver-selector-${id}`}
          name="quiverVariable"
          label={t("Quiver")}
          placeholder={t("Quiver Variable")}
          options={quiverVariables}
          onChange={updateDataset}
          selected={dataset.quiverVariable}
          loading={loading}
          horizontalLayout={horizontalLayout}
        />
        <Form.Label>Quiver Density</Form.Label>
        <Slider
          range
          allowCross={false}
          min={-1}
          max={1}
          marks={{
            "-1": "-",
            0: "",
            1: "+",
          }}
          defaultValue={dataset.quiverDensity}
          onChange={(x) => updateDataset("quiverDensity", parseInt(x))}
        />
      </div>
    );
  }

  let depthSelector = null;
  if (
    showDepthSelector &&
    datasetDepths &&
    datasetDepths.length > 0 &&
    !dataset.variable_two_dimensional
  ) {
    depthSelector = (
      <SelectBox
        id={`dataset-selector-depth-selector-${id}`}
        name={"depth"}
        label={t("Depth")}
        placeholder={t("Depth")}
        options={
          showDepthsAll
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
        horizontalLayout={horizontalLayout}
      />
    );
  }

  let timeSelector = null;
  if (showTimeSlider && !compareDatasets) {
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
    if (showTimeRange) {
      timeSelector = (
        <div>
          <TimePicker
            key="starttime"
            id="starttime"
            state={dataset.starttime}
            title={t("Start Time (UTC)")}
            onUpdate={updateDataset}
            max={dataset.time}
            dataset={dataset}
            timestamps={datasetTimestamps}
          />
          <TimePicker
            key="time"
            id="time"
            state={dataset.time}
            title={t("End Time (UTC)")}
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
          title={t("Time (UTC)")}
          dataset={dataset}
          timestamps={datasetTimestamps}
          horizontalLayout={horizontalLayout}
        />
      );
    }
  }

  const goButton = (
    <OverlayTrigger
      key="draw-overlay"
      placement={horizontalLayout ? "top" : "bottom"}
      overlay={<Tooltip id={"draw-tooltip"}>{t("Apply Changes")}</Tooltip>}
    >
      <Button
        className="go-button"
        variant="primary"
        type="submit"
        onClick={handleGoButton}
        disabled={loading}
      >
        {t("Go")}
      </Button>
    </OverlayTrigger>
  );

  function updateAxisRange(key, value) {
    let range = dataset.variable_range;
    range[value[0]] = value[1];
    setDataset({ ...dataset, variable_range: range });
  }

  let axisRange = [];
  if (
    showAxisRange &&
    datasetVariables &&
    datasetVariables.length > 0 &&
    !loading
  ) {
    let axisVariables = Array.isArray(dataset.variable)
      ? dataset.variable
      : [dataset.variable];
    let variableData = datasetVariables.filter((v) =>
      axisVariables.includes(v.id)
    );
    let axisVariableRanges = variableData.map((v) => v.scale);
    let axisVariableNames = variableData.map((v) => v.value);
    for (let i = 0; i < axisVariables.length; ++i) {
      let range = (
        <AxisRange
          key={axisVariables[i] + "_axis_range"}
          id={axisVariables[i] + "_axis_range"}
          title={axisVariableNames[i] + " Range"}
          variable={axisVariables[i]}
          range={axisVariableRanges[i]}
          onUpdate={updateAxisRange}
        />
      );
      axisRange.push(range);
    }
  }

  const compareSwitch = showCompare ? (
    <Form.Check
      type="switch"
      id="custom-switch"
      label={t("Compare Datasets")}
      checked={compareDatasets}
      onChange={() => {
        action("toggleCompare");
      }}
    />
  ) : null;
  let datasetSearchButton = null;
  if (datasetSearch) {
    datasetSearchButton = (
      <OverlayTrigger
        key="draw-search-btn"
        placement="top"
        overlay={<Tooltip id={"draw-tooltip"}>{t("Search Datasets")}</Tooltip>}
      >
        <Button
          className="go-button"
          variant="primary"
          size="sm"
          onClick={toggleSearchDatasets}
          title="Search Datasets"
        >
          <FontAwesomeIcon icon={faMagnifyingGlass} />
        </Button>
      </OverlayTrigger>
    );
  }

  return (
    <>
      <div
        id={`dataset-selector-${id}`}
        className={
          horizontalLayout ? "DatasetSelector-horizontal" : "DatasetSelector"
        }
      >
        {datasetSelector}
        {variableSelector}
        {quiverSelector}
        {depthSelector}

        {axisRange}
        {horizontalLayout ? null : timeSelector}
        {horizontalLayout ? goButton : null}
        {showCompare ? compareSwitch : null}
        {datasetSearchButton}
      </div>
      {horizontalLayout ? timeSelector : null}
      {horizontalLayout ? null : goButton}

      <Modal
        show={showDatasetSearch}
        size="xl"
        dialogClassName="full-screen-modal"
        onHide={toggleSearchDatasets}
      >
        <Modal.Header closeButton closeVariant="white">
          <Modal.Title>Search Datasets</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <DatasetSearchWindow
            datasets={availableDatasets}
            filters={datasetSearchFilters}
            updateFilters={updateSearchFilters}
            updateDataset={changeDataset}
            closeModal={toggleSearchDatasets}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={toggleSearchDatasets}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={loading} backdrop size="sm" dialogClassName="loading-modal">
        <Modal.Header>
          <Modal.Title>{`${t("Loading")} ${loadingTitle}`}</Modal.Title>
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
  showAxisRange: PropTypes.bool,
  showVariableSelector: PropTypes.bool,
  showDepthsAll: PropTypes.bool,
  mountedDataset: PropTypes.object,
  horizontalLayout: PropTypes.bool,
  showTimeSlider: PropTypes.bool,
  compareDatasets: PropTypes.bool,
  showSearchBtn: PropTypes.bool,
  showCompare: PropTypes.bool,
  action: PropTypes.func,
  t: PropTypes.func.isRequired,
};

export default withTranslation()(DatasetSelector);
