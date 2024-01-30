import React from "react";
import Button from "react-bootstrap/Button";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEyeSlash } from "@fortawesome/free-solid-svg-icons";

import DatasetSelector from "./DatasetSelector.jsx";
import DrawingTools from "./DrawingTools.jsx";
import ObservationTools from "./ObservationTools.jsx";

import { withTranslation } from "react-i18next";

function MapInputs(props) {

  const drawingTools = props.uiSettings.showDrawingTools ? (
    <DrawingTools
      uiSettings={props.uiSettings}
      updateUI={props.updateUI}
      action={props.action}
      vectorType={props.vectorType}
      vectorCoordinates={props.vectorCoordinates}
    />
  ) : null;

  const observationTools = props.uiSettings.showObservationTools ? (
    <ObservationTools
      action={props.action}
      uiSettings={props.uiSettings}
      updateUI={props.updateUI}
    />
  ) : null;

  const hideDataSwitch = props.showCompare ? (
    <OverlayTrigger
      placement="top"
      overlay={<Tooltip id="tooltip">{__("Hide Data Layer")}</Tooltip>}
    >
      <Button
        className={`hide-data-button ${props.compareDatasets ? "hide-data-button-compare" : ""}`}
        onClick={() => {
          props.updateMapSettings("hideDataLayer", !props.mapSettings.hideDataLayer)
        }}
      >
        <FontAwesomeIcon icon={faEyeSlash} size="2xs" />
      </Button>
    </OverlayTrigger>
  ) : null;

  return (
    <div className="map-inputs-container">
      {drawingTools}
      {observationTools}
      <div className="dataset-selector-container">
        <div className={"map-inputs"}>
          <DatasetSelector
            key="map_inputs_dataset_0"
            id="dataset_0"
            mountedDataset={props.dataset0}
            onUpdate={props.updateDataset0}
            mapSettings={props.mapSettings}
            action={props.action}
            horizontalLayout={true}
            showTimeSlider={!props.compareDatasets}
            showCompare={props.showCompare}
            compareDatasets={props.compareDatasets}
          />
          {props.showCompare ? hideDataSwitch : null}
        </div>
        {props.compareDatasets ? (
          <div
            className={"map-inputs"}
          >
            <DatasetSelector
              key="map_inputs_dataset_1"
              id="dataset_1"
              onUpdate={props.updateDataset1}
              mapSettings={props.mapSettings}
              action={props.action}
              horizontalLayout={true}
              showTimeSlider={!props.compareDatasets}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default withTranslation()(MapInputs);
