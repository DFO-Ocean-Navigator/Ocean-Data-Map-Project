import React, { useEffect, useRef } from "react";
import OlTileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import TileWMS from "ol/source/TileWMS.js";

export function createBasemapLayerSource(basemap, projection) {
  switch (basemap) {
    case "topo":
      return new XYZ({
        url: `/api/v2.0/tiles/topo/{z}/{x}/{y}?projection=${projection}`,
        projection: projection,
      });
    case "ocean":
      return new XYZ({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}",
        projection: "EPSG:3857",
      });
    case "world":
      return new XYZ({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        projection: "EPSG:3857",
      });
    case "chs":
      return new TileWMS({
        url: "https://gisp.dfo-mpo.gc.ca/arcgis/rest/services/CHS/ENC_MaritimeChartService/MapServer/exts/MaritimeChartService/WMSServer",
        params: {
          LAYERS: "1:1",
        },
        projection: "EPSG:3857",
      });
  }
}

export function BasemapLayer({ name, map, source, zIndex }) {
  const layerRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    if (!layerRef.current) {
      layerRef.current = new OlTileLayer({ preload: 1, zIndex: zIndex  });
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

    if (zIndex !== undefined) {
      layer.setZIndex(zIndex);
    }
  }, [layerRef.current, zIndex]);

  return null;
}
