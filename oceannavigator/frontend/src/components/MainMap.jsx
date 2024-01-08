import React, {
  forwardRef,
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
} from "react";
import { renderToString } from "react-dom/server";
import axios from "axios";
import proj4 from "proj4";
import { Map, View } from "ol";
import Feature from "ol/Feature.js";
import TileLayer from "ol/layer/Tile";
import Overlay from "ol/Overlay.js";
import {
  Style,
  Circle,
  Icon,
  Stroke,
  Fill,
  Text,
  RegularShape,
} from "ol/style";
import VectorTile from "ol/source/VectorTile";
import VectorTileLayer from "ol/layer/VectorTile.js";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector.js";
import GeoJSON from "ol/format/GeoJSON.js";
import MVT from "ol/format/MVT.js";
import XYZ from "ol/source/XYZ";
import TileWMS from "ol/source/TileWMS";
import Draw from "ol/interaction/Draw";
import { defaults as defaultControls } from "ol/control/defaults";
import MousePosition from "ol/control/MousePosition.js";
import Graticule from "ol/layer/Graticule.js";
import * as olExtent from "ol/extent";
import * as olinteraction from "ol/interaction";
import * as olcondition from "ol/events/condition";
import * as olgeom from "ol/geom";
import * as olLoadingstrategy from "ol/loadingstrategy";
import * as olProj from "ol/proj";
import * as olProj4 from "ol/proj/proj4";
import * as olTilegrid from "ol/tilegrid";
import { isMobile } from "react-device-detect";

import "ol/ol.css";

// CHS S111 standard arrows for quiver layer
const I0 = require("../images/s111/I0.svg").default; // lgtm [js/unused-local-variable]
const I1 = require("../images/s111/I1.svg").default;
const I2 = require("../images/s111/I2.svg").default;
const I3 = require("../images/s111/I3.svg").default;
const I4 = require("../images/s111/I4.svg").default;
const I5 = require("../images/s111/I5.svg").default;
const I6 = require("../images/s111/I6.svg").default;
const I7 = require("../images/s111/I7.svg").default;
const I8 = require("../images/s111/I8.svg").default;
const I9 = require("../images/s111/I9.svg").default;

const arrowImages = [I0, I1, I2, I3, I4, I5, I6, I7, I8, I9];

function deg2rad(deg) {
  return (deg * Math.PI) / 180.0;
}

const COLORS = [
  [0, 0, 255],
  [0, 128, 0],
  [255, 0, 0],
  [0, 255, 255],
  [255, 0, 255],
  [255, 255, 0],
  [0, 0, 0],
  [255, 255, 255],
];

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

var drifter_color = {};

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

const MainMap = forwardRef((props, ref) => {
  const [map0, setMap0] = useState();
  const [map1, setMap1] = useState();
  const [mapView, setMapView] = useState();
  const [select0, setSelect0] = useState();
  const [select1, setSelect1] = useState();
  const [layerBasemap, setLayerBasemap] = useState();
  const [layerData0, setLayerData0] = useState(
    new TileLayer({
      preload: 1,
    })
  );
  const [layerData1, setLayerData1] = useState(
    new TileLayer({
      preload: 1,
    })
  );
  const [layerLandShapes, setLayerLandShapes] = useState();
  const [layerBath, setLayerBath] = useState();
  const [layerBathShapes, setLayerBathShapes] = useState();
  const [layerVector, setLayerVector] = useState();
  const [vectorSource, setVectorSource] = useState();
  const [layerObsDraw, setLayerObsDraw] = useState();
  const [obsDrawSource, setObsDrawSource] = useState();
  const [layerQuiver, setLayerQuiver] = useState();
  const mapRef0 = useRef();
  const mapRef1 = useRef();
  const popupElement0 = useRef(null);
  const popupElement1 = useRef(null);

  useImperativeHandle(ref, () => ({
    startDrawing: draw,
    stopDrawing: stopDrawing,
    show: show,
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
    const newMapView = createMapView(DEF_CENTER[projection], projection, 4);

    let newVectorSource = new VectorSource({
      features: [],
      strategy: olLoadingstrategy.bbox,
      format: new GeoJSON(),
      loader: loader,
    });

    const newObsDrawSource = new VectorSource({
      features: [],
    });

    const newMap = createMap(
      overlay,
      popupElement0,
      newMapView,
      layerData0,
      newVectorSource,
      newObsDrawSource,
      mapRef0
    );

    // let newSelect = createSelect();
    const newSelect = new olinteraction.Select({
      style: function (feat, res) {
        if (feat.get("type") != "area") {
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
        }
      },
    });

    newSelect.on("select", function (e) {
      let selectedFeatures = this.getFeatures();
      if (
        e.selected.length > 0 &&
        (e.selected[0].line || e.selected[0].drifter)
      ) {
        selectedFeatures.clear();
        selectedFeatures.push(e.selected[0]);
      }
      if (e.selected.length == 0) {
        props.updateState("plotEnabled", true);
        props.action("point", props.vectorCoordinates);
      }
      pushSelection(selectedFeatures);

      if (e.selected[0].get("type") == "area") {
        selectedFeatures.clear();
      }
    });
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

    let mapLayers = newMap.getLayers().getArray();

    setMap0(newMap);
    setMapView(newMapView);
    setSelect0(newSelect);
    setLayerBasemap(mapLayers[0]);
    setLayerLandShapes(mapLayers[2]);
    setLayerBath(mapLayers[3]);
    setLayerBathShapes(mapLayers[4]);
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
        overlay,
        popupElement1,
        mapView,
        layerData1,
        vectorSource,
        obsDrawSource,
        mapRef1
      );

      let newSelect = createSelect();
      newMap.addInteraction(newSelect);

      setSelect1(newSelect);
      drawPoints(vectorSource);
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
      layerData0.setSource(new XYZ(getDataSource(props.dataset0)));
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
      layerData1.setSource(new XYZ(getDataSource(props.dataset1)));
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
        source = getQuiverSource(props.dataset0);
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
        source = getQuiverSource(props.dataset1);
      }
      quiverLayer.setSource(source);
    }
  }, [
    props.dataset1.id,
    props.dataset1.quiverVariable,
    props.dataset1.quiverDensity,
  ]);

  useEffect(() => {
    if (vectorSource) {
      vectorSource.clear();
      drawPoints(vectorSource);
      updateSelectFilter(select0);
      if (props.compareDatasets) {
        updateSelectFilter(select1);
      }
    }
  }, [props.vectorCoordinates, props.vectorType, layerVector]);

  useEffect(() => {
    if (props.vectorId && props.vectorType) {
      vectorSource.clear();
      vectorSource.setLoader(loader);
      updateSelectFilter(select0);
      if (props.compareDatasets) {
        updateSelectFilter(select1);
      }
    }
  }, [props.vectorId, props.vectorType]);

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

  const createMap = (
    overlay,
    popupElement,
    newMapView,
    newLayerData,
    newVectorSource,
    newObsDrawSource,
    mapRef
  ) => {
    const newLayerBasemap = getBasemap(
      props.mapSettings.basemap,
      props.mapSettings.projection,
      props.mapSettings.basemap_attribution
    );

    const vectorTileGrid = new olTilegrid.createXYZ({
      tileSize: 512,
      maxZoom: MAX_ZOOM[props.mapSettings.projection],
    });

    const newLayerLandShapes = new VectorTileLayer({
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

    const newLayerBath = new TileLayer({
      source: new XYZ({
        url: `/api/v2.0/tiles/bath/{z}/{x}/{y}?projection=${props.mapSettings.projection}`,
        projection: props.mapSettings.projection,
      }),
      opacity: props.mapSettings.mapBathymetryOpacity,
      visible: props.mapSettings.bathymetry,
      preload: 1,
    });

    const newLayerBathShapes = new VectorTileLayer({
      opacity: props.mapSettings.mapBathymetryOpacity,
      visible: props.mapSettings.bathymetry,
      style: new Style({
        stroke: new Stroke({
          color: "rgba(0, 0, 0, 1)",
        }),
      }),
      source: new VectorTile({
        format: new MVT(),
        tileGrid: vectorTileGrid,
        tilePixelRatio: 8,
        url: `/api/v2.0/mbt/bath/{z}/{x}/{y}?projection=${props.mapSettings.projection}`,
        projection: props.mapSettings.projection,
      }),
    });

    const newLayerVector = new VectorLayer({
      source: newVectorSource,
      style: function (feat, res) {
        if (feat.get("class") == "observation") {
          if (feat.getGeometry() instanceof olgeom.LineString) {
            let color = drifter_color[feat.get("id")];

            if (color === undefined) {
              color = COLORS[Object.keys(drifter_color).length % COLORS.length];
              drifter_color[feat.get("id")] = color;
            }
            const styles = [
              new Style({
                stroke: new Stroke({
                  color: [color[0], color[1], color[2], 0.004],
                  width: 8,
                }),
              }),
              new Style({
                stroke: new Stroke({
                  color: color,
                  width: isMobile ? 4 : 2,
                }),
              }),
            ];

            return styles;
          }

          let image = new Circle({
            radius: isMobile ? 6 : 4,
            fill: new Fill({
              color: "#ff0000",
            }),
            stroke: new Stroke({
              color: "#000000",
              width: 1,
            }),
          });
          let stroke = new Stroke({ color: "#000000", width: 1 });
          let radius = isMobile ? 9 : 6;
          switch (feat.get("type")) {
            case "argo":
              image = new Circle({
                radius: isMobile ? 6 : 4,
                fill: new Fill({ color: "#ff0000" }),
                stroke: stroke,
              });
              break;
            case "mission":
              image = new RegularShape({
                points: 3,
                radius: radius,
                fill: new Fill({ color: "#ffff00" }),
                stroke: stroke,
              });
              break;
            case "drifter":
              image = new RegularShape({
                points: 4,
                radius: radius,
                fill: new Fill({ color: "#00ff00" }),
                stroke: stroke,
              });
              break;
            case "glider":
              image = new RegularShape({
                points: 5,
                radius: radius,
                fill: new Fill({ color: "#00ffff" }),
                stroke: stroke,
              });
              break;
            case "animal":
              image = new RegularShape({
                points: 6,
                radius: radius,
                fill: new Fill({ color: "#0000ff" }),
                stroke: stroke,
              });
              break;
          }
          return new Style({ image: image });
        } else {
          switch (feat.get("type")) {
            case "area":
              if (feat.get("key")) {
                return [
                  new Style({
                    stroke: new Stroke({
                      color: "#ffffff",
                      width: 2,
                    }),
                    fill: new Fill({
                      color: "#ffffff00",
                    }),
                  }),
                  new Style({
                    stroke: new Stroke({
                      color: "#000000",
                      width: 1,
                    }),
                  }),
                  new Style({
                    geometry: new olgeom.Point(
                      olProj.transform(
                        feat.get("centroid"),
                        "EPSG:4326",
                        props.mapSettings.projection
                      )
                    ),
                    text: new Text({
                      text: feat.get("name"),
                      font: "14px sans-serif",
                      fill: new Fill({
                        color: "#000",
                      }),
                      stroke: new Stroke({
                        color: "#ffffff",
                        width: 2,
                      }),
                    }),
                  }),
                ];
              } else {
                return [
                  new Style({
                    stroke: new Stroke({
                      color: "#ffffff",
                      width: 5,
                    }),
                  }),
                  new Style({
                    stroke: new Stroke({
                      color: "#ff0000",
                      width: 3,
                    }),
                  }),
                ];
              }
            case "line":
              return [
                new Style({
                  stroke: new Stroke({
                    color: "#ffffff",
                    width: 5,
                  }),
                }),
                new Style({
                  stroke: new Stroke({
                    color: "#ff0000",
                    width: 3,
                  }),
                }),
              ];
            case "point":
              return new Style({
                image: new Circle({
                  radius: 4,
                  fill: new Fill({
                    color: "#ff0000",
                  }),
                  stroke: new Stroke({
                    color: "#ffffff",
                    width: 2,
                  }),
                }),
              });
            case "GKHdrifter": {
              const start = feat.getGeometry().getCoordinateAt(0);
              const end = feat.getGeometry().getCoordinateAt(1);
              let endImage;
              let color = drifter_color[feat.get("name")];

              if (color === undefined) {
                color =
                  COLORS[Object.keys(drifter_color).length % COLORS.length];
                drifter_color[feat.get("name")] = color;
              }
              if (
                feat.get("status") == "inactive" ||
                feat.get("status") == "not responding"
              ) {
                endImage = new Icon({
                  src: X_IMAGE,
                  scale: 0.75,
                });
              } else {
                endImage = new Circle({
                  radius: isMobile ? 6 : 4,
                  fill: new Fill({
                    color: "#ff0000",
                  }),
                  stroke: new Stroke({
                    color: "#000000",
                    width: 1,
                  }),
                });
              }

              const styles = [
                new Style({
                  stroke: new Stroke({
                    color: [color[0], color[1], color[2], 0.004],
                    width: 8,
                  }),
                }),
                new Style({
                  stroke: new Stroke({
                    color: color,
                    width: isMobile ? 4 : 2,
                  }),
                }),
                new Style({
                  geometry: new olgeom.Point(end),
                  image: endImage,
                }),
                new Style({
                  geometry: new olgeom.Point(start),
                  image: new Circle({
                    radius: isMobile ? 6 : 4,
                    fill: new Fill({
                      color: "#008000",
                    }),
                    stroke: new Stroke({
                      color: "#000000",
                      width: 1,
                    }),
                  }),
                }),
              ];

              return styles;
            }

            case "class4": {
              const red = Math.min(255, 255 * (feat.get("error_norm") / 0.5));
              const green = Math.min(
                255,
                (255 * (1 - feat.get("error_norm"))) / 0.5
              );

              return new Style({
                image: new Circle({
                  radius: isMobile ? 6 : 4,
                  fill: new Fill({
                    color: [red, green, 0, 1],
                  }),
                  stroke: new Stroke({
                    color: "#000000",
                    width: 1,
                  }),
                }),
              });
            }
          }
        }
      },
    });

    const newLayerObsDraw = new VectorLayer({ source: newObsDrawSource });

    const anchor = [0.5, 0.5];
    const newLayerQuiver = new VectorTileLayer({
      source: null, // set source during update function below
      style: function (feature, resolution) {
        let scale = feature.get("scale");
        let rotation = null;
        if (!feature.get("bearing")) {
          // bearing-only variable (no magnitude)
          rotation = deg2rad(parseFloat(feature.get("data")));
        } else {
          rotation = deg2rad(parseFloat(feature.get("bearing")));
        }
        return new Style({
          image: new Icon({
            scale: 0.2 + (scale + 1) / 16,
            src: arrowImages[scale],
            opacity: 1,
            anchor: anchor,
            rotation: rotation,
          }),
        });
      },
    });

    let options = {
      view: newMapView,
      layers: [
        newLayerBasemap,
        newLayerData,
        newLayerLandShapes,
        newLayerBath,
        newLayerBathShapes,
        newLayerVector,
        newLayerObsDraw,
        newLayerQuiver,
      ],
      controls: defaultControls({
        zoom: true,
      }).extend([
        new MousePosition({
          projection: "EPSG:4326",
          coordinateFormat: function (c) {
            return (
              "<div>" + c[1].toFixed(4) + ", " + c[0].toFixed(4) + "</div>"
            );
          },
        }),
        new Graticule({
          strokeStyle: new Stroke({
            color: "rgba(128, 128, 128, 0.9)",
            lineDash: [0.5, 4],
          }),
        }),
      ]),

      overlays: [overlay],
    };

    let mapObject = new Map(options);
    mapObject.setTarget(mapRef.current);

    let selected = null;
    mapObject.on("pointermove", function (e) {
      if (selected !== null) {
        selected.setStyle(undefined);
        selected = null;
      }
      const feature = mapObject.forEachFeatureAtPixel(
        mapObject.getEventPixel(e.originalEvent),
        function (feature, layer) {
          return feature;
        }
      );
      if (feature && feature.get("name")) {
        overlay.setPosition(e.coordinate);
        if (feature.get("data")) {
          let bearing = feature.get("bearing");
          popupElement.current.innerHTML = renderToString(
            <table>
              <tr>
                <td>Variable</td>
                <td>{feature.get("name")}</td>
              </tr>
              <tr>
                <td>Data</td>
                <td>{feature.get("data")}</td>
              </tr>
              <tr>
                <td>Units</td>
                <td>{feature.get("units")}</td>
              </tr>
              {bearing && (
                <tr>
                  <td>Bearing (+ve deg clockwise N)</td>
                  <td>{bearing}</td>
                </tr>
              )}
            </table>
          );
        } else {
          popupElement.current.innerHTML = feature.get("name");
        }

        if (feature.get("type") == "area") {
          mapObject.forEachFeatureAtPixel(e.pixel, function (f) {
            selected = f;
            f.setStyle([
              new Style({
                stroke: new Stroke({
                  color: "#ffffff",
                  width: 2,
                }),
                fill: new Fill({
                  color: "#ffffff80",
                }),
              }),
              new Style({
                stroke: new Stroke({
                  color: "#000000",
                  width: 1,
                }),
              }),
              new Style({
                geometry: new olgeom.Point(
                  olProj.transform(
                    f.get("centroid"),
                    "EPSG:4326",
                    props.mapSettings.projection
                  )
                ),
                text: new Text({
                  text: f.get("name"),
                  font: "14px sans-serif",
                  fill: new Fill({
                    color: "#000000",
                  }),
                  stroke: new Stroke({
                    color: "#ffffff",
                    width: 2,
                  }),
                }),
              }),
            ]);
            return true;
          });
        }
      } else if (feature && feature.get("class") == "observation") {
        if (feature.get("meta")) {
          overlay.setPosition(e.coordinate);
          popupElement.current.innerHTML = feature.get("meta");
        } else {
          let type = "station";
          if (feature.getGeometry() instanceof olgeom.LineString) {
            type = "platform";
          }
          axios
            .get(
              `/api/v2.0/observation/meta/${type}/${feature.get("id")}}.json`
            )
            .then(function (response) {
              overlay.setPosition(e.coordinate);
              feature.set(
                "meta",
                renderToString(
                  <table>
                    {Object.keys(response.data).map((key) => (
                      <tr key={key}>
                        <td>{key}</td>
                        <td>{response.data[key]}</td>
                      </tr>
                    ))}
                  </table>
                )
              );
              popupElement.current.innerHTML = feature.get("meta");
            })
            .catch();
        }
      } else {
        overlay.setPosition(undefined);
      }
    });

    mapObject.on("pointermove", function (e) {
      var pixel = mapObject.getEventPixel(e.originalEvent);
      var hit = mapObject.hasFeatureAtPixel(pixel);
      mapObject.getViewport().style.cursor = hit ? "pointer" : "";
    });

    const dragBox = new olinteraction.DragBox({
      condition: olcondition.platformModifierKeyOnly,
    });
    mapObject.addInteraction(dragBox);

    newLayerBasemap.setZIndex(0);
    layerData0.setZIndex(1);
    newLayerLandShapes.setZIndex(2);
    newLayerBath.setZIndex(3);
    newLayerBathShapes.setZIndex(4);
    newLayerVector.setZIndex(5);
    newLayerObsDraw.setZIndex(6);
    newLayerQuiver.setZIndex(100);

    return mapObject;
  };

  const createSelect = () => {
    const newSelect = new olinteraction.Select({
      style: function (feat, res) {
        if (feat.get("type") != "area") {
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
        }
      },
    });

    newSelect.on("select", function (e) {
      let selectedFeatures = this.getFeatures();
      if (
        e.selected.length > 0 &&
        (e.selected[0].line || e.selected[0].drifter)
      ) {
        selectedFeatures.clear();
        selectedFeatures.push(e.selected[0]);
      }
      if (e.selected.length == 0) {
        props.updateState("plotEnabled", true);
        props.action("point", props.vectorCoordinates);
      }
      pushSelection(selectedFeatures);

      if (e.selected[0].get("type") == "area") {
        selectedFeatures.clear();
      }
    });

    return newSelect;
  };

  const loader = (extent, resolution, projection) => {
    if (props.vectorType && props.vectorId) {
      let url = "";
      switch (props.vectorType) {
        case "observation_points":
          url = `/api/v2.0/observation/point/` + `${props.vectorId}.json`;
          break;
        case "observation_tracks":
          url = `/api/v2.0/observation/track/` + `${props.vectorId}.json`;
          break;
        case "class4":
          url =
            `/api/v2.0/class4` +
            `/${props.class4Type}` +
            `?projection=${projection.getCode()}` +
            `&resolution=${Math.round(resolution)}` +
            `&extent=${extent.map(function (i) {
              return Math.round(i);
            })}` +
            `&id=${props.vectorId}`;
          break;
        case "point":
        case "line":
          url =
            `/api/v2.0/kml/${props.vectorType}` +
            `/${props.vectorId}` +
            `?projection=${projection.getCode()}` +
            `&view_bounds=${extent.map(function (i) {
              return Math.round(i);
            })}`;
          break;
        case "area":
          url =
            `/api/v2.0/kml/${props.vectorType}` +
            `/${props.vectorId}` +
            `?projection=${projection.getCode()}` +
            `&resolution=${Math.round(resolution)}` +
            `&view_bounds=${extent.map(function (i) {
              return Math.round(i);
            })}`;
          break;
        default:
          url =
            `/api/v2.0/${props.vectorType}` +
            `/${projection.getCode()}` +
            `/${Math.round(resolution)}` +
            `/${extent.map(function (i) {
              return Math.round(i);
            })}` +
            `/${props.vectorId}.json`;
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
    }
  };

  const resetMap = () => {
    removeMapInteractions(map0, "all");
    if (props.compareDatasets) {
      removeMapInteractions(map1, "all");
    }
    props.updateState(["vectorType", "vectorId", "names"], ["point", null, []]);
    props.action("clearPoints");

    let newVectorSource = new VectorSource({
      features: [],
      strategy: olLoadingstrategy.bbox,
      format: new GeoJSON(),
      loader: loader,
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

  const removeMapInteractions = (map, type) => {
    const interactions = map.getInteractions();
    const stat = {
      coll: interactions,
      ret: false,
    };
    interactions.forEach(function (e, i, a) {
      if (e instanceof olinteraction.Draw) {
        stat.coll.remove(e);
        if (e.get("type") === type) {
          stat.ret = true;
        }
      }
    }, stat);
    return stat.ret;
  };

  const show = (type, key) => {
    resetMap();
    props.updateState(["vectorId", "vectorType"], [key, type]);
  };

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
      case "ocean":
        return new TileLayer({
          preload: 1,
          source: new XYZ({
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}",
            projection: "EPSG:3857",
          }),
        });
      case "world":
        return new TileLayer({
          preload: 1,
          source: new XYZ({
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            projection: "EPSG:3857",
          }),
        });
      case "chs":
        return new TileLayer({
          source: new TileWMS({
            url: "https://gisp.dfo-mpo.gc.ca/arcgis/rest/services/CHS/ENC_MaritimeChartService/MapServer/exts/MaritimeChartService/WMSServer",
            params: {
              LAYERS: "1:1",
            },
            projection: "EPSG:3857",
          }),
        });
    }
  };

  const getDataSource = (dataset) => {
    let scale = dataset.variable_scale;
    if (Array.isArray(scale)) {
      scale = scale.join(",");
    }

    let dataSource = {};
    dataSource.url =
      "/api/v2.0/tiles" +
      `/${dataset.id}` +
      `/${dataset.variable}` +
      `/${dataset.time}` +
      `/${dataset.depth}` +
      "/{z}/{x}/{y}" +
      `?projection=${props.mapSettings.projection}` +
      `&scale=${scale}` +
      `&interp=${props.mapSettings.interpType}` +
      `&radius=${props.mapSettings.interpRadius}` +
      `&neighbours=${props.mapSettings.interpNeighbours}`;
    dataSource.projection = props.mapSettings.projection;

    return dataSource;
  };

  const getQuiverSource = (dataset) => {
    const quiverSource = new VectorTile({
      url:
        "/api/v2.0/tiles/quiver" +
        `/${dataset.id}` +
        `/${dataset.quiverVariable}` +
        `/${dataset.time}` +
        `/${dataset.depth}` +
        `/${dataset.quiverDensity}` +
        "/{z}/{x}/{y}" +
        `?projection=${props.mapSettings.projection}`,
      projection: props.mapSettings.projection,
      format: new GeoJSON({
        featureProjection: olProj.get("EPSG:3857"),
        dataProjection: olProj.get("EPSG:4326"),
      }),
    });

    return quiverSource;
  };

  const drawObsPoint = () => {
    if (removeMapInteractions(map0, "Point")) {
      return;
    }

    //Resets map (in case other plots have been drawn)
    resetMap();
    const draw = new olinteraction.Draw({
      source: obsDrawSource,
      type: "Point",
      stopClick: true,
    });
    draw.set("type", "Point");
    draw.on("drawend", function (e) {
      // Disable zooming when drawing
      const lonlat = olProj.transform(
        e.feature.getGeometry().getCoordinates(),
        props.mapSettings.projection,
        "EPSG:4326"
      );

      // Send area to Observation Selector
      obsDrawSource.clear();
      props.action("setObsArea", [[lonlat[1], lonlat[0]]]);

      map0.removeInteraction(draw);
    });
    map0.addInteraction(draw);
  };

  const drawObsArea = () => {
    if (removeMapInteractions(map0, "Polygon")) {
      return;
    }

    resetMap();
    const draw = new Draw({
      source: obsDrawSource,
      type: "Polygon",
      stopClick: true,
    });
    draw.set("type", "Polygon");
    draw.on("drawend", function (e) {
      // Disable zooming when drawing
      const points = e.feature
        .getGeometry()
        .getCoordinates()[0]
        .map(function (c) {
          const lonlat = olProj.transform(
            c,
            props.mapSettings.projection,
            "EPSG:4326"
          );
          return [lonlat[1], lonlat[0]];
        });
      // Send area to Observation Selector
      props.action("setObsArea", points);
      map0.removeInteraction(draw);
      setTimeout(function () {
        obsDrawSource.clear();
      }, 251);
    });
    map0.addInteraction(draw);
  };

  const draw = () => {
    const addDrawInteraction = (map) => {
      const drawAction = new Draw({
        source: vectorSource,
        type: "Point",
        stopClick: true,
      });

      drawAction.set("type", props.vectorType);
      drawAction.on("drawend", function (e) {
        // Disable zooming when drawing
        const latlon = olProj
          .transform(
            e.feature.getGeometry().getCoordinates(),
            props.mapSettings.projection,
            "EPSG:4326"
          )
          .reverse();
        // Draw point on map(s)
        props.action("addPoints", [latlon]);
      });
      map.addInteraction(drawAction);
    };

    addDrawInteraction(map0);
    if (props.compareDatasets) {
      addDrawInteraction(map1);
    }
  };

  const drawPoints = (vectorSource) => {
    let geom;
    let feat;
    switch (props.vectorType) {
      case "point":
        for (let c of props.vectorCoordinates) {
          geom = new olgeom.Point([c[1], c[0]]);
          geom = geom.transform("EPSG:4326", props.mapSettings.projection);
          feat = new Feature({
            geometry: geom,
            name: c[0].toFixed(4) + ", " + c[1].toFixed(4),
            type: "point",
          });
          vectorSource.addFeature(feat);
        }
        break;
      case "line":
        geom = new olgeom.LineString(
          props.vectorCoordinates.map(function (c) {
            return [c[1], c[0]];
          })
        );

        geom.transform("EPSG:4326", props.mapSettings.projection);
        feat = new Feature({
          geometry: geom,
          type: "line",
        });

        vectorSource.addFeature(feat);
        break;
      case "area":
        geom = new olgeom.Polygon([
          props.vectorCoordinates.map(function (c) {
            return [c[1], c[0]];
          }),
        ]);
        const centroid = olExtent.getCenter(geom.getExtent());
        geom.transform("EPSG:4326", props.mapSettings.projection);
        feat = new Feature({
          geometry: geom,
          type: "area",
          centroid: centroid,
        });
        vectorSource.addFeature(feat);
        break;
    }
  };

  const stopDrawing = () => {
    removeMapInteractions(map0);
    if (props.compareDatasets) {
      removeMapInteractions(map1);
    }
  };

  const pushSelection = function (selectedFeatures) {
    var t = undefined;
    var content = [];
    var names = [];
    let actionType = "selectPoints";
    selectedFeatures.forEach(function (feature) {
      if (feature.get("class") == "observation") {
        if (feature.getGeometry() instanceof olgeom.LineString) {
          t = "track";
          content.push(feature.get("id"));
        } else {
          t = "point";
          let c = feature
            .getGeometry()
            .clone()
            .transform(props.mapSettings.projection, "EPSG:4326")
            .getCoordinates();
          content.push([c[1], c[0], feature.get("id")]);
        }
      } else if (feature.get("type") != null) {
        switch (feature.get("type")) {
          case "class4":
            // openlayers' ids have /s that cause conflicts with the python backend. This replaces them.
            const class4id = feature.get("id").replace("/", "_");
            content.push(class4id);
            actionType = "class4Id";
            break;
          case "point":
            var c = feature
              .getGeometry()
              .clone()
              .transform(props.mapSettings.projection, "EPSG:4326")
              .getCoordinates();
            content.push([c[1], c[0], feature.get("observation")]);
            break;
          case "line":
            content.push(
              feature
                .getGeometry()
                .clone()
                .transform(props.mapSettings.projection, "EPSG:4326")
                .getCoordinates()
                .map(function (o) {
                  return [o[1], o[0]];
                })
            );
            content = content[0];
            break;
          case "drifter":
            content.push(feature.get("name"));
            break;
          case "area":
            if (feature.get("key")) {
              content.push(feature.get("key"));
            } else {
              var points = feature
                .getGeometry()
                .clone()
                .transform(props.mapSettings.projection, "EPSG:4326")
                .getCoordinates()
                .map(function (o) {
                  return o.map(function (p) {
                    return [p[1], p[0]];
                  });
                });
              var area = {
                polygons: points,
                innerrings: [],
                name: "",
              };
              content.push(area);
            }
            break;
        }
        t = feature.get("type");
      }
      if (feature.get("name")) {
        names.push(feature.get("name").replace(/<span>.*>/, ""));
      }
    });

    props.action(actionType, content);
    props.updateUI({ modalType: t, showModal: true });
    props.updateState("names", names);
  };

  const updateSelectFilter = (select) => {
    select.setProperties({
      filter: function (feature) {
        return vectorSource.forEachFeature(function (f) {
          if (f == feature) {
            return true;
          }
        });
      },
    });
  };

  const updateProjection = (map, dataset) => {
    resetMap();

    let mapLayers = map.getLayers().getArray();

    let layerDataIdx = props.mapSettings.basemap === "chs" ? 0 : 1;

    const dataSource = mapLayers[layerDataIdx].getSource();
    const dataProps = dataSource.getProperties();
    const newProps = { ...dataProps, ...getDataSource(dataset) };
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
    const newProps = { ...dataProps, ...getDataSource(dataset) };
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

  layerData0.setVisible(!props.mapSettings.hideDataLayer)
  layerData1.setVisible(!props.mapSettings.hideDataLayer)

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
        className="map-container MainMap"
      />

      {props.compareDatasets ? (
        <div
          style={{ height: "100vh", width: "calc(50% - 1px)" }}
          ref={mapRef1}
          id="map1"
          className="map-container MainMap"
        />
      ) : null}
    </div>
  );
});

export default MainMap;
