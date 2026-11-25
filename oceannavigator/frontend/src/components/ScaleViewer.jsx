import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "react-bootstrap-icons";
import Fade from "react-bootstrap/Fade";
import ColormapRange from "./ColormapRange.jsx";

import { useGetScaleImage } from "../remote/queries.js";

function ScaleViewer({
  dataset,
  mapSettings,
  onUpdate,
  mapRef,
  show,
  rightMap = false,
}) {
  const [defaultScale, setDefaultScale] = useState(
    dataset.variable.scale,
  );
  const [expanded, setExpanded] = useState(false);

  let isCategorical = dataset.variable.is_categorical;
  let datasetId,
    variable,
    scale = null;

  if (mapSettings.hideDataLayer && mapSettings.basemap == "topo") {
    datasetId = "basemap";
    variable = "onav_topo";
    isCategorical = true;
  } else if (mapSettings.hideDataLayer && mapSettings.basemap == "lithology") {
    datasetId = "seafloor_lithology";
    variable = "lithology";
    scale = "1,13";
    isCategorical = true;
  } else {
    datasetId = dataset.id;
    variable = dataset.variable.id;
    scale = `${dataset.variable.scale[0]},${dataset.variable.scale[1]}`;
  }

  const scaleImage = useGetScaleImage(datasetId, variable, scale);

  useEffect(() => {
    setDefaultScale(dataset.variable.scale);
  }, [dataset.id, dataset.variable.id]);

  useEffect(() => {
    return () => {
      if (scaleImage.data) {
        URL.revokeObjectURL(scaleImage.data);
      }
    };
  }, [scaleImage.data]);

  const handleExpand = () => {
    setExpanded(!expanded);
  };

  const rangeControl =
    !isCategorical && expanded ? (
      <ColormapRange
        id="variable_scale"
        state={dataset.variable.scale}
        title="Colormap Range"
        onUpdate={onUpdate}
        default_scale={defaultScale}
        showAuto={true}
        dataset={dataset}
        mapSettings={mapSettings}
        mapRef={mapRef}
      />
    ) : null;

  const expandIcon = !isCategorical ? (
    expanded ? (
      <ChevronLeft className="expand-icon" onClick={handleExpand} />
    ) : (
      <ChevronRight className="expand-icon" onClick={handleExpand} />
    )
  ) : null;

  return (
    <Fade in={show}>
      <div className={`ScaleViewer ${rightMap ? "right" : ""}`}>
        <img
          className="scale-image"
          src={scaleImage.data}
          onClick={isCategorical ? null : handleExpand}
        />
        {rangeControl}
        {expandIcon}
      </div>
    </Fade>
  );
}

export default ScaleViewer;
