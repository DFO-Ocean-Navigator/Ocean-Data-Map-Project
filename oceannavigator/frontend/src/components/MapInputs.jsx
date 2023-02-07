import React, { useState } from "react";

import DatasetSelector from "./DatasetSelector.jsx";

function MapInputs(props) {

  return (
    <div className="MapInputs">
      <DatasetSelector
        key='map_inputs_dataset_1'
        id='dataset_1'
        onUpdate={props.changeHandler}
        mapSettings={props.mapSettings}
        updateLoading={props.updateLoading}
      />
    </div>
  )
}

export default MapInputs