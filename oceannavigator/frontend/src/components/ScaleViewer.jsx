import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "react-bootstrap-icons";

import ColormapRange from "./ColormapRange.jsx";

function ScaleViewer(props) {
  const [source, setSource] = useState(
    "/api/v2.0/scale/giops_day/votemper/-5,30"
  );
  const [scale, setScale] = useState(props.dataset.variable_scale);
  const [defaultScale, setDefaultScale] = useState(
    props.dataset.variable_scale
  );
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setDefaultScale(props.dataset.variable_scale);
  }, [props.dataset.id, props.dataset.variable]);

  useEffect(() => {
    setScale(props.dataset.variable_scale);
    setSource(
      `/api/v2.0/scale/${props.dataset.id}/${props.dataset.variable}` +
        `/${props.dataset.variable_scale[0]},${props.dataset.variable_scale[1]}`
    );
  }, [props.dataset.variable_scale]);

  const handleExpand = () => {
    setExpanded(!expanded);
  };

  const rangeControl = expanded ? (
    <ColormapRange
      id="variable_scale"
      state={scale}
      title={"Colormap Range"}
      onUpdate={props.onUpdate}
      default_scale={defaultScale}
      autourl={
        "/api/v2.0/range/" +
        props.dataset.id +
        "/" +
        props.dataset.variable +
        "/" +
        props.mapSettings.interpType +
        "/" +
        props.mapSettings.interpRadius +
        "/" +
        props.mapSettings.interpNeighbours +
        "/" +
        props.mapSettings.projection +
        "/" +
        props.mapState.extent.join(",") +
        "/" +
        props.dataset.depth +
        "/" +
        props.dataset.time
      }
    />
  ) : null;

  const expandIcon = expanded ? (
    <ChevronLeft className="expand-icon" onClick={handleExpand} />
  ) : (
    <ChevronRight className="expand-icon" onClick={handleExpand} />
  );

  const scaleImage = (
    <img className="scale-image" src={source} onClick={handleExpand} />
  );

  return (
    <div className={`ScaleViewer ${props.right ? "right" : ""}`}>
      {scaleImage}
      {rangeControl}
      {expandIcon}
    </div>
  );
}

export default ScaleViewer;
