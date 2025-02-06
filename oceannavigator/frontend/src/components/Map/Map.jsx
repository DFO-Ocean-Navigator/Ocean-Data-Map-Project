import React, {
  forwardRef,
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
} from "react";
import axios from "axios";
import proj4 from "proj4";
import View from "ol/View.js";
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
import * as olLoadingstrategy from "ol/loadingstrategy";
import * as olProj from "ol/proj";
import * as olProj4 from "ol/proj/proj4";
import * as olTilegrid from "ol/tilegrid";

import {
  createMap,
  getDataSource,
  getQuiverSource,
  removeMapInteractions,
} from "./utils";
import {
  getDrawAction,
  getLineDistance,
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

const Map = forwardRef((props, ref) => {
  //TODO clean up state (do  we need to save layers?)
  const [map0, setMap0] = useState();
  const [map1, setMap1] = useState();
  const [mapView, setMapView] = useState();
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
  const [layerVector, setLayerVector] = useState();
  const [vectorSource, setVectorSource] = useState();
  const [layerObsDraw, setLayerObsDraw] = useState();
  const [obsDrawSource, setObsDrawSource] = useState();
  const [layerQuiver, setLayerQuiver] = useState();
  const [drawAction, setDrawAction] = useState();
  const mapRef0 = useRef();
  const mapRef1 = useRef();
  const popupElement0 = useRef(null);
  const popupElement1 = useRef(null);

  useImperativeHandle(ref, () => ({
    startDrawing: startDrawing,
    stopDrawing: stopDrawing,
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
    getLineDistance: getLineDistance,
  }));

  useEffect(() => {
    let overlay = new Overlay({
      element: popupElement0.current,
      autoPan: false,
      offset: [0, -10],
      positioning: "bottom-center",
    });

    let projection = props.mapSettings.projection;
    const newMapView = createMapView(DEF_CENTER[projection], projection, 4);

    let newVectorSource = new VectorSource({
      features: [],
      strategy: olLoadingstrategy.bbox,
      format: new GeoJSON(),
    });

    const newObsDrawSource = new VectorSource({
      features: [],
    });

    const newMap = createMap(
      props.mapSettings,
      overlay,
      popupElement0,
      newMapView,
      layerData0,
      newVectorSource,
      newObsDrawSource,
      MAX_ZOOM[props.mapSettings.projection],
      mapRef0
    );

    const newSelect = createSelect();
    newMap.addInteraction(newSelect);

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

    addDblClickPlot(newMap, newSelect);

    let mapLayers = newMap.getLayers().getArray();

    setMap0(newMap);
    setMapView(newMapView);
    setSelect0(newSelect);
    setLayerBasemap(mapLayers[0]);
    setLayerVector(mapLayers[5]);
    setVectorSource(newVectorSource);
    setLayerObsDraw(mapLayers[6]);
    setObsDrawSource(newObsDrawSource);
    setLayerQuiver(mapLayers[7]);
  }, []);

  useEffect(() => {
    let newMap = null;
    if (props.compareDatasets) {
      let overlay = new Overlay({
        element: popupElement1.current,
        autoPan: false,
        offset: [0, -10],
        positioning: "bottom-center",
      });

      newMap = createMap(
        props.mapSettings,
        overlay,
        popupElement1,
        mapView,
        layerData1,
        vectorSource,
        obsDrawSource,
        MAX_ZOOM[props.mapSettings.projection],
        mapRef1
      );

      let newSelect = createSelect();
      newMap.addInteraction(newSelect);

      addDblClickPlot(newMap, newSelect);

      setSelect1(newSelect);
    }
    setMap1(newMap);
  }, [props.compareDatasets]);

  useEffect(() => {
    if (props.dataset0.default_location) {
      const newCenter = [
        props.dataset0.default_location[0],
        props.dataset0.default_location[1],
      ];
      const newZoom = props.dataset0.default_location[2];
      const newMapView = createMapView(newCenter, "EPSG:3857", newZoom);
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
      const newMapView = createMapView(newCenter, "EPSG:3857", newZoom);
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
    if (layerQuiver) {
      let source = null;
      if (props.dataset0.quiverVariable.toLowerCase() !== "none") {
        source = getQuiverSource(props.dataset0, props.mapSettings);
      }
      layerQuiver.setSource(source);
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
    if (drawAction) {
      let source = map0.getLayers().getArray()[5].getSource();
      let newDrawAction = getDrawAction(source, props.featureType);

      removeMapInteractions(map0, "all");
      map0.addInteraction(newDrawAction);
      if (props.compareDatasets) {
        removeMapInteractions(map1, "all");
        map1.addInteraction(drawAction);
      }
      setDrawAction(newDrawAction);
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

  const createMapView = (center, projection, zoom) => {
    const newMapView = new View({
      center: olProj.transform(center, "EPSG:4326", projection),
      projection: projection,
      zoom: zoom,
      maxZoom: MAX_ZOOM[projection],
      minZoom: MIN_ZOOM[projection],
    });

    return newMapView;
  };

  const createSelect = () => {
    const newSelect = new Select({
      style: function (feat, res) {
        return new Style({
          stroke: new Stroke({
            color: "#0099ff",
            width: 4,
          }),
          image: new Circle({
            radius: 4,
            fill: new Fill({
              color: "#0099ff",
            }),
            stroke: new Stroke({
              color: "#ffffff",
              width: 1,
            }),
          }),
        });
      },
    });

    newSelect.on("select", function (e) {
      let selectedFeatures = this.getFeatures();

      if (selectedFeatures.getLength() > 1) {
        let newSelectedFeatures = [...selectedFeatures.getArray()];
        newSelectedFeatures = newSelectedFeatures.filter((feature) => {
          return feature.get("type") === "Point";
        });
        this.getFeatures().clear();
        for (let feature of newSelectedFeatures) {
          this.getFeatures().push(feature);
        }
      }
      let ids = this.getFeatures().map((feature) => feature.id);
      props.action("selectedFeatureIds", ids);
    });

    return newSelect;
  };

  const getFeatures = () => {
    let selectedFeatures = select0
      .getFeatures()
      .getArray()
      .map((feature) => {
        return feature.getId();
      });

    let features = vectorSource.getFeatures();
    features = features.filter(
      (feature) => feature.get("class") !== "observation"
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
    let type, id, coordinates, observation;
    if (selected.length > 0) {
      if (selected[0].get("class") === "observation") {
        type = selected[0].getGeometry().constructor.name;
        type = type === "LineString" ? "track" : type;
        id = selected[0].get("id");
        observation = true;
      } else {
        type = selected[0].get("type");
      }
      if (type === "class4") {
        id = selected[0].get("id").replace("/", "_");
      }
      coordinates = selected.map((feature) =>
        feature.getGeometry().getCoordinates()
      );
      if (type === "LineString") {
        coordinates = coordinates[0];
      } else if (type === "Polygon") {
        coordinates = coordinates[0][0];
      }
      coordinates = coordinates.map((coordinate) => {
        coordinate = olProj.transform(
          coordinate,
          props.mapSettings.projection,
          "EPSG:4326"
        );
        // switch to lat lon order
        return [coordinate[1], coordinate[0]];
      });
    }
    return {
      type: type,
      coordinates: coordinates,
      id: id,
      observation: observation,
    };
  };

  const selectFeatures = (selectedIds) => {
    select0.getFeatures().clear();
    let features = selectedIds.map((id) => {
      return vectorSource.getFeatureById(id);
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
    let features = vectorSource.getFeatures();
    features = features.filter(
      (feature) => feature.get("class") !== "observation"
    );
    if (features.length > 0) {
      vectorSource.removeFeatures([features[features.length - 1]]);
    }
  };

  const updateFeatureGeometry = (id, type, coordinates) => {
    let feature = vectorSource.getFeatureById(id);
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
    let feature = vectorSource.getFeatureById(id);
    feature.setProperties({ name: name });
  };

  const addNewFeature = (id) => {
    let feature = new Feature();
    feature.setId(id);
    vectorSource.addFeature(feature);
  };

  const removeFeatures = (featureIds) => {
    let toRemove;
    if (featureIds === "all") {
      toRemove = vectorSource.getFeatures();
    } else {
      toRemove = featureIds.map((id) => {
        return vectorSource.getFeatureById(id);
      });
    }
    vectorSource.removeFeatures(toRemove);
  };

  const splitPolyFeatures = (featureId) => {
    let features = vectorSource.getFeatures();
    let toSplit = vectorSource.getFeatureById(featureId);
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

    vectorSource.clear();
    vectorSource.addFeatures(features);
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
    let features = vectorSource.getFeatures();
    let toCombine = featureIds.map((id) => {
      return vectorSource.getFeatureById(id);
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
    vectorSource.clear();
    vectorSource.addFeatures(features);
    select0.getFeatures().push(newFeature);
    if (props.compareDatasets) {
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
              var oldfeat = vectorSource.getFeatureById(id);
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
        vectorSource.addFeatures(featToAdd);
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

    let newVectorSource = new VectorSource({
      features: [],
      strategy: olLoadingstrategy.bbox,
      format: new GeoJSON(),
    });
    layerVector.setSource(newVectorSource);
    setVectorSource(newVectorSource);

    let newObsDrawSource = new VectorSource({
      features: [],
    });
    layerObsDraw.setSource(newObsDrawSource);
    setObsDrawSource(newObsDrawSource);

    if (props.compareDatasets) {
      let map1layers = map1.getLayers().getArray();
      map1layers[5].setSource(newVectorSource);
      map1layers[6].setSource(newObsDrawSource);
    }
  };

  const drawObsPoint = () => {
    if (removeMapInteractions(map0, "Point")) {
      return;
    }

    //Resets map (in case other plots have been drawn)
    resetMap();
    let newDrawAction = obsPointDrawAction(
      map0,
      obsDrawSource,
      props.mapSettings.projection,
      props.action
    );
    map0.addInteraction(newDrawAction);
  };

  const drawObsArea = () => {
    if (removeMapInteractions(map0, "Polygon")) {
      return;
    }

    resetMap();
    let newDrawAction = obsAreaDrawAction(
      map0,
      obsDrawSource,
      props.mapSettings.projection,
      props.action
    );
    map0.addInteraction(newDrawAction);
  };

  const startDrawing = () => {
    let source = map0.getLayers().getArray()[5].getSource();
    let newDrawAction = getDrawAction(source, props.featureType);

    map0.addInteraction(newDrawAction);
    if (props.compareDatasets) {
      map1.addInteraction(newDrawAction);
    }
    setDrawAction(newDrawAction);
  };

  const stopDrawing = () => {
    removeMapInteractions(map0);
    if (props.compareDatasets) {
      removeMapInteractions(map1);
    }
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
      props.mapSettings.basemap_attribution
    );
    map.getLayers().setAt(0, newLayerBasemap);
    if (map === map0) {
      setLayerBasemap(newLayerBasemap);
    }

    let center = DEF_CENTER[props.mapSettings.projection];
    if (props.dataset0.default_location) {
      center = props.dataset0.default_location;
    }

    const newMapView = new View({
      projection: props.mapSettings.projection,
      center: olProj.transform(
        center,
        "EPSG:4326",
        props.mapSettings.projection
      ),
      zoom: DEF_ZOOM[props.mapSettings.projection],
      minZoom: MIN_ZOOM[props.mapSettings.projection],
      maxZoom: MAX_ZOOM[props.mapSettings.projection],
    });

    map.setView(newMapView);
    if (map === map0) {
      setMapView(newMapView);
    }

    const vectorTileGrid = new olTilegrid.createXYZ({
      tileSize: 512,
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

    vectorSource.refresh();

    if (mapLayers[7].getSource()) {
      mapLayers[7].setSource(getQuiverSource(dataset));
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
      props.mapSettings.basemap_attribution
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
        tileSize: 512,
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
          tilePixelRatio: 8,
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
      props.mapSettings.basemap_attribution
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
