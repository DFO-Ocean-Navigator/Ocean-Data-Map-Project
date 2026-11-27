import React, { useEffect, useRef } from "react";
import VectorTileLayer from "ol/layer/VectorTile.js";
import VectorTileSource from "ol/source/VectorTile.js";
import GeoJSON from "ol/format/GeoJSON.js";
import { get as getProj } from "ol/proj";

import { quiverStyle } from "../styles";

export default function QuiverLayer({ name, map, dataset, projection }) {
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    if (!layerRef.current) {
      layerRef.current = new VectorTileLayer({
        source: null,
        style: quiverStyle,
        zIndex: 4,
      });
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
    if (!layer || dataset.time.id < 0) return;

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
    }
    layer.setSource(quiverSource);
  }, [layerRef.current, dataset, projection]);

  return null;
}
