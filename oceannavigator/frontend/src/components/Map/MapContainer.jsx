import React, { useState } from "react";

import * as olProj from "ol/proj";

import Map from "./Map.jsx";
import MapView from "./View.jsx";
import BasemapLayer from "./Layers/BasemapLayer";
import DataLayer from "./Layers/DataLayer";
import BathymetryLayer from "./Layers/BathymetryLayer";
import FeatureLayer from "./Layers/FeatureLayer.jsx";
import ObsDrawLayer from "./Layers/ObsDrawLayer.jsx";
import QuiverLayer from "./Layers/QuiverLayer.jsx";
import { MapContext0, MapContext1 } from "./MapContext";

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
  mapSettings,
  dataset0,
  dataset1,
  featureType,
  class4Type,
  action,
  updateMapSettings,
  updateUI,
  compareDatasets,
}) {
  const [view, setView] = useState(
    MapView(
      olProj.transform(
        DEF_CENTER[mapSettings.projection],
        "EPSG:4326",
        mapSettings.projection,
      ),
      mapSettings.projection,
      DEF_ZOOM[mapSettings.projection],
      MIN_ZOOM[mapSettings.projection],
      MAX_ZOOM[mapSettings.projection],
    ),
  );

  const basemapLayer = (
    <BasemapLayer name="basemap" mapSettings={mapSettings} zIndez={0} />
  );

  const dataLayer0 = (
    <DataLayer
      name="dataLayer0"
      mapContext={MapContext0}
      dataset={dataset0}
      mapSettings={mapSettings}
      zIndez={1}
    />
  );

  const dataLayer1 = compareDatasets ? (
    <DataLayer
      name="dataLayer1"
      mapContext={MapContext1}
      dataset={dataset1}
      mapSettings={mapSettings}
      zIndez={1}
    />
  ) : null;

  const bathymetryLayer = (
    <BathymetryLayer
      name="bathymetryLayer"
      mapSettings={mapSettings}
      minZoom={MIN_ZOOM[mapSettings.projection]}
      maxZoom={MAX_ZOOM[mapSettings.projection]}
      zIndex={2}
    />
  );

  const featureLayer = (
    <FeatureLayer
      name="featureLayer"
      projection={mapSettings.projection}
      zIndex={3}
    />
  );

  const obsDrawLayer = <ObsDrawLayer name="ObsDrawLayer" zIndex={4} />;

  const quiverLayer0 = (
    <QuiverLayer
      name="quiverLayer0"
      dataset={dataset0}
      projection={mapSettings.projection}
      zIndex={4}
    />
  );

  const quiverLayer1 = compareDatasets ? (
    <QuiverLayer
      name="quiverLayer1"
      dataset={dataset1}
      projection={mapSettings.projection}
      zIndex={4}
    />
  ) : null;

  return (
    <div className="map-container">
      <Map
        className="map"
        context={MapContext0}
        view={view}
        compareDatasets={compareDatasets}
      >
        {basemapLayer}
        {dataLayer0}
        {bathymetryLayer}
        {featureLayer}
        {obsDrawLayer}
        {quiverLayer0}
      </Map>
      {compareDatasets ? (
        <Map
          className="map"
          context={MapContext1}
          view={view}
          compareDatasets={compareDatasets}
        >
          {basemapLayer}
          {dataLayer1}
          {bathymetryLayer}
          {featureLayer}
          {obsDrawLayer}
          {quiverLayer1}
        </Map>
      ) : null}
    </div>
  );
}
