import React, { useEffect, useRef } from "react";
import VectorLayer from "ol/layer/Vector.js";
import VectorSource from "ol/source/Vector.js";
import { bbox } from "ol/loadingstrategy";
import GeoJSON from "ol/format/GeoJSON.js";

import * as featureStyle from "./featureStyles";

export function createFeatureLayerSource() {
  return new VectorSource({
    features: [],
    strategy: bbox,
    format: new GeoJSON(),
  });
}

export function FeatureLayer({ name, source, map, projection }) {
  const layerRef = useRef();

  useEffect(() => {
    if (!map) return;

    if (!layerRef.current) {
      layerRef.current = new VectorLayer({ zIndex: 3 });
    }

    const layer = layerRef.current;

    if (name) {
      layer.set("name", name);
    }

    map.addLayer(layer);

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
  }, [source]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    const layerStyle = (feature, res) => {
      if (feat.get("class") == "observation") {
        return featureStyle.observationStyle(feature);
      } else {
        switch (feat.get("type")) {
          case "Polygon":
            return featureStyle.polygonStyle(feature, projection);
          case "LineString":
            return featureStyle.lineStyle(feature, projection);
          case "Point":
            return featureStyle.pointStyle();
          case "GKHdrifter": {
            return featureStyle.drifterStyle(feature);
          }
          case "class4": {
            return featureStyle.class4Style(feature);
          }
        }
      }
    };
    layer.setStyle(layerStyle);
  }, [projection]);

  return null;
}
