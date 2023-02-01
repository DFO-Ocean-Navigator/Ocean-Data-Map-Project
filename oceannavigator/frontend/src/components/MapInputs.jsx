import React, { useState } from "react";

import DatasetSelector from "./DatasetSelector.jsx";
import TimeSlider from "./TimeSlider.jsx";

function MapInputs(props) {

  return (
    <div className="MapInputs">
      <DatasetSelector
        key='map_inputs_dataset_1'
        id='dataset_1'
        onUpdate={props.changeHandler}
        mapSettings={props.mapSettings}
      />
    </div>
  )
}

export default MapInputs