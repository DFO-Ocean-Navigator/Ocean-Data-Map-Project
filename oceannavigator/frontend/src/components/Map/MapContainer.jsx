import React, { useState, useEffect, useContext, useMemo } from "react";

import View from "ol/View.js";
import { transform } from "ol/proj";

import Map from "./Map.jsx";
import MultiMapMousePosition from "./MultiMapMousePosition.js";
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
import { DrawFeatures } from "./Interactions/DrawFeatures.jsx";
import { SelectFeatures } from "./Interactions/SelectFeatures.jsx";
import {
  MapInstancesContext,
  MapSettingsContext,
} from "../../contexts/MapContext";

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
  class4Type,
  updateUI,
  compareDatasets,
}) {
  const { map0, map1 } = useContext(MapInstancesContext);
  const { mapSettings } = useContext(MapSettingsContext);

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
    if (!map0) return;

    const targetMap = compareDatasets && map1 ? map1 : map0;
    map0.getControls().item(0)?.setMap(targetMap);
    map0.getControls().item(3)?.setMap1(targetMap);
  }, [map0, map1, compareDatasets]);

  const basemapLayerSource = useMemo(() => {
    return createBasemapLayerSource(
      mapSettings.basemap,
      mapSettings.projection,
    );
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

  const map0Controls = useMemo(() => [new MultiMapMousePosition()], []);

  return (
    <div className="map-container">
      <Map
        className="map"
        mapId={0}
        view={view}
        controls={map0Controls}
        compareDatasets={compareDatasets}
      >
        <BasemapLayer
          name="basemap0"
          map={map0}
          source={basemapLayerSource}
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
        <SelectFeatures map={map0} projection={mapSettings.projection} />
        <DrawFeatures
          map={map0}
          source={featureLayerSource}
        />
      </Map>
      {compareDatasets ? (
        <Map
          className="map"
          mapId={1}
          view={view}
          compareDatasets={compareDatasets}
        >
          <BasemapLayer
            name="basemap1"
            map={map1}
            source={basemapLayerSource}
            hideLayer={mapSettings.hideDataLayer}
            zIndex={0}
          />
          <DataLayer
            name="dataLayer1"
            map={map1}
            dataset={dataset1}
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
          <SelectFeatures map={map1} projection={mapSettings.projection} />
          <DrawFeatures
            map={map1}
            source={featureLayerSource}
          />
        </Map>
      ) : null}
    </div>
  );
}
