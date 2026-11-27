import React, { useContext, useEffect, useRef } from "react";
import VectorLayer from "ol/layer/Vector.js";
import VectorSource from "ol/source/Vector.js";

export function createObsDrawLayerSource() {
  return new VectorSource({ features: [] });
}

export function ObsDrawLayer({ name, map, source }) {
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    if (!layerRef.current) {
      layerRef.current = new VectorLayer({ zIndex: 4 });
    }

    const layer = layerRef.current;

    if (name) {
      layer.set("name", name);
    }

    const hasLayer = map.getLayers().getArray().includes(layer);
    if (!hasLayer) map.addLayer(layer);

    return () => {
      map.removeLayer(layer);
    };
  }, [map]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    if (source !== undefined) {
      layer.setSource(source);
    }
  }, [layerRef.current, source]);

  return null;
}
