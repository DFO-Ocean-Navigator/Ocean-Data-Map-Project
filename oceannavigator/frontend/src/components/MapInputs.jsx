import React from "react";

import DatasetSelector from "./DatasetSelector.jsx";
import DrawingTools from "./DrawingTools.jsx";
import ObservationTools from "./ObservationTools.jsx";

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


  return (
    <div className="map-inputs-container">
      {drawingTools}
      {observationTools}
      <div className="dataset-selector-container">
        <div className={"map-inputs"}>
          <DatasetSelector
            key="map_inputs_dataset_0"
            id="dataset_0"
            onUpdate={props.updateDataset0}
            mapSettings={props.mapSettings}
            action={props.action}
            horizontalLayout={true}
            showTimeSlider={!props.compareDatasets}
            showCompare={props.showCompare}
            compareDatasets={props.compareDatasets}
          />
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

MapInputs.propTypes = {
  updateDataset1: PropTypes.func,
  updateDataset0: PropTypes.func,
  action: PropTypes.func,
  showCompare: PropTypes.bool,
  mapSettings: PropTypes.object,

  uiSettings: PropTypes.shape({
    showModal: PropTypes.bool,
    modalType: PropTypes.string,
    showDrawingTools: PropTypes.bool,
    showObservationTools: PropTypes.bool,
  }).isRequired,
  updateUI: PropTypes.func,
  compareDatasets: PropTypes.bool,
  vectorType: PropTypes.string.isRequired,
  vectorCoordinates: PropTypes.array.isRequired,
};

// dataset0={dataset0}
// dataset1={dataset1}

export default MapInputs;
