import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { Modal, ProgressBar, Button, Form } from "react-bootstrap";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

import DatasetDropdown from "./DatasetDropdown.jsx";
import DatasetSearchWindow from "../DatasetSearchWindow.jsx";
import { DATASET_FILTER_DEFAULTS } from "../Defaults.js";
import { useGetDatasets, prefetchAllVariables } from "../../remote/queries.js";

import { withTranslation } from "react-i18next";

import "rc-slider/assets/index.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

import VariableSelector from "./VariableSelector.jsx";
import TimeSelector from "./TimeSelector.jsx";
import DepthSelector from "./DepthSelector.jsx";
import QuiverSelector from "./QuiverSelector.jsx";

function DatasetSelector({
  onUpdate,
  id,
  hasDepth,
  multipleVariables = false,
  showQuiverSelector = true,
  showTimeRange = false,
  showDepthSelector = true,
  showAxisRange = false,
  showVariableSelector = true,
  showAllDepths = false,
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
  const [loading, setLoading] = useState([]);
  const [showDatasetSearch, setShowDatasetSearch] = useState(false);
  const [datasetSearchFilters, setDatasetSearchFilters] = useState(
    DATASET_FILTER_DEFAULTS
  );

  useEffect(() => {
    // update timestamps on initial app load
    if (
      mountedDataset.time.id < 0 &&
      mountedDataset.starttime.id < 0 &&
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

  const updateDataset = (key, value) => {
    switch (key) {
      case "dataset":
        setDataset((prevDataset) => ({
          ...prevDataset,
          attribution: value.attribution,
          default_location: value.default_location,
          id: value.id,
          depth: 0,
          model_class: value.model_class,
          quantum: value.quantum,
          value: value.value,
        }));
        break;

      default:
        setDataset((prevDataset) => ({
          ...prevDataset,
          [key]: value,
        }));
        break;
    }
  };

  const updateQueryState = (key, isLoading, isError) => {
    if (!isLoading) {
      setLoading((prevLoading) => prevLoading.filter((k) => k !== key));
    } else if (isLoading) {
      setLoading([...loading, key]);
    }
    if (isError) {
      // reset dataset
    }
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

  const applySearchFilters = (datasetId, variableId, vectorVariable, date) => {
    updateDataset("id", datasetId);
    variableId && updateVariable("variable", variableId);
    vectorVariable && updateQuiver("quiverVariable", vectorVariable);
    // if (date) {
    //   let dates = datasetParams.timestamps.map((t) => new Date(t.value));
    //   let [, timeIdx] = dates.reduce(
    //     (prev, curr, idx) => {
    //       let diff = Math.abs(curr - date);
    //       return diff <= prev[0] ? [diff, idx] : prev;
    //     },
    //     [Infinity, 0]
    //   );
    //   let nextTime = datasetParams.timestamps[timeIdx].id;
    //   updateTime("time", nextTime);
    //   setUpdateParent(true);
    // }
  };

  const loadingTitle = dataset.value;

  let datasetSelector = (
    <DatasetDropdown
      id={`dataset-selector-dataset-selector-${id}`}
      key={`dataset-selector-dataset-selector-${id}`}
      updateDataset={updateDataset}
      updateQueryState={updateQueryState}
      selected={dataset.id}
      horizontalLayout={horizontalLayout}
    />
  );

  let variableSelector = showVariableSelector ? (
    <VariableSelector
      id={`${id}-variable-selector`}
      dataset={dataset}
      updateDataset={updateDataset}
      updateQueryState={updateQueryState}
      hasDepth={hasDepth}
      multipleVariables={multipleVariables}
      showAxisRange={showAxisRange}
      horizontalLayout={horizontalLayout}
    />
  ) : null;

  let quiverSelector = showQuiverSelector ? (
    <QuiverSelector
      id={`${id}-quiver-selector`}
      dataset={dataset}
      updateDataset={updateDataset}
      updateQueryState={updateQueryState}
      horizontalLayout
      enabled
    />
  ) : null;

  let depthSelector =
    showDepthSelector && !dataset.variable_two_dimensional ? (
      <DepthSelector
        id={`${id}-depth-selector`}
        dataset={dataset}
        updateDataset={updateDataset}
        updateQueryState={updateQueryState}
        showAllDepths={showAllDepths}
        horizontalLayout={horizontalLayout}
        enabled={!loading.includes("variables")}
      />
    ) : null;

  let timeSelectorType;
  if (showTimeSlider && !compareDatasets) {
    timeSelectorType = "slider";
  } else if (showTimeRange) {
    timeSelectorType = "range";
  }
  const timeSelector = (
    <TimeSelector
      id={`${id}-time-selector`}
      dataset={dataset}
      updateDataset={updateDataset}
      updateQueryState={updateQueryState}
      selectorType={timeSelectorType}
      horizontalLayout={horizontalLayout}
      enabled={!loading.includes("variables")}
    />
  );

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
        disabled={loading.length > 0}
      >
        {t("Go")}
      </Button>
    </OverlayTrigger>
  );

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
    prefetchAllVariables();

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
          {/* <DatasetSearchWindow
            datasets={datasets.data}
            filters={datasetSearchFilters}
            updateFilters={updateSearchFilters}
            applyFilters={applySearchFilters}
            closeModal={toggleSearchDatasets}
          /> */}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={toggleSearchDatasets}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={loading.length > 0}
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
  showAllDepths: PropTypes.bool,
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
