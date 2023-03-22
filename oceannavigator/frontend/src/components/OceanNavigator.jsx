import { nominalTypeHack } from "prop-types";
import React, { useState, useRef, useEffect } from "react";
import { Button } from "react-bootstrap";
import Modal from "react-bootstrap/Modal";

import { DATASET_DEFAULTS, MAP_DEFAULTS } from "./Defaults.js";
import DrawingTools from "./DrawingTools.jsx";
import GlobalMap from "./GlobalMap.jsx";
import MapInputs from "./MapInputs.jsx";
import MapTools from "./MapTools.jsx";
import ScaleViewer from "./ScaleViewer.jsx";
import PresetFeaturesWindow from "./PresetFeaturesWindow.jsx";
import EnterCoordsWindow from "./EnterCoordsWindow.jsx";
import PointWindow from "./PointWindow.jsx";
import LineWindow from "./LineWindow.jsx";
import AreaWindow from "./AreaWindow.jsx";
import ObservationSelector from "./ObservationSelector.jsx";

import {
  GetPresetPointsPromise,
  GetPresetLinesPromise,
  GetPresetAreasPromise,
} from "../remote/OceanNavigator.js";

function formatLatLon(latitude, longitude) {
  latitude = latitude > 90 ? 90 : latitude;
  latitude = latitude < -90 ? -90 : latitude;
  longitude = longitude > 180 ? longitude - 360 : longitude;
  longitude = longitude < -180 ? 360 + longitude : longitude;
  let formatted = "";
  formatted += Math.abs(latitude).toFixed(4) + " ";
  formatted += latitude >= 0 ? "N" : "S";
  formatted += ", ";
  formatted += Math.abs(longitude).toFixed(4) + " ";
  formatted += longitude >= 0 ? "E" : "W";
  return formatted;
}

function OceanNavigator() {
  const mapRef0 = useRef(null);
  const [dataset0, setDataset0] = useState(DATASET_DEFAULTS);
  const [dataset1, setDataset1] = useState(DATASET_DEFAULTS);
  const [mapSettings, setMapSettings] = useState({
    plotEnabled: false, // "Plot" button in MapToolbar
    projection: "EPSG:3857", // Map projection
    basemap: "topo",
    extent: [],
    ...MAP_DEFAULTS,
  });
  const [uiSettings, setUiSettings] = useState({
    showModal: false,
    modalType: "",
    showDrawingTools: false,
    busy: false, // Controls if the busyModal is visible
    showHelp: false,
    showCompareHelp: false,
    syncRanges: false, // Clones the variable range from one view to the other when enabled
    showObservationSelect: false,
    observationArea: [],
  });
  const [vectorId, setVectorId] = useState(null);
  const [vectorType, setVectorType] = useState("point");
  const [vectorCoordinates, setVectorCoordinates] = useState([]);
  const [selectedCoordinates, setSelectedCoordinates] = useState([]);
  const [names, setNames] = useState([]);
  const [observationSelection] = useState({});
  const [observationArea] = useState([]);
  const [pointFiles, setPointFiles] = useState([]);
  const [lineFiles, setLineFiles] = useState([]);
  const [areaFiles, setAreaFiles] = useState([]);

  useEffect(() => {
    GetPresetPointsPromise().then(
      (result) => {
        setPointFiles(result.data);
      },
      (error) => {
        console.error(error);
      }
    );

    GetPresetLinesPromise().then(
      (result) => {
        setLineFiles(result.data);
      },
      (error) => {
        console.error(error);
      }
    );

    GetPresetAreasPromise().then(
      (result) => {
        setAreaFiles(result.data);
      },
      (error) => {
        console.error(error);
      }
    );
  }, []);

  const action = (name, arg, arg2, arg3) => {
    switch (name) {
      case "startDrawing":
        mapRef0.current.startDrawing();
        break;
      case "stopDrawing":
        mapRef0.current.stopDrawing();
        break;
      case "vectorType":
        setVectorType(arg);
        break;
      case "undoPoints":
        setVectorCoordinates(
          vectorCoordinates.slice(0, vectorCoordinates.length - 1)
        );
        break;
      case "clearPoints":
        setVectorCoordinates([]);
        break;
      case "addPoints":
        setVectorCoordinates((prevCoordinates) => [...prevCoordinates, ...arg]);
        break;
      case "removePoint":
        let coords = vectorCoordinates.filter((coord, index) => index !== arg);
        setVectorCoordinates(coords);
        break;
      case "updatePoint":
        const newCoords = [...vectorCoordinates];
        newCoords[arg][arg2] = arg3;
        setVectorCoordinates(newCoords);
        break;
      case "selectPoints":
        if (!arg) {
          setSelectedCoordinates(vectorCoordinates);
        } else {
          setSelectedCoordinates(arg);
        }
        break;

      case "show":
        closeModal();
        mapRef0.current.show(arg, arg2);
        // if (this.mapComponent2) {
        //   this.mapComponent2.show(arg, arg2);
        // }
        // if (arg === 'class4') {
        //   this.setState({class4type : arg3})
        // }
        break;
    }
  };

  const updateState = (key, value) => {
    for (let i = 0; i < key.length; ++i) {
      switch (key[i]) {
        case "vectorId":
          setVectorId(value[i]);
          break;
        case "vectorType":
          setVectorType(value[i]);
          break;
        case "names":
          setNames(value[i]);
      }
    }
  };

  const updateDataset0 = (key, value) => {
    switch (key) {
      case "dataset":
        setDataset0(value);
        break;
      default:
        setDataset0({ ...dataset0, [key]: value });
    }
  };

  const updateUI = (key, value) => {
    let newUISettings = {
      ...uiSettings,
      [key]: value,
    };
    setUiSettings(newUISettings);
  };

  const closeModal = () => [
    setUiSettings({
      ...uiSettings,
      showModal: false,
      modalType: "",
    }),
  ];

  const updateMap = (key, value) => {
    let newMapSettings = {
      ...mapSettings,
      [key]: value,
    };
    setMapSettings(newMapSettings);
  };

  function obsSelect() {
    return;
  }

  const drawingTools = uiSettings.showDrawingTools ? (
    <DrawingTools
      uiSettings={uiSettings}
      updateUI={updateUI}
      action={action}
      vectorType={vectorType}
    />
  ) : null;

  const mapComponent0 = (
    <GlobalMap
      ref={mapRef0}
      mapSettings={mapSettings}
      dataset={dataset0}
      vectorId={vectorId}
      vectorType={vectorType}
      vectorCoordinates={vectorCoordinates}
      updateState={updateState}
      action={action}
      updateMapSettings={updateMap}
      updateUI={updateUI}
    />
  );

  let modalContent = null;
  let modalTitle = "";
  switch (uiSettings.modalType) {
    case "point":
      modalContent = (
        <PointWindow
          dataset_0={dataset0}
          point={selectedCoordinates}
          mapSettings={mapSettings}
          names={names}
          // onUpdate={this.updateState}
          // onUpdateOptions={this.updateOptions}
          // init={this.state.subquery}
          // dataset_compare={this.state.dataset_compare}
          // dataset_1={this.state.dataset_1}
          action={action}
          // showHelp={this.toggleCompareHelp}
          // swapViews={this.swapViews}
          // options={this.state.options}
        />
      );
      modalTitle = selectedCoordinates.map((p) => formatLatLon(p[0], p[1]));
      modalTitle = modalTitle.join(", ");
      break;
    case "line":
      modalContent = (
        <LineWindow
          dataset_0={dataset0}
          dataset_1={dataset1}
          line={selectedCoordinates}
          mapSettings={mapSettings}
          // colormap={this.state.colormap}
          names={names}
          onUpdate={updateDataset0}
          // onUpdateOptions={this.updateOptions}
          // init={this.state.subquery}
          // dataset_compare={this.state.dataset_compare}
          action={action}
          // showHelp={this.toggleCompareHelp}
          // swapViews={this.swapViews}
          // options={this.state.options}
        />
      );

      modalTitle =
        "(" +
        selectedCoordinates
          .map(function (ll) {
            return formatLatLon(ll[0], ll[1]);
          })
          .join("), (") +
        ")";
      break;
    case "area":
      modalContent = (
        <AreaWindow
          dataset_0={dataset0}
          dataset_1={dataset1}
          area={selectedCoordinates}
          mapSettings={mapSettings}
          // colormap={this.state.colormap}
          names={names}
          onUpdate={updateDataset0}
          // onUpdateOptions={this.updateOptions}
          // init={this.state.subquery}
          // dataset_compare={this.state.dataset_compare}
          // showHelp={this.toggleCompareHelp}
          action={action}
          // swapViews={this.swapViews}
          // options={this.state.options}
        />
      );

      modalTitle = "";
      break;
    case "presetFeatures":
      modalContent = (
        <PresetFeaturesWindow
          points={pointFiles}
          lines={lineFiles}
          areas={areaFiles}
          action={action}
        />
      );
      modalTitle = "Preset Features";
      break;
    case "enterCoords":
      modalContent = (
        <EnterCoordsWindow
          action={action}
          vectorType={vectorType}
          vectorCoordinates={vectorCoordinates}
        />
      );
      modalTitle = "Enter Coordinates";
      break;
    case "observationSelect":
      modalContent = (
        <ObservationSelector
          select={obsSelect}
          state={observationSelection}
          area={observationArea}
        />
      );
      modalTitle = "Select Observations";
  }

  return (
    <div>
      {drawingTools}
      <ScaleViewer
        dataset={dataset0}
        mapSettings={mapSettings}
        onUpdate={updateDataset0}
      />
      <MapInputs
        dataset={dataset0}
        mapSettings={mapSettings}
        changeHandler={updateDataset0}
        updateUI={updateUI}
      />
      <MapTools
        uiSettings={uiSettings}
        updateUI={updateUI}
        action={action}
        vectorType={vectorType}
        vectorCoordinates={vectorCoordinates}
      />
      {mapComponent0}
      <Modal
        show={uiSettings.modalType}
        onHide={closeModal}
        dialogClassName="full-screen-modal"
        size="lg"
      >
        <Modal.Header closeButton closeVariant="white" closeLabel={"Close"}>
          <Modal.Title>{modalTitle}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{modalContent}</Modal.Body>
        <Modal.Footer>
          <Button onClick={closeModal}>Close</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default OceanNavigator;
