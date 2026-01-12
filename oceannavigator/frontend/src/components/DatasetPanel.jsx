import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { Modal, ProgressBar, Button, Form } from "react-bootstrap";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import { withTranslation } from "react-i18next";
import "rc-slider/assets/index.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

import DatasetSelector from "./data-selectors/DatasetSelector.jsx";
import VariableSelector from "./data-selectors/VariableSelector.jsx";
import TimeSelector from "./data-selectors/TimeSelector.jsx";
import DepthSelector from "./data-selectors/DepthSelector.jsx";
import QuiverSelector from "./data-selectors/QuiverSelector.jsx";
import DatasetSearchWindow from "./DatasetSearchWindow.jsx";
import { DATASET_FILTER_DEFAULTS } from "./Defaults.js";
import { prefetchAllVariables } from "../remote/queries.js";

function DatasetPanel({
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
  disableTimeSelector = false,
  mountedDataset,
  showTimeSlider,
  compareDatasets,
  showCompare,
  action,
  t,
}) {
  const [dataset, setDataset] = useState(mountedDataset);
  const [loading, setLoading] = useState(true);
  const [updateParent, setUpdateParent] = useState(false);
  const [queryStatus, setQueryStatus] = useState(() =>
    showVariableSelector ? { variables: "pending" } : {}
  );
  const [showDatasetSearch, setShowDatasetSearch] = useState(false);
  const [datasetSearchFilters, setDatasetSearchFilters] = useState(
    DATASET_FILTER_DEFAULTS
  );

  const datasetRef = useRef(dataset);

  useEffect(() => {
    // update timestamps on initial app load
    if (
      updateParent &&
      JSON.stringify(dataset) !== JSON.stringify(mountedDataset)
    ) {
      onUpdate("dataset", dataset);
      setUpdateParent(false);
    }
  }, [updateParent]);

  useEffect(() => {
    // update dataset selectors in all components if dataset changed
    if (JSON.stringify(dataset) !== JSON.stringify(mountedDataset)) {
      setDataset(mountedDataset);
    }
  }, [mountedDataset]);

  useEffect(() => {
    let isLoading = Object.values(queryStatus).some((s) => s === "pending");
    let isError = Object.values(queryStatus).some((s) => s === "error");
    let isSuccess = Object.values(queryStatus).every((s) => s === "success");
    setLoading(isLoading);
    if (isSuccess) {
      // save dataset configuration in case of query failure
      datasetRef.current = dataset;
    }
    if (isError) {
      // revert to dataset last sucessful  querried
      setDataset(datasetRef.current);
    }
  }, [queryStatus]);

  const updateDataset = (key, value, shouldUpdateParent = false) => {
    switch (key) {
      case "dataset":
        setQueryStatus(showVariableSelector ? { variables: "pending" } : {});
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
    setUpdateParent(shouldUpdateParent);
  };

  const updateQueryStatus = (key, status) => {
    setQueryStatus((prev) => ({ ...prev, [key]: status }));
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

  const applySearchFilters = (filteredDataset) => {
    setDataset({ ...dataset, ...filteredDataset });
  };

  let variableSelector = showVariableSelector ? (
    <VariableSelector
      id={`${id}-variable-selector`}
      dataset={dataset}
      updateDataset={updateDataset}
      updateQueryStatus={updateQueryStatus}
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
      horizontalLayout
      enabled
    />
  ) : null;

  let depthSelector =
    showDepthSelector && !dataset.variable.two_dimensional ? (
      <DepthSelector
        id={`${id}-depth-selector`}
        dataset={dataset}
        updateDataset={updateDataset}
        updateQueryStatus={updateQueryStatus}
        showAllDepths={showAllDepths}
        horizontalLayout={horizontalLayout}
        enabled={queryStatus.variables !== "pending"}
      />
    ) : null;

  let timeSelectorType;
  if (showTimeSlider && !compareDatasets) {
    timeSelectorType = "slider";
  } else if (showTimeRange) {
    timeSelectorType = "range";
  }
  const timeSelector = !disableTimeSelector && (
    <TimeSelector
      id={`${id}-time-selector`}
      dataset={dataset}
      updateDataset={updateDataset}
      updateQueryStatus={updateQueryStatus}
      selectorType={timeSelectorType}
      horizontalLayout={horizontalLayout}
      enabled={queryStatus.variables !== "pending"}
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
        disabled={loading}
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

  let datasetSearchButton, datasetSearchModal;
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

    datasetSearchModal = (
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
    );
  }

  return (
    <>
      <div
        id={`dataset-selector-${id}`}
        className={
          horizontalLayout ? "DatasetPanel-horizontal" : "DatasetPanel"
        }
      >
        <DatasetSelector
          id={`${id}-dataset-selector`}
          key={`${id}-dataset-selector`}
          updateDataset={updateDataset}
          selected={dataset.id}
          horizontalLayout={horizontalLayout}
        />
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

      {datasetSearchModal}

      <Modal show={loading} backdrop size="sm" dialogClassName="loading-modal">
        <Modal.Header>
          <Modal.Title>{`${t("Loading")} ${dataset.value}`}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ProgressBar now={100} animated />
        </Modal.Body>
      </Modal>
    </>
  );
}

//***********************************************************************
DatasetPanel.propTypes = {
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
  disableTimeSelector: PropTypes.bool,
  compareDatasets: PropTypes.bool,
  showSearchBtn: PropTypes.bool,
  showCompare: PropTypes.bool,
  action: PropTypes.func,
  t: PropTypes.func.isRequired,
};

export default withTranslation()(DatasetPanel);
