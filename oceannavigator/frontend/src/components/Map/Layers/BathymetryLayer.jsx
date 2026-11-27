import React, { useEffect, useRef } from "react";
import VectorTileLayer from "ol/layer/VectorTile.js";
import VectorTile from "ol/source/VectorTile";
import { Style, Stroke } from "ol/style";
import MVT from "ol/format/MVT.js";
import { createXYZ } from "ol/tilegrid";



export function createBathyLayerSource(projection, minZoom, maxZoom) {
  return new VectorTile({
    format: new MVT(),
    tileGrid: createXYZ({
      tileSize: 256,
      minZoom: minZoom,
      maxZoom: maxZoom,
    }),
    tileSize: 256,
    url: `/api/v2.0/tiles/bath/{z}/{x}/{y}?projection=${projection}`,
    projection: projection,
  });
}

export function BathymetryLayer({ name, map, source, mapSettings }) {
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    if (!layerRef.current) {
      layerRef.current = new VectorTileLayer({
        style: new Style({
          stroke: new Stroke({
            color: "rgba(0, 0, 0, 1)",
          }),
        }),
        zIndex: 2,
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
    if (!layer) return;

    if (source !== undefined) {
      layer.setSource(source);
    }
  }, [layerRef.current, source]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.setOpacity(mapSettings.mapBathymetryOpacity);
    layer.setVisible(mapSettings.bathymetry);
  }, [mapSettings]);

  return null;
}
