import React, { useEffect, useRef } from "react";
import VectorLayer from "ol/layer/Vector.js";
import VectorSource from "ol/source/Vector.js";

import { useMap0, useMap1 } from "../MapContext";

export default function ObsDrawLayer({ name, zIndex }) {
  const map0 = useMap0();
  const map1 = useMap1();
  const layerRef = useRef(new VectorLayer());

  useEffect(() => {
    if (!map0 && !map1) return;

    const layer = layerRef.current; // same instance every time
    if (name) {
      layer.set("name", name);
    }

    const newObsDrawSource = new VectorSource({ features: [] });

    layer.setSource(newObsDrawSource);
    layer.setZIndex(zIndex);

    if (map0) map0.addLayer(layer);
    if (map1) map1.addLayer(layer);

    return () => {
      if (map0) map0.removeLayer(layer);
      if (map1) map1.removeLayer(layer);
    };
  }, [map0, map1, name, zIndex]);

  return null;
}
