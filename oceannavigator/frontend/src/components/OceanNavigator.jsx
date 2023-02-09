import { nominalTypeHack } from "prop-types";
import React, { useState, useRef, useEffect } from "react";

import { DATASET_DEFAULTS, MAP_DEFAULTS } from "./Defaults.js";
import DrawingTools from "./DrawingTools.jsx";
import GlobalMap from "./GlobalMap.jsx";
import MapInputs from "./MapInputs.jsx";
import MapTools from "./MapTools.jsx";

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
    showDrawingTools: false,
    busy: false, // Controls if the busyModal is visible
    showHelp: false,
    showCompareHelp: false,
    syncRanges: false, // Clones the variable range from one view to the other when enabled
    sidebarOpen: true, // Controls sidebar opened/closed status
    showObservationSelect: false,
    observationArea: [],
  });
  const [pointCoordinates, setPointCoordinates] = useState([]);
  const [drawing, setDrawing] = useState({ type: "point" });

  const action = (name, arg, arg2, arg3) => {
    switch (name) {
      case "startDrawing":
        mapRef0.current.startDrawing();
        break;
      case "stopDrawing":
        mapRef0.current.stopDrawing();
        break;
      case "drawingType":
        setDrawing({ ...drawing, ...arg });
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

  const updateDataset0 = (dataset) => {
    setDataset0(dataset);
  };

  const updateUI = (key, value) => {
    let newUISettings = {
      ...uiSettings,
      [key]: value,
    };
    setUiSettings(newUISettings);
  };

  const drawingTools = uiSettings.showDrawingTools ? (
    <DrawingTools
      uiSettings={uiSettings}
      updateUI={updateUI}
      action={action}
      drawing={drawing}
    />
  ) : null;

  const mapComponent0 = (
    <GlobalMap
      ref={mapRef0}
      mapSettings={mapSettings}
      dataset={dataset0}
      drawing={drawing}
      action={action}
      pointCoordinates={pointCoordinates}
    />
  );

  return (
    <div>
      {drawingTools}
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
      />

      {mapComponent0}
    </div>
  );
}

export default OceanNavigator;
