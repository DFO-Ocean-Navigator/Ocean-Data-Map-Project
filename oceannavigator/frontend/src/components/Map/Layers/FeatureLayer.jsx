import React, { useEffect, useRef } from "react";
import VectorLayer from "ol/layer/Vector.js";
import VectorSource from 'ol/source/Vector.js';
import {bbox} from "ol/loadingstrategy";
import GeoJSON from "ol/format/GeoJSON.js";

import { useMap0, useMap1 } from '../MapContext';
import * as featureStyle from "./featureStyles";

export default function FeatureLayer({ name, projection, zIndex }) {
  const map0 = useMap0();
  const map1 = useMap1();
  const layerRef = useRef(new VectorLayer());

  useEffect(() => {
    if (!map0 && !map1) return;

    const layer = layerRef.current; // same instance every time
    if (name) {
      layer.set("name", name);
    }

    const featureSource = new VectorSource({
      features: [],
      strategy: bbox,
      format: new GeoJSON(),
    });

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

    layer.setSource(featureSource);
    layer.setStyle(layerStyle);
    layer.setZIndex(zIndex);

    if (map0) map0.addLayer(layer);
    if (map1) map1.addLayer(layer);

    return () => {
      if (map0) map0.removeLayer(layer);
      if (map1) map1.removeLayer(layer);
    };
  }, [map0, map1, name, projection, zIndex]);

  return null;
}
