import React, { useContext, useEffect } from "react";
import View from "ol/View.js";
import { useMap0, useMap1 } from "./MapContext";

export default function MapView(center, projection, zoom, minZoom, maxZoom) {
  // const map0 = useContext(props.context0);
  // const map1 = useContext(props.context1);

  // useEffect(() => {
  //   if (!map0 && !map1) return;
  //   const view = new View(props);

  //   if (map0) {
  //     map0.setView(view);
  //   }

  //   if (map1) {
  //     map1.setView(view);
  //   }
  // }, [map0, map1]);

  // return null;
  const view = new View({
    center: center,
    projection: projection,
    zoom: zoom,
    minZoom: minZoom,
    maxZoom: maxZoom,
  });

  return view;
}
