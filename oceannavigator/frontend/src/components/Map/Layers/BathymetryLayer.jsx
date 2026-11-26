import React, { useEffect, useRef } from "react";
import VectorTileLayer from "ol/layer/VectorTile.js";
import VectorTile from "ol/source/VectorTile";
import { Style, Stroke } from "ol/style";
import MVT from "ol/format/MVT.js";
import { createXYZ } from "ol/tilegrid";

import { useMap0, useMap1 } from "../MapContext";

export default function BathymetryLayer({
  name,
  mapSettings,
  minZoom,
  maxZoom,
  zIndex,
}) {
  const map0 = useMap0();
  const map1 = useMap1();
  const layerRef = useRef(
    new VectorTileLayer({
      style: new Style({
        stroke: new Stroke({
          color: "rgba(0, 0, 0, 1)",
        }),
      }),
    }),
  );

  useEffect(() => {
    if (!map0 && !map1) return;

    const layer = layerRef.current; // same instance every time
    if (name) {
      layer.set("name", name);
    }

    const bathySource = new VectorTile({
      format: new MVT(),
      tileGrid: createXYZ({
        tileSize: 256,
        minZoom: minZoom,
        maxZoom: maxZoom,
      }),
      tileSize: 256,
      url: `/api/v2.0/tiles/bath/{z}/{x}/{y}?projection=${mapSettings.projection}`,
      projection: mapSettings.projection,
    });

    layer.setOpacity(mapSettings.mapBathymetryOpacity);
    layer.setVisible(mapSettings.bathymetry);
    layer.setSource(bathySource);
    layer.setZIndex(zIndex);

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
    mapSettings.projection,
    mapSettings.mapBathymetryOpacity,
    mapSettings.bathymetry,
    zIndex,
  ]);

  return null;
}
