import React, {
  forwardRef,
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
} from "react";
import { renderToString } from "react-dom/server";
import axios from "axios";
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
import Draw from "ol/interaction/Draw";
import { defaults as defaultControls } from "ol/control/defaults";
import * as olExtent from "ol/extent";
import * as olinteraction from "ol/interaction";
import * as olcondition from "ol/events/condition";
import * as olgeom from "ol/geom";
import * as olLoadingstrategy from "ol/loadingstrategy";
import * as olProj from "ol/proj";
import * as olProj4 from "ol/proj/proj4";
import * as olTilegrid from "ol/tilegrid";
import { useGeographic } from "ol/proj.js";
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

const GlobalMap = forwardRef((props, ref) => {
  const [map, setMap] = useState();
  const [layerData, setLayerData] = useState();
  const [layerVector, setLayerVector] = useState();
  const [vectorSource, setVectorSource] = useState();
  const [layerObsDraw, setLayerObsDraw] = useState();
  const [obsDrawSource, setObsDrawSource] = useState();
  const [layerQuiver, setLayerQuiver] = useState();
  const mapRef = useRef();
  const popupElement = useRef(null);

  useImperativeHandle(ref, () => ({
    startDrawing: draw,
    stopDrawing: removeMapInteractions,
    show: show,
    drawObsPoint: drawObsPoint,
    drawObsArea: drawObsArea,
    resetMap: resetMap,
  }));

  useEffect(() => {
    let overlay = new Overlay({
      element: popupElement.current,
      autoPan: false,
      offset: [0, -10],
      positioning: "bottom-center",
    });

    let center = [-50, 53];
    if (props.mapSettings.center) {
      center = props.mapSettings.center.map(parseFloat);
    }

    let zoom = 4;
    if (props.mapSettings.zoom) {
      zoom = props.mapSettings.zoom;
    }

    let projection = props.mapSettings.projection;
    const mapView = new View({
      center: olProj.transform(center, "EPSG:4326", projection),
      projection: projection,
      zoom: zoom,
      maxZoom: MAX_ZOOM[projection],
      minZoom: MIN_ZOOM[projection],
    });

    const newLayerData = new TileLayer({
      preload: 1,
    });

    let newVectorSource = new VectorSource({
      features: [],
      strategy: olLoadingstrategy.bbox,
      format: new GeoJSON(),
      loader: loader,
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

    const newObsDrawSource = new VectorSource({
      features: [],
    });

    const newLayerObsDraw = new VectorLayer({ source: newObsDrawSource });

    const anchor = [0.5, 0.5];
    const newLayerQuiver = new VectorLayer({
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
      view: mapView,
      layers: [
        layerBasemap,
        newLayerData,
        layerLandShapes,
        layerBath,
        layerBathShapes,
        newLayerVector,
        newLayerObsDraw,
        newLayerQuiver,
      ],
      controls: defaultControls({
        zoom: true,
      }),
      overlays: [overlay],
    };

    let mapObject = new Map(options);
    mapObject.setTarget(mapRef.current);

    mapObject.on("moveend", function () {
      const c = olProj
        .transform(
          mapView.getCenter(),
          props.mapSettings.projection,
          "EPSG:4326"
        )
        .map(function (c) {
          return c.toFixed(4);
        });
      props.updateMapSettings("center", c);
      props.updateMapSettings("zoom", mapView.getZoom());
      const extent = mapView.calculateExtent(mapObject.getSize());
      props.updateMapSettings("extent", extent);
      mapObject.render();
      if (props.partner) {
        props.partner.mapView.setCenter(mapView.getCenter());
        props.partner.mapView.setZoom(mapView.getZoom());
      }
    });

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

    const select = new olinteraction.Select({
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
      filter: function (feature) {
        return newVectorSource.forEachFeature(function (f) {
          if (f == feature) {
            return true;
          }
        });
      },
    });

    let selectedFeatures = select.getFeatures();
    mapObject.addInteraction(select);

    const dragBox = new olinteraction.DragBox({
      condition: olcondition.platformModifierKeyOnly,
    });
    mapObject.addInteraction(dragBox);

    const pushSelection = function () {
      var t = undefined;
      var content = [];
      selectedFeatures;
      var names = [];
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

      props.action("selectPoints", content);
      props.updateUI({ modalType: t, showModal: true });
      props.updateState("names", names);
    };

    select.on("select", function (e) {
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
      pushSelection();

      // if (!e.mapBrowserEvent.originalEvent.shiftKey && e.selected.length > 0) {
      //   props.action("plot");
      // }
      if (e.selected[0].get("type") == "area") {
        selectedFeatures.clear();
      }
    });

    setMap(mapObject);
    setLayerData(newLayerData);
    setLayerVector(newLayerVector);
    setVectorSource(newVectorSource);
    setLayerObsDraw(newLayerObsDraw);
    setObsDrawSource(newObsDrawSource);
    setLayerQuiver(newLayerQuiver);

    return () => mapObject.setTarget(null);
  }, []);

  useEffect(() => {
    if (props.dataset.time > 0) {
      layerData.setSource(new XYZ(getDataSource()));
    }
  }, [props.dataset.id, props.dataset.variable, props.dataset.time]);

  useEffect(() => {
    if (layerQuiver) {
      let source = null;
      if (props.dataset.quiverVariable !== "none") {
        source = new VectorSource({
          url: `/api/v2.0/data?dataset=${props.dataset.id}&variable=${props.dataset.quiverVariable}&time=${props.dataset.time}&depth=${props.dataset.depth}&geometry_type=area`,
          format: new GeoJSON({
            featureProjection: olProj.get("EPSG:3857"),
            dataProjection: olProj.get("EPSG:4326"),
          }),
        });
      }
      layerQuiver.setSource(source);
    }
  }, [props.dataset.quiverVariable]);

  useEffect(() => {
    if (vectorSource) {
      vectorSource.clear();
      drawPoints();
    }
  }, [props.vectorCoordinates, props.vectorType]);

  useEffect(() => {
    if (props.vectorId && props.vectorType) {
      vectorSource.clear();
      vectorSource.setLoader(loader);
      vectorSource.refresh();
    }
  }, [props.vectorId, props.vectorType]);

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
            `/${props.class4type}` +
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
          layerVector.setSource(vectorSource);
        })
        .catch((error) => {
          console.error(error);
        });
    }
  };

  const resetMap = () => {
    removeMapInteractions("all");
    props.updateState(["vectorType", "vectorId"], ["point", null]);
    vectorSource.clear();
    obsDrawSource.clear();
    props.action("clearPoints");
    props.action("selectPoints");

    // this.removeMapInteractions("all");
    // this.props.updateState("vectortype", null);
    // this.props.updateState("vectorid", null);
    // this.selectedFeatures.clear();
    // this.vectorSource.clear();
    // this.obsDrawSource.clear();
    // this.overlay.setPosition(undefined);
    // this.infoOverlay.setPosition(undefined);
    // this.setState({latlon: []});
  };

  const removeMapInteractions = (type) => {
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

  const layerBasemap = getBasemap(
    props.mapSettings.basemap,
    props.mapSettings.projection,
    props.mapSettings.basemap_attribution
  );

  const layerBath = new TileLayer({
    source: new XYZ({
      url: `/api/v2.0/tiles/bath/{z}/{x}/{y}?projection=${props.mapSettings.projection}`,
      projection: props.mapSettings.projection,
    }),
    opacity: props.mapSettings.mapBathymetryOpacity,
    visible: props.mapSettings.bathymetry,
    preload: 1,
  });

  const vectorTileGrid = new olTilegrid.createXYZ({
    tileSize: 512,
    maxZoom: MAX_ZOOM[props.mapSettings.projection],
  });

  const layerBathShapes = new VectorTileLayer({
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
    }),
  });

  const layerLandShapes = new VectorTileLayer({
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

  const drawObsPoint = () => {
    if (removeMapInteractions("Point")) {
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

      map.removeInteraction(draw);
    });
    map.addInteraction(draw);
  };

  const drawObsArea = () => {
    if (removeMapInteractions("Polygon")) {
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
      map.removeInteraction(draw);
      setTimeout(function () {
        obsDrawSource.clear();
      }, 251);
    });
    map.addInteraction(draw);
  };

  const draw = () => {
    const drawAction = new Draw({
      source: layerVector.getSource(),
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

  const drawPoints = () => {
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

  return (
    <>
      <div
        style={{ height: "100vh", width: "100%" }}
        ref={mapRef}
        id="map-container"
        className="map-container GlobalMap"
      />
      <div className="title ol-popup" ref={popupElement}>
        Empty
      </div>
    </>
  );
});

export default GlobalMap;
