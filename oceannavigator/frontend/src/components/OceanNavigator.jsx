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
    vectortype: null,
    vectorid: null,
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
  const [pointCoordinates, setPointCoordinates] = useState([]);
  const [names, setNames] = useState([]);
  const [drawingType, setDrawingType] = useState("point");
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
      case "drawingType":
        setDrawingType(arg);
        break;
      case "undoPoints":
        setPointCoordinates(
          pointCoordinates.slice(0, pointCoordinates.length - 1)
        );
        break;
      case "clearPoints":
        setPointCoordinates([]);
        break;
      case "addPoints":
        setPointCoordinates((prevCoordinates) => [...prevCoordinates, ...arg]);
        break;
      case "removePoint":
        let coords = pointCoordinates.filter((coord, index) => index !== arg);
        setPointCoordinates(coords);
        break;
      case "updatePoint":
        const newCoords = [...pointCoordinates];
        newCoords[arg][arg2] = arg3;
        setPointCoordinates(newCoords);
        break;
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

  const drawingTools = uiSettings.showDrawingTools ? (
    <DrawingTools
      uiSettings={uiSettings}
      updateUI={updateUI}
      action={action}
      drawingType={drawingType}
    />
  ) : null;

  const mapComponent0 = (
    <GlobalMap
      ref={mapRef0}
      mapSettings={mapSettings}
      dataset={dataset0}
      drawingType={drawingType}
      action={action}
      updateMapSettings={updateMap}
      pointCoordinates={pointCoordinates}
    />
  );

  let modalContent = null;
  let modalTitle = "";
  switch (uiSettings.modalType) {
    case "point":
      modalContent = (
        <PointWindow
          dataset_0={dataset0}
          point={pointCoordinates}
          mapSettings={mapSettings}
          // names={this.state.names}
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
      modalTitle = pointCoordinates.map((p) => formatLatLon(p[0], p[1]));
      modalTitle = modalTitle.join(", ");
      break;
    case "line":
      modalContent = (
        <LineWindow
          dataset_0={dataset0}
          dataset_1={dataset1}
          line={pointCoordinates}
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
        pointCoordinates
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
          area={pointCoordinates}
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
        />
      );
      modalTitle = "Preset Features";
      break;
    case "enterCoords":
      modalContent = (
        <EnterCoordsWindow
          pointCoordinates={pointCoordinates}
          action={action}
          drawingType={drawingType}
        />
      );
      modalTitle = "Enter Coordinates";
      break;
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
        pointCoordinates={pointCoordinates}
        drawingType={drawingType}
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
