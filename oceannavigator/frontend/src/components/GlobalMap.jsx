import React, { useState, useEffect } from "react";
import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import * as olProj from "ol/proj";
import { Style, Stroke, Fill } from "ol/style";
import VectorTile from "ol/source/VectorTile";
import VectorTileLayer from 'ol/layer/VectorTile.js';
import * as olTilegrid from "ol/tilegrid";
import MVT from "ol/format/MVT.js";
import XYZ from "ol/source/XYZ";
import "ol/ol.css";

const MIN_ZOOM = {
  "EPSG:3857": 1,
  "EPSG:32661": 2,
  "EPSG:3031": 2,
};

const MAX_ZOOM = {
  "EPSG:3857": 16,
  "EPSG:32661": 5,
  "EPSG:3031": 5,
};

function GlobalMap(props) {
  const [map, setMap] = useState();
  const [dataSource, setDataSource] = useState({});

  useEffect(() => {
    let map = new Map({
      target: "map-container",
      layers: [
        layer_basemap,
        layer_data,
        layer_landshapes,
        layer_bath,
        layer_bathshapes,
        // layer_vector,
        // layer_obsDraw,
        // layer_quiver,
      ],
      view: mapView,
    });
    setMap(map);
  }, []);

  let center = [-50, 53];
  if (props.mapSettings.center) {
    center = props.mapSettings.center.map(parseFloat);
  }
  let zoom = 4;
  if (props.mapSettings.zoom) {
    zoom = props.mapSettings.zoom;
  }
  const projection = props.mapSettings.projection;

  const mapView = new View({
    center: olProj.transform(center, "EPSG:4326", projection),
    projection: projection,
    zoom: zoom,
    maxZoom: MAX_ZOOM[props.mapSettings.projection],
    minZoom: MIN_ZOOM[props.mapSettings.projection],
  });

  const vectorTileGrid = new olTilegrid.createXYZ({
    tileSize: 512,
    maxZoom: MAX_ZOOM[props.mapSettings.projection],
  });

  const getBasemap = (source, projection, attribution) => {
    switch (source) {
      case "topo":
        const shadedRelief = props.mapSettings.topoShadedRelief
          ? "true"
          : "false";

        return new TileLayer({
          preload: 1,
          source: new XYZ({
            url: `/api/v2.0/tiles/topo/{z}/{x}/{y}?shaded_relief=${shadedRelief}&projection=${projection}`,
            projection: projection,
          }),
        });
    }
  };

  const getDataSource = () => {
    let scale = props.dataset.variable_scale;
    if (Array.isArray(scale)) {
      scale = scale.join(",");
    }

    let dataSource = {};
    dataSource.url =
      "/api/v2.0/tiles" +
      `/${props.dataset.id}` +
      `/${props.dataset.variable}` +
      `/${props.dataset.time}` +
      `/${props.dataset.depth}` +
      "/{z}/{x}/{y}" +
      `?projection=${props.mapSettings.projection}` +
      `&scale=${scale}` +
      `&interp=${props.mapSettings.interpType}` +
      `&radius=${props.mapSettings.interpRadius}` +
      `&neighbours=${props.mapSettings.interpNeighbours}`;
    dataSource.projection = props.mapSettings.projection;

    return dataSource;
  };

  const layer_basemap = getBasemap(
    props.mapSettings.basemap,
    props.mapSettings.projection,
    props.mapSettings.basemap_attribution
  );

  const layer_data = new TileLayer({
    preload: 1,
    source: new XYZ(getDataSource()),
  });

  const layer_bath = new TileLayer({
    source: new XYZ({
      url: `/api/v2.0/tiles/bath/{z}/{x}/{y}?projection=${props.mapSettings.projection}`,
      projection: props.mapSettings.projection,
    }),
    opacity: props.mapSettings.mapBathymetryOpacity,
    visible: props.mapSettings.bathymetry,
    preload: 1,
  });

  const layer_bathshapes = new VectorTileLayer(
    {
      opacity: props.mapSettings.mapBathymetryOpacity,
      visible: props.mapSettings.bathymetry,
      style: new Style({
        stroke: new Stroke({
          color: 'rgba(0, 0, 0, 1)'
        })
      }),
      source: new VectorTile({
        format: new MVT(),
        tileGrid: vectorTileGrid,
        tilePixelRatio: 8,
        url: `/api/v2.0/mbt/bath/{z}/{x}/{y}?projection=${props.mapSettings.projection}`,
      }),
  });

  const layer_landshapes = new VectorTileLayer({
    opacity: 1,
    style: new Style({
      stroke: new Stroke({
        color: "rgba(0, 0, 0, 1)",
      }),
      fill: new Fill({
        color: "white",
      }),
    }),
    source: new VectorTile({
      format: new MVT(),
      tileGrid: vectorTileGrid,
      tilePixelRatio: 8,
      url: `/api/v2.0/mbt/lands/{z}/{x}/{y}?projection=${props.mapSettings.projection}`,
      projection: props.mapSettings.projection,
    }),
  });

  return (
    <div
      style={{ height: "100vh", width: "100%" }}
      id="map-container"
      className="map-container"
    />
  );
}

export default GlobalMap;
