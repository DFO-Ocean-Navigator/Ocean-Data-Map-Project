import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Slider from "rc-slider";
import { Modal, ProgressBar, Button, Form } from "react-bootstrap";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import { withTranslation } from "react-i18next";

import AxisRange from "./AxisRange.jsx";
import DatasetDropdown from "./DatasetDropdown.jsx";
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
import "rc-slider/assets/index.css";

const MODEL_CLASSES_WITH_QUIVER = Object.freeze(["Mercator"]);

function DatasetSelector({
  id,
  onUpdate,
  options: initialOptions,
  mountedDataset,
  mapSettings,
  compareDatasets,
  action,
  variables,
  multipleVariables = false,
  showQuiverSelector = true,
  showTimeSlider = false,
  showCompare = false,
  showTimeRange = false,
  showDepthSelector = true,
  showVariableRange = true,
  showAxisRange = false,
  showVariableSelector = true,
  showDepthsAll = false,
  horizontalLayout = false,
  __,
}) {
  const [loading, setLoading] = useState(true);
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [loadingTitle, setLoadingTitle] = useState("");
  const [datasetVariables, setDatasetVariables] = useState([]);
  const [datasetTimestamps, setDatasetTimestamps] = useState([]);
  const [datasetDepths, setDatasetDepths] = useState([]);
  const [options, setOptions] = useState(initialOptions);
  const [dataset, setDataset] = useState(mountedDataset);
  const [availableDatasets, setAvailableDatasets] = useState([]);
  const [updateParent, setUpdateParent] = useState(false);

  useEffect(() => {
    GetDatasetsPromise().then(({ data }) => setAvailableDatasets(data));
  }, []);

  useEffect(() => {
    if (availableDatasets.length) {
      changeDataset(mountedDataset.id, mountedDataset.variable, true);
    }
  }, [availableDatasets]);

  useEffect(() => {
    if (updateParent) {
      onUpdate("dataset", dataset);
      setUpdateParent(false);
    }
  }, [dataset, updateParent, onUpdate]);

  const changeDataset = (
    newDataset,
    currentVariable,
    updateParentOnSuccess = false
  ) => {
    const current = availableDatasets.find((d) => d.id === newDataset);
    setLoading(true);
    setLoadingPercent(10);
    setLoadingTitle(current.value);
    const { quantum, model_class } = current;

    GetVariablesPromise(newDataset).then(
      ({ data: vars }) => {
        setLoadingPercent(33);
        let newVariable = currentVariable;
        let newVariableScale = mountedDataset.variable_scale;
        let newQuiver = mountedDataset.quiverVariable;
        let newQuiverDensity = mountedDataset.quiverDensity;
        let variable_range = { [newVariable]: null };
        let { interpType, interpRadius, interpNeighbours } = mapSettings;
        const ids = vars.map((v) => v.id);

        if (!ids.includes(currentVariable)) {
          const firstVar = vars[0];
          newVariable = firstVar.id;
          newVariableScale = firstVar.scale;
          variable_range = { [newVariable]: null };
          interpType = firstVar.interp?.interpType || MAP_DEFAULTS.interpType;
          interpRadius =
            firstVar.interp?.interpRadius || MAP_DEFAULTS.interpRadius;
          interpNeighbours =
            firstVar.interp?.interpNeighbours || MAP_DEFAULTS.interpNeighbours;
        }

        GetTimestampsPromise(newDataset, newVariable).then(
          ({ data: times }) => {
            setLoadingPercent(66);
            let newTime = times[times.length - 1].id;
            let newStarttime =
              times.length > 20 ? times[times.length - 20].id : times[0].id;

            if (mountedDataset.id === newDataset) {
              newTime = mountedDataset.time > 0 ? mountedDataset.time : newTime;
              newStarttime =
                mountedDataset.starttime > 0
                  ? mountedDataset.starttime
                  : newStarttime;
            }

            GetDepthsPromise(newDataset, newVariable).then(
              ({ data: depths }) => {
                setLoadingPercent(90);
                setDataset({
                  id: newDataset,
                  model_class,
                  quantum,
                  time: newTime,
                  depth: 0,
                  starttime: newStarttime,
                  variable: newVariable,
                  variable_scale: newVariableScale,
                  variable_range,
                  quiverVariable: newQuiver,
                  quiverDensity: newQuiverDensity,
                  default_location: current.default_location,
                });
                setDatasetVariables(vars);
                setDatasetTimestamps(times);
                setDatasetDepths(depths);
                setOptions({ interpType, interpRadius, interpNeighbours });
                setLoading(false);
                setLoadingPercent(100);

                if (updateParentOnSuccess) setUpdateParent(true);
              },
              (err) => {
                console.error(err);
                setLoading(false);
                setLoadingPercent(0);
              }
            );
          },
          (err) => {
            console.error(err);
            setLoading(false);
            setLoadingPercent(0);
          }
        );
      },
      (err) => {
        console.error(err);
        setLoading(false);
        setLoadingPercent(0);
      }
    );
  };

  const changeVariable = (newVariable) => {
    if (!datasetDepths.length) {
      GetDepthsPromise(dataset.id, newVariable).then(({ data }) =>
        setDatasetDepths(data)
      );
    }
    let updated = {};
    // Multiple variables were selected
    // so don't update everything else
    if (newVariable instanceof HTMLCollection) {
      const list = Array.from(newVariable).map((o) => o.value);
      const ranges = {};
      list.forEach((v) => (ranges[v] = null));
      updated = {
        variable: list,
        variable_range: ranges,
        variable_two_dimensional: false,
      };
      if (list.length === 1) {
        const v = datasetVariables.find((d) => d.id === list[0]);
        updated.variable_scale = v.scale;
      }
    } else {
      const v = datasetVariables.find((d) => d.id === newVariable);
      updated = {
        variable: newVariable,
        variable_scale: v.scale,
        variable_range: { [newVariable]: null },
        variable_two_dimensional: v.two_dimensional,
        interpType: v.interp?.interpType || MAP_DEFAULTS.interpType,
        interpRadius: v.interp?.interpRadius || MAP_DEFAULTS.interpRadius,
        interpNeighbours:
          v.interp?.interpNeighbours || MAP_DEFAULTS.interpNeighbours,
      };
    }
    setDataset((prev) => ({ ...prev, ...updated }));
    setOptions((prev) => ({ ...prev, ...updated }));
  };

  const changeTime = (newTime) => {
    const updated = { ...dataset, time: newTime };
    if (dataset.starttime > newTime) {
      const idx = datasetTimestamps.findIndex((t) => t.id === newTime);
      updated.starttime =
        idx > 20 ? datasetTimestamps[idx - 20].id : datasetTimestamps[0].id;
    }
    setDataset(updated);
  };

  const updateDataset = (key, value) => {
    if (dataset[key] === value) return;
    if (key === "dataset") return changeDataset(value, dataset.variable);
    if (key === "variable") return changeVariable(value);
    if (key === "time") return changeTime(value);
    setDataset({ ...dataset, [key]: value });
  };

  const handleGoButton = () => onUpdate("dataset", dataset);

  const datasetSelector = availableDatasets.length ? (
    <DatasetDropdown
      id={`dataset-selector-${id}`}
      options={availableDatasets}
      label={__("Dataset")}
      placeholder={__("Dataset")}
      onChange={updateDataset}
      selected={dataset.id}
      horizontalLayout={horizontalLayout}
    />
  ) : null;

  const variableSelector =
    showVariableSelector && datasetVariables.length ? (
      <SelectBox
        id={`variable-selector-${id}`}
        name="variable"
        label={__("Variable")}
        placeholder={__("Variable")}
        options={
          variables === "3d"
            ? datasetVariables.filter((v) => !v.two_dimensional)
            : datasetVariables
        }
        selected={
          multipleVariables && !Array.isArray(dataset.variable)
            ? [dataset.variable]
            : dataset.variable
        }
        multiple={multipleVariables}
        onChange={updateDataset}
        loading={loading}
        horizontalLayout={horizontalLayout}
      />
    ) : null;

  const quiverSelectorComponent = showQuiverSelector ? (
    <div className="quiver-options">
      <SelectBox
        id={`quiver-selector-${id}`}
        name="quiverVariable"
        label={__("Quiver")}
        placeholder={__("Quiver Variable")}
        options={[
          { id: "none", value: "None" },
          ...datasetVariables.filter(
            (v) =>
              MODEL_CLASSES_WITH_QUIVER.includes(dataset.model_class) &&
              v.vector_variable
          ),
        ]}
        selected={dataset.quiverVariable}
        onChange={updateDataset}
        loading={loading}
        horizontalLayout={horizontalLayout}
      />
      <Form.Label>Quiver Density</Form.Label>
      <Slider
        range
        allowCross={false}
        min={-1}
        max={1}
        marks={{ "-1": "-", 0: "", 1: "+" }}
        defaultValue={dataset.quiverDensity}
        onChange={(x) => updateDataset("quiverDensity", parseInt(x))}
      />
    </div>
  ) : null;

  const depthSelector =
    showDepthSelector &&
    datasetDepths.length &&
    !dataset.variable_two_dimensional ? (
      <SelectBox
        id={`depth-selector-${id}`}
        name="depth"
        label={__("Depth")}
        placeholder={__("Depth")}
        options={
          showDepthsAll
            ? datasetDepths
            : datasetDepths.filter((d) => d.id !== "all")
        }
        onChange={updateDataset}
        selected={
          (
            datasetDepths.find(
              (d) => String(d.id) === String(dataset.depth)
            ) || { id: dataset.depth }
          ).id
        }
        loading={loading}
        horizontalLayout={horizontalLayout}
      />
    ) : null;

  const axisRanges =
    showAxisRange && !loading && datasetVariables.length
      ? (Array.isArray(dataset.variable)
          ? dataset.variable
          : [dataset.variable]
        ).map((v) => {
          const varData = datasetVariables.find((d) => d.id === v);
          return (
            <AxisRange
              key={`${v}_axisRange`}
              id={`${v}_axisRange`}
              title={`${varData.value} Range`}
              variable={v}
              range={varData.scale}
              onUpdate={(_, val) =>
                setDataset((prev) => ({
                  ...prev,
                  variable_range: { ...prev.variable_range, [v]: val },
                }))
              }
            />
          );
        })
      : null;

  const timeSelector =
    !compareDatasets && showTimeSlider ? (
      <TimeSlider
        id="time-slider"
        dataset={dataset}
        timestamps={datasetTimestamps}
        selected={dataset.time}
        onChange={updateDataset}
        loading={loading}
      />
    ) : !loading && datasetTimestamps.length ? (
      showTimeRange ? (
        <>
          <TimePicker
            id="starttime"
            state={dataset.starttime}
            title={__("Start Time (UTC")}
            onUpdate={updateDataset}
            max={dataset.time}
            dataset={dataset}
            timestamps={datasetTimestamps}
          />
          <TimePicker
            id="time"
            state={dataset.time}
            title={__("End Time (UTC")}
            onUpdate={updateDataset}
            min={dataset.starttime}
            dataset={dataset}
            timestamps={datasetTimestamps}
          />
        </>
      ) : (
        <TimePicker
          id="time"
          state={dataset.time}
          title={__("Time (UTC")}
          onUpdate={updateDataset}
          dataset={dataset}
          timestamps={datasetTimestamps}
          horizontalLayout={horizontalLayout}
        />
      )
    ) : null;

  const compareSwitch = showCompare ? (
    <Form.Check
      type="switch"
      id="compare-switch"
      label={__("Compare Datasets")}
      checked={compareDatasets}
      onChange={() => action("toggleCompare")}
    />
  ) : null;

  const goButton = (
    <OverlayTrigger
      placement={horizontalLayout ? "top" : "bottom"}
      overlay={<Tooltip id="go-tooltip">{__("Apply Changes")}</Tooltip>}
    >
      <Button
        className="go-button"
        variant="primary"
        onClick={handleGoButton}
        disabled={loading}
      >
        {__("Go")}
      </Button>
    </OverlayTrigger>
  );

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
        {quiverSelectorComponent}
        {depthSelector}
        {axisRanges}
        {horizontalLayout ? null : timeSelector}
        {horizontalLayout ? goButton : null}
        {compareSwitch}
      </div>
      {horizontalLayout && timeSelector}
      {!horizontalLayout && goButton}

      <Modal show={loading} backdrop size="sm" dialogClassName="loading-modal">
        <Modal.Header>
          <Modal.Title>{`${__("Loading")} ${loadingTitle}`}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ProgressBar now={loadingPercent} />
        </Modal.Body>
      </Modal>
    </>
  );
}

DatasetSelector.propTypes = {
  id: PropTypes.string.isRequired,
  onUpdate: PropTypes.func.isRequired,
  options: PropTypes.object,
  mountedDataset: PropTypes.object.isRequired,
  mapSettings: PropTypes.object.isRequired,
  compareDatasets: PropTypes.bool,
  action: PropTypes.func,
  variables: PropTypes.string,
  multipleVariables: PropTypes.bool,
  showQuiverSelector: PropTypes.bool,
  showTimeSlider: PropTypes.bool,
  showCompare: PropTypes.bool,
  showTimeRange: PropTypes.bool,
  showDepthSelector: PropTypes.bool,
  showVariableRange: PropTypes.bool,
  showAxisRange: PropTypes.bool,
  showVariableSelector: PropTypes.bool,
  showDepthsAll: PropTypes.bool,
  horizontalLayout: PropTypes.bool,
  __: PropTypes.func.isRequired,
};

DatasetSelector.defaultProps = {
  options: {},
  compareDatasets: false,
  action: () => {},
  variables: null,
  multipleVariables: false,
  showQuiverSelector: true,
  showTimeSlider: false,
  showCompare: false,
  showTimeRange: false,
  showDepthSelector: true,
  showVariableRange: true,
  showAxisRange: false,
  showVariableSelector: true,
  showDepthsAll: false,
  horizontalLayout: false,
};

export default withTranslation()(DatasetSelector);
