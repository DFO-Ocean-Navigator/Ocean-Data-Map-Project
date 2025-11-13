import React, {
  forwardRef,
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
} from "react";
import axios from "axios";
import proj4 from "proj4";
import TileLayer from "ol/layer/Tile";
import Overlay from "ol/Overlay.js";
import { Style, Circle, Stroke, Fill } from "ol/style";
import VectorTile from "ol/source/VectorTile";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON.js";
import MVT from "ol/format/MVT.js";
import XYZ from "ol/source/XYZ";
import Feature from "ol/Feature.js";
import Point from "ol/geom/Point.js";
import LineString from "ol/geom/LineString.js";
import Polygon from "ol/geom/Polygon.js";
import Select from "ol/interaction/Select.js";
import { pointerMove } from "ol/events/condition";
import * as olLoadingstrategy from "ol/loadingstrategy";
import * as olProj from "ol/proj";
import * as olProj4 from "ol/proj/proj4";
import * as olTilegrid from "ol/tilegrid";

import { AnnotationOverlay } from "./AnnotationOverlay.jsx";
import MultiMapMousePosition from "./MultiMapMousePosition.js";
import {
  createPlotData,
  createMapView,
  createMap,
  createFeatureVectorLayer,
  getBasemap,
  getDataSource,
  getQuiverSource,
  removeMapInteractions,
  createFeatureTextStyle,
} from "./utils";
import {
  getDrawAction,
  obsPointDrawAction,
  obsAreaDrawAction,
} from "./drawing";

import "ol/ol.css";

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

proj4.defs(
  "EPSG:32661",
  "+proj=stere +lat_0=90 +lat_ts=90 +lon_0=0 +k=0.994 +x_0=2000000 +y_0=2000000 +ellps=WGS84 +datum=WGS84 +units=m +no_defs"
);
proj4.defs(
  "EPSG:3031",
  "+proj=stere +lat_0=-90 +lat_ts=-71 +lon_0=0 +k=1 +x_0=0 +y_0=0 +ellps=WGS84 +datum=WGS84 +units=m +no_defs"
);
olProj4.register(proj4);

var proj32661 = olProj.get("EPSG:32661");
proj32661.setWorldExtent([-180.0, 60.0, 180.0, 90.0]);
proj32661.setExtent([
  -1154826.7379766018, -1154826.7379766018, 5154826.737976602,
  5154826.737976601,
]);

var proj3031 = olProj.get("EPSG:3031");
proj3031.setWorldExtent([-180.0, -90.0, 180.0, -60.0]);
proj3031.setExtent([
  -3087442.3458218463, -3087442.3458218463, 3087442.345821846,
  3087442.345821846,
]);

/*******************
Map layers:
basemap: 0
data tiles: 1
land shapes (mbt tiles): 2
bathy lines: 3
bathy shapes: 4
vector features: 5
observation drawing: 6
quivers: 7
*****************/

const Map = forwardRef((props, ref) => {
  const [map0, setMap0] = useState();
  const [map1, setMap1] = useState();
  const [mapView, setMapView] = useState();
  const [annotationOverlays, setAnnotationOverlays] = useState([]);
  const [select0, setSelect0] = useState();
  const [select1, setSelect1] = useState();
  const [layerBasemap, setLayerBasemap] = useState();
  const [layerData0, setLayerData0] = useState(
    new TileLayer({
      preload: 1,
      zIndex: 1,
    })
  );
  const [layerData1, setLayerData1] = useState(
    new TileLayer({
      preload: 1,
    })
  );
  const [featureVectorSource, setFeatureVectorSource] = useState();
  const [obsDrawSource, setObsDrawSource] = useState();
  const [drawActions, setDrawActions] = useState({ map0: null, map1: null });
  const mapRef0 = useRef();
  const mapRef1 = useRef();
  const popupElement0 = useRef(null);
  const popupElement1 = useRef(null);
  const [hoverSelect0, setHoverSelect0] = useState();
  const [hoverSelect1, setHoverSelect1] = useState();

  useImperativeHandle(ref, () => ({
    startFeatureDraw: startFeatureDraw,
    stopFeatureDraw: stopFeatureDraw,
    addAnnotationLabel: addAnnotationLabel,
    undoAnnotationLabel: undoAnnotationLabel,
    clearAnnotationLabels: clearAnnotationLabels,
    getFeatures: getFeatures,
    getPlotData: getPlotData,
    selectFeatures: selectFeatures,
    undoFeature: undoFeature,
    updateFeatureGeometry: updateFeatureGeometry,
    updateFeatureName: updateFeatureName,
    addNewFeature: addNewFeature,
    removeFeatures: removeFeatures,
    splitPolyFeatures: splitPolyFeatures,
    combinePointFeatures: combinePointFeatures,
    loadFeatures: loadFeatures,
    drawObsPoint: drawObsPoint,
    drawObsArea: drawObsArea,
    resetMap: resetMap,
  }));

  useEffect(() => {
    let overlay = new Overlay({
      element: popupElement0.current,
      autoPan: false,
      offset: [0, -10],
      positioning: "bottom-center",
    });

    let projection = props.mapSettings.projection;
    const newMapView = createMapView(
      DEF_CENTER[projection],
      projection,
      4,
      MIN_ZOOM[projection],
      MAX_ZOOM[projection]
    );

    let newFeatureVectorSource = new VectorSource({
      features: [],
      strategy: olLoadingstrategy.bbox,
      format: new GeoJSON(),
    });

    let newLayerFeatureVector = createFeatureVectorLayer(
      newFeatureVectorSource,
      props.mapSettings
    );

    const newObsDrawSource = new VectorSource({ features: [] });

    const newMap = createMap(
      props.mapSettings,
      overlay,
      popupElement0,
      newMapView,
      layerData0,
      newLayerFeatureVector,
      newObsDrawSource,
      MAX_ZOOM[props.mapSettings.projection],
      mapRef0
    );

    const newSelect0 = createSelect();
    const newSelect1 = createSelect();
    const newHoverSelect = createHoverSelect(newSelect0, newLayerFeatureVector);
    newMap.addInteraction(newSelect0);
    newMap.addInteraction(newHoverSelect);

    newMap.addControl(new MultiMapMousePosition());

    newMap.on("moveend", function () {
      const c = olProj
        .transform(
          newMapView.getCenter(),
          props.mapSettings.projection,
          "EPSG:4326"
        )
        .map(function (c) {
          return c.toFixed(4);
        });
      props.updateMapState("center", c);
      props.updateMapState("zoom", newMapView.getZoom());
      const extent = newMapView.calculateExtent(newMap.getSize());
      props.updateMapState("extent", extent);
    });

    addDblClickPlot(newMap, newSelect0);

    let mapLayers = newMap.getLayers().getArray();

    setMap0(newMap);
    setMapView(newMapView);
    setSelect0(newSelect0);
    setSelect1(newSelect1);
    setHoverSelect0(newHoverSelect);
    setLayerBasemap(mapLayers[0]);
    setFeatureVectorSource(newFeatureVectorSource);
    setObsDrawSource(newObsDrawSource);
  }, []);

  useEffect(() => {
    let newMap, newHoverSelect;
    if (props.compareDatasets) {
      let overlay = new Overlay({
        element: popupElement1.current,
        autoPan: false,
        offset: [0, -10],
        positioning: "bottom-center",
      });

      let newLayerFeatureVector = createFeatureVectorLayer(
        featureVectorSource,
        props.mapSettings
      );

      newMap = createMap(
        props.mapSettings,
        overlay,
        popupElement1,
        mapView,
        layerData1,
        newLayerFeatureVector,
        obsDrawSource,
        MAX_ZOOM[props.mapSettings.projection],
        mapRef1
      );

      map0.getControls().item(0).setMap(newMap); // change zoom control target
      map0.getControls().item(3).setMap1(newMap);

      newHoverSelect = createHoverSelect(select1, newLayerFeatureVector);
      newMap.addInteraction(select1);
      newMap.addInteraction(newHoverSelect);
      if (newHoverSelect && newHoverSelect.addSelectInteraction) {
        newHoverSelect.addSelectInteraction(select1);
      }

      addDblClickPlot(newMap, select1);

      if (drawActions && drawActions.map0) {
        if (drawActions.map1 && newMap) {
          newMap.removeInteraction(drawActions.map1);
        }
        const source = map0.getLayers().getArray()[5].getSource();
        const mirroredDraw = getDrawAction(source, props.featureType);
        newMap.addInteraction(mirroredDraw);
        setDrawActions((prev) => ({ ...(prev || {}), map1: mirroredDraw }));
      }

      let overlays = map0.getOverlays().getArray();

      for (let overlay of overlays) {
        if (overlay.getId() && overlay.getId().includes("annotation")) {
          overlay.linkOverlay(newMap);
        }
      }
    } else if (map0) {
      if (drawActions && drawActions.map1) {
        if (map1) {
          map1.removeInteraction(drawActions.map1);
        }

        setDrawActions((prev) => ({ ...(prev || {}), map1: null }));
      }

      map0.getControls().item(0).setMap(map0); // change zoom control target
      map0.getControls().item(3).setMap(map0);
    }
    setMap1(newMap);
    setHoverSelect1(newHoverSelect);
  }, [props.compareDatasets]);

  useEffect(() => {
    if (select0 || select1) {
      select0.on("select", (e) => {
        updateSelects(e, select0, select1);
      });
      select1.on("select", (e) => {
        updateSelects(e, select0, select1);
      });
    }
  }, [select0, select1]);

  useEffect(() => {
    if (props.dataset0.default_location) {
      const newCenter = [
        props.dataset0.default_location[0],
        props.dataset0.default_location[1],
      ];
      const newZoom = props.dataset0.default_location[2];
      const newMapView = createMapView(
        newCenter,
        "EPSG:3857",
        newZoom,
        MIN_ZOOM[props.mapSettings.projection],
        MAX_ZOOM[props.mapSettings.projection]
      );
      map0.setView(newMapView);
      props.updateMapSettings("projection", "EPSG:3857");
      if (props.compareDatasets) {
        map1.setView(newMapView);
      }
    }
  }, [props.dataset0.id]);

  useEffect(() => {
    if (props.dataset1.default_location) {
      const newCenter = [
        props.dataset1.default_location[0],
        props.dataset1.default_location[1],
      ];
      const newZoom = props.dataset1.default_location[2];
      const newMapView = createMapView(
        newCenter,
        "EPSG:3857",
        newZoom,
        MIN_ZOOM[props.mapSettings.projection],
        MAX_ZOOM[props.mapSettings.projection]
      );
      map0.setView(newMapView);
      map1.setView(newMapView);
      props.updateMapSettings("projection", "EPSG:3857");
    }
  }, [props.dataset1.id]);

  useEffect(() => {
    if (props.dataset0.time >= 0) {
      layerData0.setSource(
        new XYZ(getDataSource(props.dataset0, props.mapSettings))
      );
    }
  }, [
    props.dataset0.id,
    props.dataset0.variable,
    props.dataset0.time,
    props.dataset0.depth,
    props.dataset0.variable_scale,
  ]);

  useEffect(() => {
    if (props.dataset1.time >= 0) {
      layerData1.setSource(
        new XYZ(getDataSource(props.dataset1, props.mapSettings))
      );
    }
  }, [
    props.dataset1.id,
    props.dataset1.variable,
    props.dataset1.time,
    props.dataset1.depth,
    props.dataset1.variable_scale,
  ]);

  useEffect(() => {
    if (map0) {
      let quiverLayer = map0.getLayers().getArray()[7];
      let source = null;
      if (props.dataset0.quiverVariable.toLowerCase() !== "none") {
        source = getQuiverSource(props.dataset0, props.mapSettings);
      }
      quiverLayer.setSource(source);
    }
  }, [
    props.dataset0.id,
    props.dataset0.quiverVariable,
    props.dataset0.quiverDensity,
  ]);

  useEffect(() => {
    if (map1) {
      let quiverLayer = map1.getLayers().getArray()[7];
      let source = null;
      if (props.dataset1.quiverVariable.toLowerCase() !== "none") {
        source = getQuiverSource(props.dataset1, props.mapSettings);
      }
      quiverLayer.setSource(source);
    }
  }, [
    props.dataset1.id,
    props.dataset1.quiverVariable,
    props.dataset1.quiverDensity,
  ]);

  useEffect(() => {
    if (drawActions.map0 || drawActions.map1) {
      let source = map0.getLayers().getArray()[5].getSource();
      if (drawActions.map0) {
        map0.removeInteraction(drawActions.map0);
      }
      if (drawActions.map1 && map1) {
        map1.removeInteraction(drawActions.map1);
      }
      let newDrawAction0 = getDrawAction(source, props.featureType);
      map0.addInteraction(newDrawAction0);
      let newActions = { map0: newDrawAction0, map1: null };

      if (props.compareDatasets && map1) {
        let newDrawAction1 = getDrawAction(source, props.featureType);
        map1.addInteraction(newDrawAction1);
        newActions.map1 = newDrawAction1;
      }
      setDrawActions(newActions);
    }
  }, [props.featureType]);

  useEffect(() => {
    if (map0) {
      updateProjection(map0, props.dataset0);
      if (props.compareDatasets) {
        updateProjection(map1, props.dataset1);
      }
    }
  }, [props.mapSettings.projection]);

  useEffect(() => {
    if (map0) {
      updateBasemap(map0);
      if (props.compareDatasets) {
        updateBasemap(map1);
      }
    }
  }, [props.mapSettings.basemap]);

  useEffect(() => {
    if (map0) {
      updateInterpolation(map0, props.dataset0);
      if (props.compareDatasets) {
        updateInterpolation(map1, props.dataset1);
      }
    }
  }, [
    props.mapSettings.interpType,
    props.mapSettings.interpRadius,
    props.mapSettings.interpNeighbours,
  ]);

  useEffect(() => {
    if (map0) {
      updateBathy(map0, props.dataset0);
      if (props.compareDatasets) {
        updateBathy(map1, props.dataset1);
      }
    }
  }, [
    props.mapSettings.bathymetry,
    props.mapSettings.mapBathymetryOpacity,
    props.mapSettings.bathyContour,
    props.mapSettings.topoShadedRelief,
  ]);

  const createSelect = () => {
    const newSelect = new Select({
      style: function (feat, res) {
        const styles = [
          new Style({
            stroke: new Stroke({ color: "#0099ff", width: 4 }),
            image: new Circle({
              radius: 4,
              fill: new Fill({ color: "#0099ff" }),
              stroke: new Stroke({ color: "#ffffff", width: 1 }),
            }),
          }),
        ];
        const textStyle = createFeatureTextStyle(
          feat,
          "#000",
          "#ffffff",
          props.mapSettings
        );
        if (textStyle && feat.get("type") !== "class4") styles.push(textStyle);

        return styles;
      },
    });

    return newSelect;
  };

  const updateSelects = (e, s0 = null, s1 = null) => {
    let selected = e.selected;
    let features0 = [...s0?.getFeatures().getArray()];
    let features1 = [...s1?.getFeatures().getArray()];

    if (e.selected.length === 0 || e.selected[0]?.get("type") === "Point") {
      selected = Array.from(
        new Set([...e.selected, ...features0, ...features1])
      ).filter(
        (feature) =>
          feature.get("type") === "Point" &&
          feature.getId() !== e.deselected[0]?.getId()
      );
    }

    // add resulting features to select interactions
    s0?.getFeatures().clear();
    s1?.getFeatures().clear();

    for (let feature of selected) {
      s0?.getFeatures().push(feature);
      s1?.getFeatures().push(feature);
    }

    let ids = selected.map((feature) => feature.getId());
    props.action("selectedFeatureIds", ids);
  };

  const createHoverSelect = (selectInteraction, layerFeatureVector) => {
    return new Select({
      condition: pointerMove,
      layers: [layerFeatureVector],
      filter: (feature) =>
        feature.get("type") !== "class4" &&
        feature.get("class") !== "observation",
      style: (feature, resolution) => {
        const isSelected = selectInteraction
          .getFeatures()
          .getArray()
          .includes(feature);
        const fillColor = isSelected ? "#0099ff" : "#ff0000";

        const textStyle = createFeatureTextStyle(
          feature,
          "#000",
          "#ffffff",
          props.mapSettings
        );

        if (feature.get("type") === "Point") {
          return new Style({
            stroke: new Stroke({ color: "#ffffff88", width: 16 }),
            image: new Circle({
              radius: 6,
              fill: new Fill({ color: fillColor }),
              stroke: new Stroke({ color: "#ffffffff", width: 3 }),
            }),
          });
        }

        const glow1 = new Style({
          stroke: new Stroke({ color: "#ffffff22", width: 16 }),
        });
        const glow2 = new Style({
          stroke: new Stroke({ color: "#ffffff88", width: 12 }),
        });
        const white = new Style({
          stroke: new Stroke({ color: "#ffffffff", width: 8 }),
        });
        const color = new Style({
          stroke: new Stroke({ color: fillColor, width: 4 }),
        });

        return textStyle
          ? [glow1, glow2, white, color, textStyle]
          : [glow1, glow2, white, color];
      },
    });
  };

  const getFeatures = () => {
    let selectedFeatures = select0
      .getFeatures()
      .getArray()
      .map((feature) => {
        return feature.getId();
      });

    let features = featureVectorSource.getFeatures();
    features = features.filter(
      (feature) =>
        feature.get("type") !== "class4" &&
        feature.get("class") !== "observation"
    );
    features.sort((a, b) => a.ol_uid.localeCompare(b.ol_uid));
    features = features.map((feature) => {
      let id = feature.getId();
      let name = feature.get("name");
      let geom = feature.getGeometry().clone();
      let coords = geom.getCoordinates();

      if (feature.get("type") === "Point") {
        coords = [coords];
      } else if (feature.get("type") === "Polygon") {
        coords = coords[0];
        coords.pop();
      }

      coords = coords.map((coord) => {
        return olProj.transform(
          coord,
          props.mapSettings.projection,
          "EPSG:4326"
        );
      });

      let selected = selectedFeatures.includes(id);

      return {
        id: id,
        name: name,
        type: feature.get("type"),
        coords: coords,
        selected: selected,
      };
    });

    return features;
  };

  const getPlotData = () => {
    let selected = select0.getFeatures().getArray();
    if (selected.length > 0) {
      return createPlotData(selected, props.mapSettings.projection);
    }
  };

  const selectFeatures = (selectedIds) => {
    select0.getFeatures().clear();
    let features = selectedIds.map((id) => {
      return featureVectorSource.getFeatureById(id);
    });
    for (let feature of features) {
      select0.getFeatures().push(feature);
      if (props.compareDatasets) {
        select1.getFeatures().push(feature);
      }
    }
    props.action("selectedFeatureIds", selectedIds);
  };

  const undoFeature = () => {
    let features = featureVectorSource.getFeatures();
    features = features.filter(
      (feature) => feature.get("class") !== "observation"
    );
    if (features.length > 0) {
      featureVectorSource.removeFeatures([features[features.length - 1]]);
    }
  };

  const updateFeatureGeometry = (id, type, coordinates) => {
    let feature = featureVectorSource.getFeatureById(id);
    coordinates = coordinates.map((coord) => {
      return olProj.transform(coord, "EPSG:4326", props.mapSettings.projection);
    });
    let geom;
    switch (type) {
      case "Point":
        geom = new Point(coordinates[0]);
        break;
      case "LineString":
        geom = new LineString(coordinates);
        break;
      case "Polygon":
        coordinates = [...coordinates, coordinates[0]];
        geom = new Polygon([coordinates]);
        break;
    }
    feature.setGeometry(geom);
    feature.setProperties({ type: type });
  };

  const updateFeatureName = (id, name) => {
    let feature = featureVectorSource.getFeatureById(id);
    feature.setProperties({ name: name });
  };

  const addNewFeature = (id) => {
    let feature = new Feature();
    feature.setId(id);
    featureVectorSource.addFeature(feature);
  };

  const removeFeatures = (featureIds) => {
    let toRemove;
    if (featureIds === "all") {
      toRemove = featureVectorSource.getFeatures();
    } else {
      toRemove = featureIds.map((id) => {
        return featureVectorSource.getFeatureById(id);
      });
    }
    featureVectorSource.removeFeatures(toRemove);
  };

  const splitPolyFeatures = (featureId) => {
    let features = featureVectorSource.getFeatures();
    let toSplit = featureVectorSource.getFeatureById(featureId);
    let idx = features.indexOf(toSplit);
    let coordinates = toSplit.getGeometry().getCoordinates();
    if (toSplit.get("type") === "Polygon") {
      coordinates = coordinates[0];
      coordinates.pop();
    }
    let newFeatures = coordinates.map((coords) => {
      let newFeature = new Feature({ geometry: new Point(coords) });
      newFeature.setId("id" + Math.random().toString(16).slice(2));
      newFeature.setProperties({ type: "Point" });
      return newFeature;
    });
    features.splice(idx, 1, ...newFeatures);

    featureVectorSource.clear();
    featureVectorSource.addFeatures(features);
    select0.getFeatures().clear();
    for (let feature of newFeatures) {
      select0.getFeatures().push(feature);
      if (props.compareDatasets) {
        select1.getFeatures().push(feature);
      }
    }
    let ids = newFeatures.map((feature) => feature.getId());
    props.action("selectedFeatureIds", ids);
  };

  const combinePointFeatures = (featureIds) => {
    let features = featureVectorSource.getFeatures();
    let toCombine = featureIds.map((id) => {
      return featureVectorSource.getFeatureById(id);
    });
    let coordinates = toCombine.map((feature) =>
      feature.getGeometry().getCoordinates()
    );

    let idx = features.reduce(
      (result, feat, idx) =>
        featureIds.includes(feat.getId()) ? result.concat(idx) : result,
      []
    );
    idx.sort();

    let newFeature = new Feature({ geometry: new LineString(coordinates) });
    newFeature.setId("id" + Math.random().toString(16).slice(2));
    newFeature.setProperties({ type: "LineString" });
    features.splice(idx[0], 1, newFeature);
    features = features.filter(
      (feature) => !featureIds.includes(feature.getId())
    );
    featureVectorSource.clear();
    featureVectorSource.addFeatures(features);
    select0.getFeatures().clear();
    select0.getFeatures().push(newFeature);
    if (props.compareDatasets) {
      select1.getFeatures().clear();
      select1.getFeatures().push(newFeature);
    }
    props.action("selectedFeatureIds", [newFeature.getId()]);
  };

  const loadFeatures = (featureType, featureId) => {
    let url = "";
    let extent = mapView.calculateExtent(map0.getSize());
    let resolution = mapView.getResolution();
    switch (featureType) {
      case "observation_points":
        url = `/api/v2.0/observation/point/` + `${featureId}.json`;
        break;
      case "observation_tracks":
        url = `/api/v2.0/observation/track/` + `${featureId}.json`;
        break;
      case "class4":
        url =
          `/api/v2.0/class4` +
          `/${props.class4Type}` +
          `?projection=${props.mapSettings.projection}` +
          `&resolution=${Math.round(resolution)}` +
          `&extent=${extent.map(function (i) {
            return Math.round(i);
          })}` +
          `&id=${featureId}`;
        break;
      case "point":
      case "line":
        url =
          `/api/v2.0/kml/${featureType}` +
          `/${featureId}` +
          `?projection=${props.mapSettings.projection}` +
          `&view_bounds=${extent.map(function (i) {
            return Math.round(i);
          })}`;
        break;
      case "area":
        url =
          `/api/v2.0/kml/${featureType}` +
          `/${featureId}` +
          `?projection=${props.mapSettings.projection}` +
          `&resolution=${Math.round(resolution)}` +
          `&view_bounds=${extent.map(function (i) {
            return Math.round(i);
          })}`;
        break;
      default:
        url =
          `/api/v2.0/${props.featureType}` +
          `/${props.mapSettings.projection}` +
          `/${Math.round(resolution)}` +
          `/${extent.map(function (i) {
            return Math.round(i);
          })}` +
          `/${featureId}.json`;
        break;
    }
    axios
      .get(url)
      .then((response) => {
        var features = new GeoJSON().readFeatures(response.data, {
          featureProjection: props.mapSettings.projection,
        });
        var featToAdd = [];
        for (let feat of features) {
          if ("observation" == feat.get("class")) {
            featToAdd.push(feat);
          } else {
            var id = feat.get("name");
            feat.setId(id);
            if (feat.get("error") != null) {
              feat.set(
                "name",
                feat.get("name") +
                  "<span>" +
                  "RMS Error: " +
                  feat.get("error").toPrecision(3) +
                  "</span>"
              );
            }
            if (id) {
              var oldfeat = featureVectorSource.getFeatureById(id);
              if (
                oldfeat != null &&
                oldfeat.get("resolution") > feat.get("resolution")
              ) {
                oldfeat.setGeometry(feat.getGeometry());
                oldfeat.set("resolution", feat.get("resolution"));
              } else {
                featToAdd.push(feat);
              }
            } else {
              featToAdd.push(feat);
            }
          }
        }
        featureVectorSource.addFeatures(featToAdd);
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const resetMap = () => {
    removeMapInteractions(map0, "all");
    if (props.compareDatasets) {
      removeMapInteractions(map1, "all");
    }
    let map0Layers = map0.getLayers().getArray();

    let newFeatureVectorSource = new VectorSource({
      features: [],
      strategy: olLoadingstrategy.bbox,
      format: new GeoJSON(),
    });
    map0Layers[5].setSource(newFeatureVectorSource);
    setFeatureVectorSource(newFeatureVectorSource);

    let newObsDrawSource = new VectorSource({
      features: [],
    });
    map0Layers[6].setSource(newObsDrawSource);
    setObsDrawSource(newObsDrawSource);

    if (props.compareDatasets) {
      let map1layers = map1.getLayers().getArray();
      map1layers[5].setSource(newFeatureVectorSource);
      map1layers[6].setSource(newObsDrawSource);
    }
    clearAnnotationLabels();
  };

  const drawObsPoint = () => {
    if (removeMapInteractions(map0, "Point")) {
      hoverSelect0.setActive(true);
      return;
    }
    hoverSelect0.setActive(false);

    resetMap();
    let newDrawAction = obsPointDrawAction(
      map0,
      obsDrawSource,
      props.mapSettings.projection,
      props.action
    );
    map0.addInteraction(newDrawAction);
    //event listener to re-enable hover when drawing ends
    newDrawAction.on("drawend", () => {
      hoverSelect0.setActive(true);
    });
  };

  const drawObsArea = () => {
    if (removeMapInteractions(map0, "Polygon")) {
      hoverSelect0.setActive(true);
      return;
    }
    hoverSelect0.setActive(false);

    resetMap();
    let newDrawAction = obsAreaDrawAction(
      map0,
      obsDrawSource,
      props.mapSettings.projection,
      props.action
    );
    map0.addInteraction(newDrawAction);
    newDrawAction.on("drawend", () => {
      hoverSelect0.setActive(true);
    });
  };

  const startFeatureDraw = () => {
    let source = map0.getLayers().getArray()[5].getSource();
    let newDrawAction0 = getDrawAction(source, props.featureType);
    hoverSelect0.setActive(false);
    map0.addInteraction(newDrawAction0);
    let newActions = { map0: newDrawAction0, map1: null };
    if (props.compareDatasets && map1) {
      let newDrawAction1 = getDrawAction(source, props.featureType);

      if (hoverSelect1 && hoverSelect1.setActive) {
        hoverSelect1.setActive(false);
      }
      map1.addInteraction(newDrawAction1);
      newActions.map1 = newDrawAction1;
    }
    setDrawActions(newActions);
  };

  const stopFeatureDraw = () => {
    removeMapInteractions(map0);
    if (props.compareDatasets) {
      removeMapInteractions(map1);
    }
    hoverSelect0.setActive(true);
    if (props.compareDatasets && hoverSelect1) {
      hoverSelect1.setActive(true);
    }
  };

  const addAnnotationLabel = (text) => {
    const coord = mapView.getCenter();
    let overlay = new AnnotationOverlay(text, coord);
    map0.addOverlay(overlay);
    setAnnotationOverlays((prev) => [...prev, overlay]);
    if (props.compareDatasets && map1) {
      overlay.linkOverlay(map1);
    }
  };

  const undoAnnotationLabel = () => {
    if (annotationOverlays.length > 0) {
      const lastOverlay = annotationOverlays[annotationOverlays.length - 1];

      if (map0) {
        map0.removeOverlay(lastOverlay);
      }

      if (lastOverlay.linkedOverlay && map1) {
        map1.removeOverlay(lastOverlay.linkedOverlay);
      }

      setAnnotationOverlays((prev) => prev.slice(0, -1));
    }
  };

  const clearAnnotationLabels = () => {
    annotationOverlays.forEach((overlay) => {
      if (map0) {
        map0.removeOverlay(overlay);
      }
      if (overlay.linkedOverlay && map1) {
        map1.removeOverlay(overlay.linkedOverlay);
      }
    });

    setAnnotationOverlays([]);
  };

  const updateProjection = (map, dataset) => {
    resetMap();

    let mapLayers = map.getLayers().getArray();

    let layerDataIdx = props.mapSettings.basemap === "chs" ? 0 : 1;

    const dataSource = mapLayers[layerDataIdx].getSource();
    const dataProps = dataSource.getProperties();
    const newProps = {
      ...dataProps,
      ...getDataSource(dataset, props.mapSettings),
    };
    const newSource = new XYZ(newProps);

    mapLayers[layerDataIdx].setSource(newSource);
    newSource.refresh();

    const newLayerBasemap = getBasemap(
      props.mapSettings.basemap,
      props.mapSettings.projection,
      props.mapSettings.basemap_attribution,
      props.mapSettings.topoShadedRelief
    );
    map.getLayers().setAt(0, newLayerBasemap);
    if (map === map0) {
      setLayerBasemap(newLayerBasemap);
    }

    let center = DEF_CENTER[props.mapSettings.projection];
    if (props.dataset0.default_location) {
      center = props.dataset0.default_location;
    }

    const newMapView = createMapView(
      center,
      props.mapSettings.projection,
      DEF_ZOOM[props.mapSettings.projection],
      MIN_ZOOM[props.mapSettings.projection],
      MAX_ZOOM[props.mapSettings.projection]
    );

    map.setView(newMapView);
    if (map === map0) {
      setMapView(newMapView);
    }

    const vectorTileGrid = new olTilegrid.createXYZ({
      tileSize: 256,
      maxZoom: MAX_ZOOM[props.mapSettings.projection],
    });

    mapLayers[2].setSource(
      new VectorTile({
        format: new MVT(),
        tileGrid: vectorTileGrid,
        tilePixelRatio: 8,
        url: `/api/v2.0/mbt/lands/{z}/{x}/{y}?projection=${props.mapSettings.projection}`,
        projection: props.mapSettings.projection,
      })
    );

    mapLayers[4].setSource(
      new VectorTile({
        format: new MVT(),
        tileGrid: vectorTileGrid,
        tilePixelRatio: 8,
        url: `/api/v2.0/mbt/bath/{z}/{x}/{y}?projection=${props.mapSettings.projection}`,
        projection: props.mapSettings.projection,
      })
    );

    let bathySource = null;
    switch (props.mapSettings.bathyContour) {
      case "etopo1":
      default:
        bathySource = new XYZ({
          url: `/api/v2.0/tiles/bath/{z}/{x}/{y}?projection=${props.mapSettings.projection}`,
          projection: props.mapSettings.projection,
        });
        break;
    }

    mapLayers[3].setSource(bathySource);

    featureVectorSource.refresh();

    if (mapLayers[7].getSource()) {
      mapLayers[7].setSource(getQuiverSource(dataset, props.mapSettings));
    }
  };

  const addDblClickPlot = (map, select) => {
    map.on("dblclick", (e) => {
      const feature = map.forEachFeatureAtPixel(
        map.getEventPixel(e.originalEvent),
        function (feature, layer) {
          return feature;
        }
      );
      let selected = select.getFeatures().getArray();
      if (selected.includes(feature)) {
        props.action("plot");
      }
    });
  };

  const updateBasemap = (map) => {
    let mapLayers = map.getLayers().getArray();

    const newLayerBasemap = getBasemap(
      props.mapSettings.basemap,
      props.mapSettings.projection,
      props.mapSettings.basemap_attribution,
      props.mapSettings.topoShadedRelief
    );
    map.getLayers().setAt(0, newLayerBasemap);
    if (map === map0) {
      setLayerBasemap(newLayerBasemap);
    }

    if (props.mapSettings.basemap === "chs") {
      mapLayers[2].setSource(null);
      mapLayers[4].setSource(null);
    } else {
      const vectorTileGrid = new olTilegrid.createXYZ({
        tileSize: 256,
        maxZoom: MAX_ZOOM[props.mapSettings.projection],
      });

      mapLayers[4].setSource(
        new VectorTile({
          format: new MVT(),
          tileGrid: vectorTileGrid,
          tilePixelRatio: 8,
          url: `/api/v2.0/mbt/lands/{z}/{x}/{y}?projection=${props.mapSettings.projection}`,
          projection: props.mapSettings.projection,
        })
      );

      mapLayers[2].setSource(
        new VectorTile({
          format: new MVT(),
          tileGrid: vectorTileGrid,
          url: `/api/v2.0/mbt/bath/{z}/{x}/{y}?projection=${props.mapSettings.projection}`,
          projection: props.mapSettings.projection,
        })
      );
    }
  };

  const updateInterpolation = (map, dataset) => {
    let mapLayers = map.getLayers().getArray();

    let layerDataIdx = props.mapSettings.basemap === "chs" ? 0 : 1;

    const dataSource = mapLayers[layerDataIdx].getSource();
    const dataProps = dataSource.getProperties();
    const newProps = {
      ...dataProps,
      ...getDataSource(dataset, props.mapSettings),
    };
    const newSource = new XYZ(newProps);

    mapLayers[layerDataIdx].setSource(newSource);
    newSource.refresh();
  };

  const updateBathy = (map) => {
    let mapLayers = map.getLayers().getArray();

    const newLayerBasemap = getBasemap(
      props.mapSettings.basemap,
      props.mapSettings.projection,
      props.mapSettings.basemap_attribution,
      props.mapSettings.topoShadedRelief
    );
    map.getLayers().setAt(0, newLayerBasemap);
    if (map === map0) {
      setLayerBasemap(newLayerBasemap);
    }

    mapLayers[3].setVisible(props.mapSettings.bathymetry);
    mapLayers[3].setOpacity(props.mapSettings.mapBathymetryOpacity);

    mapLayers[4].setVisible(props.mapSettings.bathymetry);
    mapLayers[4].setOpacity(props.mapSettings.mapBathymetryOpacity);
  };

  if (map0) {
    if (props.mapSettings.basemap === "chs") {
      layerBasemap.setZIndex(1);
      layerData0.setZIndex(0);
    } else {
      layerBasemap.setZIndex(0);
      layerData0.setZIndex(1);
    }
  }

  layerData0.setVisible(!props.mapSettings.hideDataLayer);
  layerData1.setVisible(!props.mapSettings.hideDataLayer);

  return (
    <div className="map-container">
      <div className="title ol-popup" ref={popupElement0} />
      <div className="title ol-popup" ref={popupElement1} />
      <div
        style={{
          height: "100vh",
          width: props.compareDatasets ? "calc(50% - 1px)" : "100%",
        }}
        ref={mapRef0}
        id="map0"
        className="map-container map"
      />

      {props.compareDatasets ? (
        <div
          style={{ height: "100vh", width: "calc(50% - 1px)" }}
          ref={mapRef1}
          id="map1"
          className="map-container map"
        />
      ) : null}
    </div>
  );
});

export default Map;
