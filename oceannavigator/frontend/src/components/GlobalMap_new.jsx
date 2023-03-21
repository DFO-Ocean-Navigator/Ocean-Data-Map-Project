import React, {
  forwardRef,
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
} from "react";
import axios from "axios";
import { Map, View, Graticule } from "ol";
import Feature from "ol/Feature.js";
import TileLayer from "ol/layer/Tile";
import Overlay from "ol/Overlay.js";
import Attribution from "ol/control/Attribution.js";
import { defaults } from "ol/control/defaults";
import { Style, Circle, Stroke, Fill, Text, RegularShape } from "ol/style";
import VectorTile from "ol/source/VectorTile";
import VectorTileLayer from "ol/layer/VectorTile.js";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector.js";
import GeoJSON from "ol/format/GeoJSON.js";
import MVT from "ol/format/MVT.js";
import XYZ from "ol/source/XYZ";
import TileWMS from 'ol/source/TileWMS.js';
import Draw from "ol/interaction/Draw";
import DragBox from "ol/interaction/DragBox.js";
import * as olExtent from "ol/extent";
import * as olinteraction from "ol/interaction";
import * as olcondition from "ol/events/condition";
import * as olgeom from "ol/geom";
import * as olLoadingstrategy from "ol/loadingstrategy";
import * as olProj from "ol/proj";
import * as olProj4 from "ol/proj/proj4";
import * as olTilegrid from "ol/tilegrid";
import { useGeographic } from "ol/proj.js";

import "ol/ol.css";

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

const GlobalMap = forwardRef((props, ref) => {
  const mapRef = useRef();
  const popupElement = useRef(null);
  const [map, setMap] = useState(new Map());

  useImperativeHandle(ref, () => ({
    startDrawing: draw,
    stopDrawing: removeMapInteractions,
    show: show,
  }));

  useEffect(() => {
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
          case "points":
          case "lines":
            url =
              `/api/v2.0/kml/${props.vectorType}` +
              `/${props.vectorId}` +
              `?projection=${projection.getCode()}` +
              `&view_bounds=${extent.map(function (i) {
                return Math.round(i);
              })}`;
            break;
          case "areas":
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

    const obsDrawSource = new VectorSource({
      features: [],
    });

    const vectorSource = new VectorSource({
      features: [],
      strategy: olLoadingstrategy.bbox,
      format: new GeoJSON(),
      loader: loader,
    });

    const vectorTileGrid = new olTilegrid.createXYZ({
      tileSize: 512,
      maxZoom: MAX_ZOOM[props.mapSettings.projection],
    });

    // Basemap layer
    const layer_basemap = getBasemap(
      props.mapSettings.basemap,
      props.mapSettings.projection,
      props.mapSettings.basemap_attribution
    );

    // Data layer
    const layer_data = new Tile({
      preload: 1,
      source: new XYZ({
        attributions: [
          new Attribution({
            html: "CONCEPTS",
          }),
        ],
      }),
    });

    // Bathymetry layer
    const layer_bath = new Tile({
      source: new XYZ({
        url: `/api/v2.0/tiles/bath/{z}/{x}/{y}?projection=${props.mapSettings.projection}`,
        projection: props.mapSettings.projection,
      }),
      opacity: props.mapSettings.mapBathymetryOpacity,
      visible: props.mapSettings.bathymetry,
      preload: 1,
    });

    // MBTiles Land shapes (high res)
    const layer_landshapes = new VectorTile({
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

    // MBTiles Bathymetry shapes (high res)
    const layer_bathshapes = new VectorTile({
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

    const layer_obsDraw = new VectorSource({
      source: obsDrawSource,
    });

    // Drawing layer
    const layer_vector = new VectorLayer({
      source: vectorSource,
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
                  width: 2,
                }),
              }),
            ];

            return styles;
          }

          let image = new Circle({
            radius: 4,
            fill: new Fill({
              color: "#ff0000",
            }),
            stroke: new Stroke({
              color: "#000000",
              width: 1,
            }),
          });
          let stroke = new Stroke({ color: "#000000", width: 1 });
          let radius = 6;
          switch (feat.get("type")) {
            case "argo":
              image = new Circle({
                radius: 4,
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
            case "area": {
              return [
                new Style({
                  stroke: new Stroke({
                    color: "#FFFFFF",
                    width: 2,
                  }),
                  fill: new Fill({
                    color: "#FFFFFF00",
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
                    olproj.transform(
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
                      color: "#FFFFFF",
                      width: 2,
                    }),
                  }),
                }),
              ];
            }

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
                  radius: 4,
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
                    width: 2,
                  }),
                }),
                new Style({
                  geometry: new olgeom.Point(end),
                  image: endImage,
                }),
                new Style({
                  geometry: new olgeom.Point(start),
                  image: new Circle({
                    radius: 4,
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
                  radius: 4,
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

            default:
              return new Style({
                stroke: new Stroke({
                  color: "#ff0000",
                  width: 4,
                }),
                image: new Circle({
                  radius: 4,
                  fill: new Fill({
                    color: "#ff0000",
                  }),
                  stroke: new Stroke({
                    color: "#000000",
                    width: 1,
                  }),
                }),
              });
          }
        }
      },
    });

    const anchor = [0.5, 0.5];
    const layer_quiver = new Vector({
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

    // Construct our map
    const newMap = new ol.Map({
      layers: [
        layer_basemap,
        layer_data,
        layer_landshapes,
        layer_bath,
        layer_bathshapes,
        layer_vector,
        layer_obsDraw,
        layer_quiver,
      ],
      controls: defaults({
        zoom: true,
        attributionOptions: {
          collapsible: false,
          collapsed: false,
        },
      }).extend([
        new app.ResetPanButton(),
        new olcontrol.FullScreen(),
        new olcontrol.MousePosition({
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
    });
    newMap.setTarget(mapRef.current);
    newMap.on("moveend", refreshFeatures);
    newMap.on("moveend", function () {
      const c = olproj
        .transform(
          mapView.getCenter(),
          props.mapSettings.projection,
          "EPSG:4326"
        )
        .map(function (c) {
          return c.toFixed(4);
        });
      props.updateState("center", c);
      props.updateState("zoom", mapView.getZoom());
      const extent = mapView.calculateExtent(newMap.getSize());
      props.updateState("extent", extent);
      newMap.render();
      if (props.partner) {
        props.partner.mapView.setCenter(mapView.getCenter());
        props.partner.mapView.setZoom(mapView.getZoom());
      }
    });

    let center = [-50, 53];
    if (props.mapSettings.center) {
      center = props.mapSettings.center.map(parseFloat);
    }
    let zoom = 4;
    if (props.mapSettings.zoom) {
      zoom = props.mapSettings.zoom;
    }
    const projection = props.mapSettings.projection;

    mapView = new ol.View({
      center: olproj.transform(center, "EPSG:4326", projection),
      projection: projection,
      zoom: zoom,
      maxZoom: MAX_ZOOM[props.mapSettings.projection],
      minZoom: MIN_ZOOM[props.mapSettings.projection],
    });
    //mapView.on("change:resolution", constrainPan);
    //mapView.on("change:center", constrainPan);
    newMap.setView(mapView);

    let selected = null;
    newMap.on("pointermove", function (e) {
      if (selected !== null) {
        selected.setStyle(undefined);
        selected = null;
      }
      const feature = newMap.forEachFeatureAtPixel(
        newMap.getEventPixel(e.originalEvent),
        function (feature, layer) {
          return feature;
        }
      );
      if (feature && feature.get("name")) {
        overlay.setPosition(e.coordinate);
        if (feature.get("data")) {
          let bearing = feature.get("bearing");
          popupElement.innerHTML = ReactDOMServer.renderToString(
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
          popupElement.innerHTML = feature.get("name");
        }

        if (feature.get("type") == "area") {
          newMap.forEachFeatureAtPixel(e.pixel, function (f) {
            selected = f;
            f.setStyle([
              new Style({
                stroke: new Stroke({
                  color: "#FFFFFF",
                  width: 2,
                }),
                fill: new Fill({
                  color: "#FFFFFF80",
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
                  olproj.transform(
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
                    color: "#FFFFFF",
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
          popupElement.innerHTML = feature.get("meta");
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
                ReactDOMServer.renderToString(
                  <table>
                    {Object.keys(response).map((key) => (
                      <tr key={key}>
                        <td>{key}</td>
                        <td>{response[key]}</td>
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

    var select = new Select({
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
        return vectorSource.forEachFeature(function (f) {
          if (f == feature) {
            return true;
          }
        });
      },
    });
    selectedFeatures = select.getFeatures();
    newMap.addInteraction(select);

    const dragBox = new DragBox({
      condition: olcondition.platformModifierKeyOnly,
    });
    newMap.addInteraction(dragBox);

    const pushSelection = function () {
      var t = undefined;
      var content = [];
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

      props.updateState(t, content);
      props.updateState("modal", t);
      props.updateState("names", names);
      props.updateState("plotEnabled", false);
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
        props.action("point", state.latlon);
      }
      pushSelection();

      if (!e.mapBrowserEvent.originalEvent.shiftKey && e.selected.length > 0) {
        props.action("plot");
      }
      if (infoRequest !== undefined) {
        infoRequest.abort();
      }
      infoOverlay.setPosition(undefined);
      if (e.selected[0].get("type") == "area") {
        selectedFeatures.clear();
      }
    });

    dragBox.on("boxend", function () {
      var extent = dragBox.getGeometry().getExtent();
      vectorSource.forEachFeatureIntersectingExtent(extent, function (feature) {
        selectedFeatures.push(feature);
      });

      pushSelection();
      props.updateState("plotEnabled", true);
    });

    // clear selection when drawing a new box and when clicking on the map
    dragBox.on("boxstart", function () {
      this.selectedFeatures.clear();
      this.props.updateState("plotEnabled", false);
    });

    const overlay = new Overlay({
      element: popupElement,
      autoPan: false,
      offset: [0, -10],
      positioning: "bottom-center",
    });
    newMap.addOverlay(overlay);

    SVGFEDisplacementMapElement(newMap)
  });

  const getBasemap = (source, projection, attribution) => {
    switch (source) {
      case "topo":
        const shadedRelief = this.props.options.topoShadedRelief
          ? "true"
          : "false";

        return new TileLayer({
          preload: 1,
          source: new olsource.XYZ({
            url: `/api/v2.0/tiles/topo/{z}/{x}/{y}?shaded_relief=${shadedRelief}&projection=${projection}`,
            projection: projection,
            attributions: [
              new olcontrol.Attribution({
                html: attribution,
              }),
            ],
          }),
        });
      case "ocean":
        return new TileLayer({
          preload: 1,
          source: new XYZ({
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean_Basemap/MapServer/tile/{z}/{y}/{x}",
            projection: "EPSG:3857",
            attributions: [
              new olcontrol.Attribution({
                html: attribution,
              }),
            ],
          }),
        });
      case "world":
        return new TileLayer({
          preload: 1,
          source: new XYZ({
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            projection: "EPSG:3857",
            attributions: [
              new olcontrol.Attribution({
                html: attribution,
              }),
            ],
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
            attributions: [
              new olcontrol.Attribution({
                html: attribution,
              }),
            ],
          }),
        });
    }
  };

  // resetMap() {
  //   removeMapInteractions("all");
  //   props.updateState("vectortype", null);
  //   props.updateState("vectorid", null);
  //   selectedFeatures.clear();
  //   vectorSource.clear();
  //   obsDrawSource.clear();
  //   // overlay.setPosition(undefined);
  //   // infoOverlay.setPosition(undefined);
  //   // setState({latlon: []});
  // }

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
  }

  return (
    <>
      <div
        style={{ height: "100vh", width: "100%" }}
        ref={mapRef}
        id="map-container"
        className="map-container GlobalMap"
      />
      <div className="title ol-popup" ref={popupElement} />
    </>
  );
});

export default GlobalMap;
