import React, { useState, useEffect, useContext, useMemo } from "react";

import View from "ol/View.js";
import { transform } from "ol/proj";

import Map from "./Map.jsx";
import { createBasemapLayerSource, BasemapLayer } from "./Layers/BasemapLayer";
import DataLayer from "./Layers/DataLayer";
import {
  createBathyLayerSource,
  BathymetryLayer,
} from "./Layers/BathymetryLayer";
import {
  createFeatureLayerSource,
  FeatureLayer,
} from "./Layers/FeatureLayer.jsx";
import {
  createObsDrawLayerSource,
  ObsDrawLayer,
} from "./Layers/ObsDrawLayer.jsx";
import QuiverLayer from "./Layers/QuiverLayer.jsx";
import MultiMapMousePosition from "./MultiMapMousePosition.js";
import { MapContext } from "../../contexts/MapContext";

const DEF_CENTER = {
  "EPSG:3857": [-50, 53],
  "EPSG:32661": [0, 90],
  "EPSG:3031": [0, -90],
};

const DEF_ZOOM = {
  "EPSG:3857": 4,
  "EPSG:32661": 2,
  "EPSG:3031": 2,
};

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

export default function MapContainer({
  dataset0,
  dataset1,
  featureType,
  class4Type,
  action,
  updateUI,
  compareDatasets,
}) {
  const { map0, map1, mapSettings } = useContext(MapContext);

  const [view, setView] = useState(
    new View({
      center: transform(
        DEF_CENTER[mapSettings.projection],
        "EPSG:4326",
        mapSettings.projection,
      ),
      projection: mapSettings.projection,
      zoom: DEF_ZOOM[mapSettings.projection],
      minZoom: MIN_ZOOM[mapSettings.projection],
      maxZoom: MAX_ZOOM[mapSettings.projection],
    }),
  );

  useEffect(() => {
    if (compareDatasets && map1) {
      map0.getControls().item(0).setMap(map1);
      map0.getControls().item(3).setMap1(map1);
    } else if (map0) {
      map0.getControls().item(0).setMap(map0);
      map0.getControls().item(3).setMap1(map0);
    }
  }, [compareDatasets]);

  const basemapLayerSource = useMemo(() => {
    return createBasemapLayerSource(mapSettings.basemap, mapSettings.projection);
  }, [mapSettings.basemap, mapSettings.projection]);

  const bathyLayerSource = useMemo(() => {
    return createBathyLayerSource(
      mapSettings.projection,
      MIN_ZOOM[mapSettings.projection],
      MAX_ZOOM[mapSettings.projection],
    );
  }, [mapSettings.projection]);

  const featureLayerSource = useMemo(() => {
    return createFeatureLayerSource();
  }, []);

  const obsDrawLayerSource = useMemo(() => {
    return createObsDrawLayerSource();
  }, []);

  return (
    <div className="map-container">
      <Map
        className="map"
        mapId={0}
        view={view}
        controls={[new MultiMapMousePosition()]}
        compareDatasets={compareDatasets}
      >
        <BasemapLayer
          name="basemap0"
          map={map0}
          source={basemapLayerSource}
          mapSettings={mapSettings}
          zIndex={0}
        />
        <DataLayer
          name="dataLayer0"
          map={map0}
          dataset={dataset0}
          mapSettings={mapSettings}
          zIndex={1}
        />
        <BathymetryLayer
          name="bathymetryLayer0"
          map={map0}
          source={bathyLayerSource}
          mapSettings={mapSettings}
        />
        <FeatureLayer
          name="featureLayer0"
          source={featureLayerSource}
          map={map0}
          projection={mapSettings.projection}
        />
        <ObsDrawLayer
          name="ObsDrawLayer0"
          source={obsDrawLayerSource}
          map={map0}
        />
        <QuiverLayer
          name="quiverLayer0"
          map={map0}
          dataset={dataset0}
          projection={mapSettings.projection}
        />
      </Map>
      {compareDatasets ? (
        <Map
          className="map"
          mapId={1}
          view={view}
          controls={[]}
          compareDatasets={compareDatasets}
        >
          <BasemapLayer
            name="basemap1"
            map={map1}
            source={basemapLayerSource}
            mapSettings={mapSettings}
            zIndex={0}
          />
          <DataLayer
            name="dataLayer1"
            map={map1}
            dataset={dataset0}
            mapSettings={mapSettings}
            zIndex={1}
          />
          <BathymetryLayer
            name="bathymetryLayer"
            map={map1}
            source={bathyLayerSource}
            mapSettings={mapSettings}
          />
          <FeatureLayer
            name="featureLayer"
            source={featureLayerSource}
            map={map1}
            projection={mapSettings.projection}
          />
          <ObsDrawLayer
            name="ObsDrawLayer1"
            source={obsDrawLayerSource}
            map={map1}
          />
          <QuiverLayer
            name="quiverLayer1"
            map={map1}
            dataset={dataset1}
            projection={mapSettings.projection}
          />
        </Map>
      ) : null}
    </div>
  );
}
