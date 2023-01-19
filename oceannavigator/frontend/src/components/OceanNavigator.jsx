import { nominalTypeHack } from "prop-types";
import React, { useState } from "react";

import DatasetSelector from "./DatasetSelector.jsx";

import { DATASET_DEFAULTS, MAP_SETTINGS, DEFAULT_SETTINGS } from "./Defaults.js";
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
    options: {
      ...DEFAULT_SETTINGS
    },
  });


  const changeHandler = () => {
    return none;
  }


  return (
    <div>
        <DatasetSelector
          key='map_inputs_dataset_0'
          id='dataset_0'
          onUpdate={changeHandler}
          options={mapSettings}
          // projection={mapSettings.projection}
          // extent={mapSettings.extent}
        /> 
      <TimeSlider
        dataset={dataset0}
      />
    </div>
  );
}

export default OceanNavigator;
