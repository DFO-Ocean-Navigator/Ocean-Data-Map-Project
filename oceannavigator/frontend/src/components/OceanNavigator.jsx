import { nominalTypeHack } from "prop-types";
import React, { useState } from "react";

import { DATASET_DEFAULTS, MAP_DEFAULTS } from "./Defaults.js";
import DrawingTools from "./DrawingTools.jsx";
import GlobalMap from "./GlobalMap.jsx";
import MapInputs from "./MapInputs.jsx";
import MapTools from "./MapTools.jsx";


function OceanNavigator() {
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

  const updateDataset0 = (dataset) => {
    setDataset0(dataset);
  };

  const drawingTools = uiSettings.showDrawingTools ? <DrawingTools /> : null;

  const updateUI = (key, value) => {
    let newUISettings = {
      ...uiSettings,
      [key]: value,
    };
    setUiSettings(newUISettings);
  };

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
      />
      <GlobalMap
        mapSettings={mapSettings}
        dataset={dataset0}
        // ref={(m) => this.mapComponent = m}
        // state={this.state}
        // action={this.action}
        // updateState={this.updateState}
        // partner={this.mapComponent2}
        // scale={this.state.variable_scale}
        // options={this.state.options}
        // quiverVariable={this.state.quiverVariable}
      />
    </div>
  );
}

export default OceanNavigator;
