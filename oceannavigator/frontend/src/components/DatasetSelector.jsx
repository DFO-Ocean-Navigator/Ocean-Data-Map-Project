import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  GetAllVariablesPromise,
} from "../remote/OceanNavigator.js";

import { withTranslation } from "react-i18next";

import "rc-slider/assets/index.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

const MODEL_CLASSES_WITH_QUIVER = Object.freeze(["Mercator"]);

function useDatasetQuery(dataset) {
  const { data: datasets = [] } = useQuery({
    queryKey: ["datasets"],
    queryFn: GetDatasetsPromise,
  });

  const { data: variables = [], isLoading: variablesLoading } = useQuery({
    queryKey: ["dataset", "variables", dataset.id],
    queryFn: () => GetVariablesPromise(dataset.id),
  });

  const variableIds = variables.map((v) => {
    return v.id;
  });

  let queryVar = Array.isArray(dataset.variable)
    ? dataset.variable[0]
    : dataset.variable;

  const { data: timestamps = [], isLoading: timestampsLoading } = useQuery({
    queryKey: ["dataset", "timestamps", dataset.id, queryVar],
    queryFn: () => GetTimestampsPromise(dataset.id, queryVar),
    enabled: !!variableIds.includes(queryVar),
  });

  const { data: depths = [], isLoading: depthLoading } = useQuery({
    queryKey: ["dataset", "depths", dataset.id, queryVar],
    queryFn: () => GetDepthsPromise(dataset.id, queryVar),
    enabled: !!variableIds.includes(queryVar),
  });

  const isLoading = variablesLoading || timestampsLoading || depthLoading;

  return {
    datasets,
    variables,
    timestamps,
    depths,
    isLoading,
  };
}

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
  const [dataset, setDataset] = useState(mountedDataset);
  const [showDatasetSearch, setShowDatasetSearch] = useState(false);
  const [datasetSearchFilters, setDatasetSearchFilters] = useState(
    DATASET_FILTER_DEFAULTS
  );

  const datasetQuery = useDatasetQuery(dataset);

  useEffect(() => {
    // update timestamps on initial app load
    if (
      mountedDataset.time < 0 &&
      mountedDataset.starttime < 0 &&
      JSON.stringify(dataset) !== JSON.stringify(mountedDataset)
    ) {
      onUpdate("dataset", dataset);
    }
  }, [dataset]);

  useEffect(() => {
    // update dataset selectors in all components if dataset changed
    if (JSON.stringify(dataset) !== JSON.stringify(mountedDataset)) {
      setDataset(mountedDataset);
    }
  }, [mountedDataset]);

  const queryClient = useRef(useQueryClient());

  const updateDataset = (key, value) => {
    cleanQueryCache(["dataset", dataset.id]);

    let nextDataset = datasetQuery.datasets.filter((d) => {
      return d.id === value;
    })[0];

    setDataset((prevDataset) => ({
      ...prevDataset,
      attribution: nextDataset.attribution,
      default_location: nextDataset.default_location,
      id: nextDataset.id,
      depth: 0,
      model_class: nextDataset.model_class,
      quantum: nextDataset.quantum,
    }));
  };

  const updateVariable = (key, value) => {
    cleanQueryCache(["dataset", dataset.variable]);

    let nextVar;
    if (value instanceof HTMLCollection) {
      let variables = Array.from(value).map((o) => o.value);
      let variableRanges = {};
      variables.forEach((v) => {
        variableRanges[v] = null;
      });
      nextVar = {
        variable: variables,
        variable_range: variableRanges,
        variable_two_dimensional: false,
      };
      if (variables.length === 1) {
        const variable = datasetQuery.variables.find(
          (v) => v.id === variables[0]
        );
        nextVar = { ...nextVar, variable_scale: variable.scale };
      }
    } else {
      let variable = datasetQuery.variables.find((v) => {
        return v.id === value;
      });
      nextVar = {
        variable: variable.id,
        variable_scale: variable.scale,
        variable_range: { [value]: null },
        variable_two_dimensional: false,
      };
    }
    setDataset((prevDataset) => ({
      ...prevDataset,
      ...nextVar,
    }));
  };

  const updateTime = (key, value) => {
    //TODO: Check that start/endtime selectors work properly
    let nextTime = dataset.time;
    let nextStarttime = dataset.starttime;
    switch (key) {
      case "time":
        nextTime = value;
        if (value < nextStarttime || nextStarttime < 0) {
          let timeIdx = timestampIds.indexOf(value);
          nextStarttime =
            timeIdx > 20
              ? datasetQuery.timestamps[timeIdx - 20].id
              : datasetQuery.timestamps[0].id;
        }
        break;
      case "starttime":
        nextStarttime = value;
        break;
    }
    setDataset((prevDataset) => ({
      ...prevDataset,
      time: nextTime,
      starttime: nextStarttime,
    }));
  };

  const updateQuiver = (key, value) => {
    setDataset((prevDataset) => ({
      ...prevDataset,
      [key]: value,
    }));
  };

  const updateDepth = (key, value) => {
    value === "all" && setUpdateParent(false);
    setDataset((prevDataset) => ({
      ...prevDataset,
      [key]: value,
    }));
  };

  const handleGoButton = () => {
    onUpdate("dataset", dataset);
  };

  const cleanQueryCache = (keys) => {
    !Array.isArray(keys) && (keys = [keys]);
    queryClient.current.removeQueries({
      predicate: (query) => {
        const queryKey = query.queryKey;
        return keys.every((key) => queryKey.includes(key));
      },
    });
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

  const applySearchFilters = (datasetId, variableId, vectorVariable, date) => {
    updateDataset("id", datasetId);
    variableId && updateVariable("variable", variableId);
    vectorVariable && updateQuiver("quiverVariable", vectorVariable);
    if (date) {
      let dates = datasetQuery.timestamps.map((t) => new Date(t.value));
      let [, timeIdx] = dates.reduce(
        (prev, curr, idx) => {
          let diff = Math.abs(curr - date);
          return diff <= prev[0] ? [diff, idx] : prev;
        },
        [Infinity, 0]
      );
      let nextTime = datasetQuery.timestamps[timeIdx].id;
      updateTime("time", nextTime);
      setUpdateParent(true);
    }
  };

  const updateAxisRange = (key, value) => {
    let range = dataset.variable_range;
    range[value[0]] = value[1];
    setDataset({ ...dataset, variable_range: range });
  };

  const variableIds = datasetQuery.variables.map((v) => {
    return v.id;
  });

  const timestampIds = datasetQuery.timestamps.map((ts) => {
    return ts.id;
  });

  if (variableIds.length > 0) {
    if (!multipleVariables && Array.isArray(dataset.variable)) {
      updateVariable("variable", dataset.variable[0]);
    } else {
      let datasetHasVar = Array.isArray(dataset.variable)
        ? (datasetHasVar = dataset.variable.every((v) =>
            variableIds.includes(v)
          ))
        : variableIds.includes(dataset.variable);

      if (!datasetHasVar) {
        let nextVariable = datasetQuery.variables[0];
        updateVariable("variable", nextVariable.id);
      }
    }
  }

  if (
    dataset.quiverVariable !== "none" &&
    variableIds.length > 0 &&
    (!variableIds.includes(dataset.quiverVariable) ||
      !MODEL_CLASSES_WITH_QUIVER.includes(dataset.model_class))
  ) {
    updateQuiver("quiverVariable", "none");
  }

  if (
    datasetQuery.timestamps.length > 0 &&
    !timestampIds.includes(dataset.time)
  ) {
    let nextTime;
    if (dataset.time < 0) {
      // no timestamp previously selected, so select the latest one
      nextTime = datasetQuery.timestamps[datasetQuery.timestamps.length - 1].id;
    } else {
      // find nearest timestamp
      nextTime = timestampIds.reduce((previous, current) => {
        const previousDiff = Math.abs(previous - dataset.time);
        const currentDiff = Math.abs(current - dataset.time);
        return currentDiff <= previousDiff ? current : previous;
      });
    }
    updateTime("time", nextTime);
  }

  const loadingTitle = datasetQuery.datasets.filter((d) => {
    return d.id === dataset.id;
  })[0]?.value;

  let datasetSelector = null;
  if (datasetQuery.datasets && datasetQuery.datasets.length > 0) {
    datasetSelector = (
      <DatasetDropdown
        id={`dataset-selector-dataset-selector-${id}`}
        key={`dataset-selector-dataset-selector-${id}`}
        options={datasetQuery.datasets}
        label={t("Dataset")}
        placeholder={t("Dataset")}
        onChange={updateDataset}
        selected={dataset.id}
        horizontalLayout={horizontalLayout}
      />
    );
  }

  let variableSelector = null;
  if (
    showVariableSelector &&
    datasetQuery.variables &&
    datasetQuery.variables.length > 0
  ) {
    let variableOptions = [];
    if (variables === "3d") {
      variableOptions = datasetQuery.variables.filter((v) => {
        return v.two_dimensional === false;
      });
    } else {
      variableOptions = datasetQuery.variables;
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
        onChange={updateVariable}
        selected={selected}
        multiple={multipleVariables}
        loading={datasetQuery.isLoading}
        horizontalLayout={horizontalLayout}
      />
    );
  }

  let quiverSelector = null;
  if (showQuiverSelector) {
    let quiverVariables = [];
    if (
      datasetQuery.variables &&
      MODEL_CLASSES_WITH_QUIVER.includes(dataset.model_class)
    ) {
      quiverVariables = datasetQuery.variables.filter((variable) => {
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
          onChange={updateQuiver}
          selected={dataset.quiverVariable}
          loading={datasetQuery.isLoading}
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
          onChange={(x) => updateQuiver("quiverDensity", parseInt(x))}
        />
      </div>
    );
  }

  let depthSelector = null;
  if (
    showDepthSelector &&
    datasetQuery.depths &&
    datasetQuery.depths.length > 0 &&
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
            ? datasetQuery.depths
            : datasetQuery.depths.filter((d) => d.id !== "all")
        }
        onChange={updateDepth}
        selected={
          datasetQuery.depths.filter((d) => {
            let depth = parseInt(dataset.depth);
            if (isNaN(depth)) {
              // when depth == "bottom" or "all"
              depth = dataset.depth;
            }

            return d.id === depth;
          })[0].id
        }
        loading={datasetQuery.isLoading}
        horizontalLayout={horizontalLayout}
      />
    );
  }

  let timeSelector = null;
  if (datasetQuery.timestamps.length > 0) {
    if (showTimeSlider && !compareDatasets) {
      timeSelector = (
        <TimeSlider
          key="time"
          id="time"
          dataset={dataset}
          timestamps={datasetQuery.timestamps}
          selected={dataset.time}
          onChange={updateTime}
          loading={datasetQuery.isLoading}
        />
      );
    } else if (datasetQuery.timestamps && !datasetQuery.isLoading) {
      if (showTimeRange) {
        timeSelector = (
          <div>
            <TimePicker
              key="starttime"
              id="starttime"
              state={dataset.starttime}
              title={t("Start Time (UTC)")}
              onUpdate={updateTime}
              max={dataset.time}
              dataset={dataset}
              timestamps={datasetQuery.timestamps}
            />
            <TimePicker
              key="time"
              id="time"
              state={dataset.time}
              title={t("End Time (UTC)")}
              onUpdate={updateTime}
              min={dataset.starttime}
              dataset={dataset}
              timestamps={datasetQuery.timestamps}
            />
          </div>
        );
      } else {
        timeSelector = (
          <TimePicker
            key="time"
            id="time"
            state={dataset.time}
            onUpdate={updateTime}
            title={t("Time (UTC)")}
            dataset={dataset}
            timestamps={datasetQuery.timestamps}
            horizontalLayout={horizontalLayout}
          />
        );
      }
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
        disabled={datasetQuery.isLoading}
      >
        {t("Go")}
      </Button>
    </OverlayTrigger>
  );

  let axisRange = [];
  if (
    showAxisRange &&
    datasetQuery.variables &&
    datasetQuery.variables.length > 0 &&
    !datasetQuery.isLoading
  ) {
    let axisVariables = Array.isArray(dataset.variable)
      ? dataset.variable
      : [dataset.variable];
    let variableData = datasetQuery.variables.filter((v) =>
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
    queryClient.current.prefetchQuery({
      queryKey: ["datasetFilters", "allVariables"],
      queryFn: GetAllVariablesPromise,
    });

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

  console.log(dataset);

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
            datasets={datasetQuery.datasets}
            filters={datasetSearchFilters}
            updateFilters={updateSearchFilters}
            applyFilters={applySearchFilters}
            closeModal={toggleSearchDatasets}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={toggleSearchDatasets}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={datasetQuery.isLoading}
        backdrop
        size="sm"
        dialogClassName="loading-modal"
      >
        <Modal.Header>
          <Modal.Title>{`${t("Loading")} ${loadingTitle}`}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ProgressBar now={100} animated />
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
