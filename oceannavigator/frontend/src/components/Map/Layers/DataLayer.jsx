import React, { useContext, useEffect, useRef } from "react";
import OlTileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";

export default function DataLayer({ name, mapContext, dataset, mapSettings, zIndex }) {
  const map = useContext(mapContext);

  const layerRef = useRef(new OlTileLayer({ preload: 1 }));

  useEffect(() => {
    if (!map || dataset.time.id < 0) return;

    const layer = layerRef.current; // same instance every time
    if (name) {
      layer.set("name", name);
    }

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
    layer.setZIndex(zIndex);
    map.addLayer(layer);

    return () => {
      if (map) {
        map.removeLayer(layer);
      }
    };
  }, [map, name, dataset, mapSettings, zIndex]);

  return null;
}
