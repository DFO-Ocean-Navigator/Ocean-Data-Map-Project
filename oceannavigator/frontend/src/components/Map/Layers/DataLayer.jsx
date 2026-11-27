import React, { useEffect, useRef } from "react";
import OlTileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";

export default function DataLayer({ name, map, dataset, mapSettings, zIndex }) {
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    if (!layerRef.current) {
      layerRef.current = new OlTileLayer({ preload: 1, zIndex: zIndex });
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
  }, [map, name]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || dataset.time.id < 0) return;

    let scale = dataset.variable.scale;
    if (Array.isArray(scale)) {
      scale = scale.join(",");
    }

    let dataSource = {};
    dataSource.url =
      "/api/v2.0/tiles" +
      `/${dataset.id}` +
      `/${dataset.variable.id}` +
      `/${dataset.time.id}` +
      `/${dataset.depth}` +
      "/{z}/{x}/{y}" +
      `?projection=${mapSettings.projection}` +
      `&scale=${scale}` +
      `&interp=${mapSettings.interpType}` +
      `&radius=${mapSettings.interpRadius}` +
      `&neighbours=${mapSettings.interpNeighbours}`;
    dataSource.projection = mapSettings.projection;

    layer.setSource(new XYZ(dataSource));
  }, [layerRef.current, dataset, mapSettings]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    if (zIndex !== undefined) {
      layer.setZIndex(zIndex);
    }
  }, [layerRef.current, zIndex]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    layer.setVisible(!mapSettings.hideDataLayer);
  }, [layerRef.current, mapSettings.hideDataLayer]);

  return null;
}
