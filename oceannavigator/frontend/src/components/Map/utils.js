import React from "react";
import { renderToString } from "react-dom/server";
import axios from "axios";
import Map from "ol/Map.js";
import View from "ol/View.js";
import TileLayer from "ol/layer/Tile";
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
import VectorLayer from "ol/layer/Vector.js";
import GeoJSON from "ol/format/GeoJSON.js";
import MVT from "ol/format/MVT.js";
import XYZ from "ol/source/XYZ";
import { defaults as defaultControls } from "ol/control/defaults";
import DoubleClickZoom from "ol/interaction/DoubleClickZoom.js";
import MousePosition from "ol/control/MousePosition.js";
import Graticule from "ol/layer/Graticule.js";
import Draw from "ol/interaction/Draw.js";
import Modify from "ol/interaction/Modify.js";
import DragBox from "ol/interaction/DragBox.js";
import * as olcondition from "ol/events/condition";
import * as olgeom from "ol/geom";
import * as olProj from "ol/proj";
import * as olTilegrid from "ol/tilegrid";
import { isMobile } from "react-device-detect";

function deg2rad(deg) {
  return (deg * Math.PI) / 180.0;
}

// CHS S111 standard arrows for quiver layer
const I0 = require("../../images/s111/I0.svg").default; // lgtm [js/unused-local-variable]
const I1 = require("../../images/s111/I1.svg").default;
const I2 = require("../../images/s111/I2.svg").default;
const I3 = require("../../images/s111/I3.svg").default;
const I4 = require("../../images/s111/I4.svg").default;
const I5 = require("../../images/s111/I5.svg").default;
const I6 = require("../../images/s111/I6.svg").default;
const I7 = require("../../images/s111/I7.svg").default;
const I8 = require("../../images/s111/I8.svg").default;
const I9 = require("../../images/s111/I9.svg").default;

const arrowImages = [I0, I1, I2, I3, I4, I5, I6, I7, I8, I9];

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

var drifter_color = {};

export const createMapView = (center, projection, zoom, minZoom, maxZoom) => {
  const newMapView = new View({
    center: olProj.transform(center, "EPSG:4326", projection),
    projection: projection,
    zoom: zoom,
    maxZoom: maxZoom,
    minZoom: minZoom,
  });

  return newMapView;
};

const getBasemap = (source, projection, attribution, topoShadedRelief) => {
  switch (source) {
    case "topo":
      const shadedRelief = topoShadedRelief ? "true" : "false";
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

export const createMap = (
  mapSettings,
  overlay,
  popupElement,
  mapView,
  layerData,
  layerAnnotationVector,
  layerFeatureVector,
  obsDrawSource,
  maxZoom,
  mapRef
) => {
  const newLayerBasemap = getBasemap(
    mapSettings.basemap,
    mapSettings.projection,
    mapSettings.basemap_attribution,
    mapSettings.topoShadedRelief
  );

  const vectorTileGrid = new olTilegrid.createXYZ({
    tileSize: 512,
    maxZoom: maxZoom,
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
      url: `/api/v2.0/mbt/lands/{z}/{x}/{y}?projection=${mapSettings.projection}`,
      projection: mapSettings.projection,
    }),
  });

  const newLayerBath = new TileLayer({
    source: new XYZ({
      url: `/api/v2.0/tiles/bath/{z}/{x}/{y}?projection=${mapSettings.projection}`,
      projection: mapSettings.projection,
    }),
    opacity: mapSettings.mapBathymetryOpacity,
    visible: mapSettings.bathymetry,
    preload: 1,
  });

  const newLayerBathShapes = new VectorTileLayer({
    opacity: mapSettings.mapBathymetryOpacity,
    visible: mapSettings.bathymetry,
    style: new Style({
      stroke: new Stroke({
        color: "rgba(0, 0, 0, 1)",
      }),
    }),
    source: new VectorTile({
      format: new MVT(),
      tileGrid: vectorTileGrid,
      tilePixelRatio: 8,
      url: `/api/v2.0/mbt/bath/{z}/{x}/{y}?projection=${mapSettings.projection}`,
      projection: mapSettings.projection,
    }),
  });

  const newLayerObsDraw = new VectorLayer({ source: obsDrawSource });

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
    view: mapView,
    layers: [
      newLayerBasemap,
      layerData,
      newLayerLandShapes,
      newLayerBath,
      newLayerBathShapes,
      layerAnnotationVector,
      layerFeatureVector,
      newLayerObsDraw,
      newLayerQuiver,
    ],
    controls: defaultControls({
      zoom: true,
    }).extend([
      new MousePosition({
        projection: "EPSG:4326",
        coordinateFormat: function (c) {
          return "<div>" + c[1].toFixed(4) + ", " + c[0].toFixed(4) + "</div>";
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

  const modify = new Modify({ source: layerAnnotationVector.getSource() });
  mapObject.addInteraction(modify);

  mapObject.getInteractions().forEach((interaction) => {
    if (interaction instanceof DoubleClickZoom) {
      interaction.setActive(false);
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
    if (feature && feature.get("name") && !feature.get("annotation")) {
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
                  mapSettings.projection
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
          .get(`/api/v2.0/observation/meta/${type}/${feature.get("id")}}.json`)
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

  const dragBox = new DragBox({
    condition: olcondition.platformModifierKeyOnly,
  });
  mapObject.addInteraction(dragBox);

  newLayerBasemap.setZIndex(0);
  newLayerLandShapes.setZIndex(2);
  newLayerBath.setZIndex(3);
  newLayerBathShapes.setZIndex(4);
  layerAnnotationVector.setZIndex(5);
  layerFeatureVector.setZIndex(6);
  newLayerObsDraw.setZIndex(7);
  newLayerQuiver.setZIndex(100);

  return mapObject;
};

const getText = function (feature, resolution, dom) {
  const type = dom.text.value;
  const maxResolution = dom.maxreso.value;
  let text = feature.get("name");

  if (resolution > maxResolution) {
    text = "";
  } else if (type == "hide") {
    text = "";
  } else if (type == "shorten") {
    text = text.trunc(12);
  } else if (
    type == "wrap" &&
    (!dom.placement || dom.placement.value != "line")
  ) {
    text = stringDivider(text, 16, "\n");
  }

  return text;
};

export const createAnnotationVectorLayer = (source) => {
  return new VectorLayer({
    source: source,
    style: function (feature, resolution) {
      return new Style({
        stroke: new Stroke({
          color: "blue",
          width: 1,
        }),
        fill: new Fill({
          color: "rgba(0, 0, 255, 0.1)",
        }),
        text: new Text({
          font: "20px sans-serif",
          text: feature.get("name"),
          backgroundFill: new Fill({ color: "#ffffff80" }),
          backgroundStroke: new Stroke({
            color: "#ffffff80",
            width: 10,
            lineCap: "square",
            lineJoin: "square",
          }),
          placement: "Point",
          overflow: "wrap",
        }),
      });
    },
  });
};

export const createFeatureVectorLayer = (source) => {
  return new VectorLayer({
    source: source,
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
          case "Polygon":
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
                      mapSettings.projection
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
          case "LineString":
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
          case "Point":
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
              color = COLORS[Object.keys(drifter_color).length % COLORS.length];
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
};

export const getDataSource = (dataset, mapSettings) => {
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
    `?projection=${mapSettings.projection}` +
    `&scale=${scale}` +
    `&interp=${mapSettings.interpType}` +
    `&radius=${mapSettings.interpRadius}` +
    `&neighbours=${mapSettings.interpNeighbours}`;
  dataSource.projection = mapSettings.projection;

  return dataSource;
};

export const getQuiverSource = (dataset, mapSettings) => {
  const quiverSource = new VectorTile({
    url:
      "/api/v2.0/tiles/quiver" +
      `/${dataset.id}` +
      `/${dataset.quiverVariable}` +
      `/${dataset.time}` +
      `/${dataset.depth}` +
      `/${dataset.quiverDensity}` +
      "/{z}/{x}/{y}" +
      `?projection=${mapSettings.projection}`,
    projection: mapSettings.projection,
    format: new GeoJSON({
      featureProjection: olProj.get("EPSG:3857"),
      dataProjection: olProj.get("EPSG:4326"),
    }),
  });

  return quiverSource;
};

export const removeMapInteractions = (map, type) => {
  const interactions = map.getInteractions();
  const stat = {
    coll: interactions,
    ret: false,
  };
  interactions.forEach(function (e, i, a) {
    if (e instanceof Draw) {
      stat.coll.remove(e);
      if (e.get("type") === type) {
        stat.ret = true;
      }
    }
  }, stat);
  return stat.ret;
};
