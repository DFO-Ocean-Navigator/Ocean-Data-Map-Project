import React, { useEffect, useRef } from "react";
import OlTileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import TileWMS from "ol/source/TileWMS.js";

import { useMap0, useMap1 } from "../MapContext";

export default function BasemapLayer({ name, mapSettings, zIndex }) {
  const map0 = useMap0();
  const map1 = useMap1();
  const layerRef = useRef(new OlTileLayer({ preload: 1 }));

  useEffect(() => {
    if (!map0 && !map1) return;

    const layer = layerRef.current; // same instance every time
    if (name) {
      layer.set("name", name);
    }

    let basemapSource;
    switch (mapSettings.basemap) {
      case "topo":
        basemapSource = new XYZ({
          url: `/api/v2.0/tiles/topo/{z}/{x}/{y}?projection=${mapSettings.projection}`,
          projection: mapSettings.projection,
        });
        break;
      case "ocean":
        basemapSource = new XYZ({
          url: "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}",
          projection: "EPSG:3857",
        });
        break;
      case "world":
        basemapSource = new XYZ({
          url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          projection: "EPSG:3857",
        });
        break;
      case "chs":
        basemapSource = new TileWMS({
          url: "https://gisp.dfo-mpo.gc.ca/arcgis/rest/services/CHS/ENC_MaritimeChartService/MapServer/exts/MaritimeChartService/WMSServer",
          params: {
            LAYERS: "1:1",
          },
          projection: "EPSG:3857",
        });
        break;
    }

    layer.setSource(basemapSource);
    layer.setZIndex(zIndex);

    if (map0) {
      map0.addLayer(layer);
    }

    if (map1) {
      map1.addLayer(layer);
    }

    return () => {
      if (map0) {
        map0.removeLayer(layer);
      }
      if (map1) {
        map1.removeLayer(layer);
      }
    };
  }, [
    map0,
    map1,
    name,
    mapSettings.basemap,
    mapSettings.projection,
    mapSettings.topoShadedRelief,
    zIndex,
  ]);

  return null;
}
