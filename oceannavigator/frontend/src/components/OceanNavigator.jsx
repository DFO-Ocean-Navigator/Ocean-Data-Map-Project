import { nominalTypeHack } from "prop-types";
import React, { useState } from "react";

import DatasetSelector from "./DatasetSelector.jsx";

import { DATASET_DEFAULTS, MAP_SETTINGS } from "./Defaults.js";
import GlobalMap from "./GlobalMap.jsx";
import TimeSlider from "./TimeSlider.jsx";

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
    ...MAP_SETTINGS,
  });
  const [uiSettings, setUiSettings] = useState({
    showModal: false,
    busy: false, // Controls if the busyModal is visible
    showHelp: false,
    showCompareHelp: false,
    syncRanges: false, // Clones the variable range from one view to the other when enabled
    sidebarOpen: true, // Controls sidebar opened/closed status
    showObservationSelect: false,
    observationArea: [],
  });


  const changeHandler = () => {
    return none;
  }


  return (
    <div>
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
