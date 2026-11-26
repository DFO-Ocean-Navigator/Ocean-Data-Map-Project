import React, { useEffect, useRef } from "react";
import VectorTileLayer from "ol/layer/VectorTile.js";
import VectorTileSource from "ol/source/VectorTile.js";
import GeoJSON from "ol/format/GeoJSON.js";
import { get as getProj } from "ol/proj";

import { useMap0, useMap1 } from "../MapContext";
import { quiverStyle } from "./featureStyles";

export default function QuiverLayer({ name, dataset, projection, zIndex }) {
  const map0 = useMap0();
  const map1 = useMap1();
  const layerRef = useRef(
    new VectorTileLayer({
      source: null,
      style: quiverStyle,
      zIndex: zIndex,
    }),
  );

  useEffect(() => {
    if (!map0 && !map1) return;

    const layer = layerRef.current;
    if (name) {
      layer.set("name", name);
    }

    let quiverSource = null;
    if (dataset.quiverVariable.toLowerCase() !== "none") {
      quiverSource = new VectorTileSource({
        url:
          "/api/v2.0/tiles/quiver" +
          `/${dataset.id}` +
          `/${dataset.quiverVariable}` +
          `/${dataset.time.id}` +
          `/${dataset.depth}` +
          `/${dataset.quiverDensity}` +
          "/{z}/{x}/{y}" +
          `?projection=${projection}`,
        projection: projection,
        format: new GeoJSON({
          featureProjection: getProj("EPSG:3857"),
          dataProjection: getProj("EPSG:4326"),
        }),
      });
      layer.setSource(quiverSource);
    }

    if (map0) map0.addLayer(layer);
    if (map1) map1.addLayer(layer);

    return () => {
      if (map0) map0.removeLayer(layer);
      if (map1) map1.removeLayer(layer);
    };
  }, [
    map0,
    map1,
    name,
    dataset.quiverVariable,
    dataset.quiverDensity,
    projection,
  ]);

  return null;
}
