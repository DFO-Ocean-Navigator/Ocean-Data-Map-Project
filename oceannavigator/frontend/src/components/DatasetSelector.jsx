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
  const [dataset, setDataset] = useState(mountedDataset);
  const [showDatasetSearch, setShowDatasetSearch] = useState(false);
  const [datasetSearchFilters, setDatasetSearchFilters] = useState(
    DATASET_FILTER_DEFAULTS
  );

  useEffect(() => {
    // Update dataset on intial app load
    if (dataset.time > 0 && mountedDataset.time < 0) {
      onUpdate("dataset", dataset);
    }
  }, [dataset]);

  const queryClient = useRef(useQueryClient());

  const { data: availableDatasets = [] } = useQuery({
    queryKey: ["datasets"],
    queryFn: GetDatasetsPromise,
  });

  const { data: datasetVariables = [], isLoading: variablesLoading } = useQuery(
    {
      queryKey: ["dataset", "variables", dataset.id],
      queryFn: () => GetVariablesPromise(dataset.id),
    }
  );

  const variableIds = datasetVariables.map((v) => {
    return v.id;
  });

  const { data: datasetTimestamps = [], isLoading: timestampsLoading } =
    useQuery({
      queryKey: ["dataset", "timestamps", dataset.id, dataset.variable],
      queryFn: () => GetTimestampsPromise(dataset.id, dataset.variable),
      enabled: !!variableIds.includes(dataset.variable),
    });

  const timestampIds = datasetTimestamps.map((ts) => {
    return ts.id;
  });

  const { data: datasetDepths = [], isLoading: depthLoading } = useQuery({
    queryKey: ["dataset", "depths", dataset.id, dataset.variable],
    queryFn: () => GetDepthsPromise(dataset.id, dataset.variable),
    enabled: !!variableIds.includes(dataset.variable),
  });

  const changeDataset = (key, value) => {
    cleanQueryCache(["dataset", dataset.id]);

    let nextDataset = availableDatasets.filter((d) => {
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

    let nextVariable = datasetVariables.filter((v) => {
      return v.id === value;
    })[0];
    let variable_scale = nextVariable.scale;
    let variable_range = {
      [value]: null,
    };

    setDataset((prevDataset) => ({
      ...prevDataset,
      variable: value,
      variable_scale,
      variable_range,
    }));
  };

  const updateTime = (key, value) => {
    let nextTime = dataset.time;
    let nextStarttime = dataset.starttime;
    switch (key) {
      case "time":
        nextTime = value;
        if (value < nextStarttime || nextStarttime < 0) {
          let timeIdx = timestampIds.indexOf(value);
          nextStarttime =
            timeIdx > 20
              ? datasetTimestamps[timeIdx - 20].id
              : datasetTimestamps[0].id;
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

  const toggleSearchDatasets = () => {};

  const updateSearchFilters = (key, value) => {};

  const updateDataset = (key, value) => {};

  if (variableIds.length > 0 && !variableIds.includes(dataset.variable)) {
    let nextVariable = datasetVariables[0];
    updateVariable("variable", nextVariable.id);
  }

  if (datasetTimestamps.length > 0 && !timestampIds.includes(dataset.time)) {
    let nextTime;
    if (dataset.time < 0) {
      // no timestamp previously selected, so select the latest one
      nextTime = datasetTimestamps[datasetTimestamps.length - 1].id;
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

  const loading = variablesLoading || timestampsLoading || depthLoading;
  const loadingPercent =
    (100 * (3 - variablesLoading - timestampsLoading - depthLoading)) / 3;
  const loadingTitle = availableDatasets.filter((d) => {
    return d.id === dataset.id;
  })[0]?.value;

  let datasetSelector = null;
  if (availableDatasets && availableDatasets.length > 0) {
    datasetSelector = (
      <DatasetDropdown
        id={`dataset-selector-dataset-selector-${id}`}
        key={`dataset-selector-dataset-selector-${id}`}
        options={availableDatasets}
        label={t("Dataset")}
        placeholder={t("Dataset")}
        onChange={changeDataset}
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
        onChange={updateVariable}
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
          onChange={updateQuiver}
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
          onChange={(x) => updateQuiver("quiverDensity", parseInt(x))}
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
        onChange={updateDepth}
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
  if (datasetTimestamps) {
    if (showTimeSlider && !compareDatasets) {
      timeSelector = (
        <TimeSlider
          key="time"
          id="time"
          dataset={dataset}
          timestamps={datasetTimestamps}
          selected={dataset.time}
          onChange={updateTime}
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
              onUpdate={updateTime}
              max={dataset.time}
              dataset={dataset}
              timestamps={datasetTimestamps}
            />
            <TimePicker
              key="time"
              id="time"
              state={dataset.time}
              title={t("End Time (UTC)")}
              onUpdate={updateTime}
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
            onUpdate={updateTime}
            title={t("Time (UTC)")}
            dataset={dataset}
            timestamps={datasetTimestamps}
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
        disabled={loading}
      >
        {t("Go")}
      </Button>
    </OverlayTrigger>
  );

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

        {/* {axisRange}
        {horizontalLayout ? null : timeSelector}
         */}
        {horizontalLayout ? goButton : null}
        {/* {showCompare ? compareSwitch : null}
        {datasetSearchButton} */}
      </div>
      {horizontalLayout ? timeSelector : null}
      {horizontalLayout ? null : goButton}

      {/* <Modal
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
      </Modal> */}

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
