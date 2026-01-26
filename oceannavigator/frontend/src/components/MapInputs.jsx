import React from "react";
import Button from "react-bootstrap/Button";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEyeSlash } from "@fortawesome/free-solid-svg-icons";

import DatasetPanel from "./DatasetPanel.jsx";
import DrawingTools from "./DrawingTools.jsx";
import ObservationTools from "./ObservationTools.jsx";

import { withTranslation } from "react-i18next";

function MapInputs(props) {
  const drawingTools = props.uiSettings.showDrawingTools ? (
    <DrawingTools
      uiSettings={props.uiSettings}
      updateUI={props.updateUI}
      action={props.action}
      featureType={props.featureType}
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
        className="hide-data-button"
        onClick={() => {
          props.updateMapSettings(
            "hideDataLayer",
            !props.mapSettings.hideDataLayer
          );
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
          <DatasetPanel
            key="map-inputs-dataset0-panel"
            id="map-inputs-dataset0-panel"
            mountedDataset={props.dataset0}
            onUpdate={props.updateDataset0}
            mapSettings={props.mapSettings}
            action={props.action}
            horizontalLayout={true}
            showTimeSlider={!props.compareDatasets}
            showCompare={props.showCompare}
            compareDatasets={props.compareDatasets}
            datasetSearch={true}
          />
          {props.showCompare ? hideDataSwitch : null}
        </div>
        {props.compareDatasets ? (
          <div className={"map-inputs"}>
            <DatasetPanel
              key="map-inputs-dataset1-panel"
              id="map-inputs-dataset1-panel"
              mountedDataset={props.dataset1}
              onUpdate={props.updateDataset1}
              mapSettings={props.mapSettings}
              action={props.action}
              horizontalLayout={true}
              showTimeSlider={!props.compareDatasets}
              showSearchBtn={true}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default withTranslation()(MapInputs);
