import React, {
  forwardRef,
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
} from "react";
import axios from "axios";
import { Map, View } from "ol";
import Feature from "ol/Feature.js";
import TileLayer from "ol/layer/Tile";
import Overlay from "ol/Overlay.js";
import { Style, Circle, Stroke, Fill, Text, RegularShape } from "ol/style";
import VectorTile from "ol/source/VectorTile";
import VectorTileLayer from "ol/layer/VectorTile.js";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector.js";
import GeoJSON from "ol/format/GeoJSON.js";
import MVT from "ol/format/MVT.js";
import XYZ from "ol/source/XYZ";
import Draw from "ol/interaction/Draw";
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
  const [vectorSource, setVectorSource] = useState();

  useImperativeHandle(ref, () => ({
    startDrawing: draw,
    stopDrawing: removeMapInteractions,
    show: show,
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

    let options = {
      view: mapView,
      layers: [
        layer_basemap,
        layer_data,
        layer_landshapes,
        layer_bath,
        layer_bathshapes,
        layer_vector,
        // layer_obsDraw,
        // layer_quiver,
      ],
      controls: [],
      overlays: [overlay],
    };

    let newVectorSource = new VectorSource({
      features: [],
      strategy: olLoadingstrategy.bbox,
      format: new GeoJSON(),
      loader: loader,
    });

    setVectorSource(newVectorSource);

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
          popupElement.current.innerHTML = ReactDOMServer.renderToString(
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
          // $.ajax({
          //   url: `/api/v2.0/observation/meta/${type}/${feature.get(
          //     "id"
          //   )}}.json`,
          //   success: function (response) {
          //     overlay.setPosition(e.coordinate);
          //     feature.set(
          //       "meta",
          //       ReactDOMServer.renderToString(
          //         <table>
          //           {Object.keys(response).map((key) => (
          //             <tr key={key}>
          //               <td>{key}</td>
          //               <td>{response[key]}</td>
          //             </tr>
          //           ))}
          //         </table>
          //       )
          //     );
          //     popupElement.current.innerHTML = feature.get("meta");
          //   },
          // });
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
        console.log(feature);
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
              content = content[0]
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
      props.updateUI("modalType", t);
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
  }, []);

  useEffect(() => {
    if (props.dataset.time > 0) {
      let dataLayer = map.getLayers().getArray()[1];
      dataLayer.setSource(new XYZ(getDataSource()));
    }
  }, [props.dataset]);

  useEffect(() => {
    if (vectorSource) {
      vectorSource.clear();
      drawPoints();
      let vectorLayer = map.getLayers().getArray()[5];
      vectorLayer.setSource(vectorSource);
    }
  }, [props.vectorCoordinates, props.vectorType]);

  useEffect(() => {
    if (vectorSource && props.vectorId && props.vectorType) {
      vectorSource.clear();
      vectorSource.setLoader(loader);
      vectorSource.refresh();
      let vectorLayer = map.getLayers().getArray()[5];
      vectorLayer.setSource(vectorSource);
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

  const resetMap = () => {
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

  const layer_basemap = getBasemap(
    props.mapSettings.basemap,
    props.mapSettings.projection,
    props.mapSettings.basemap_attribution
  );

  const layer_data = new TileLayer({
    preload: 1,
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

  const vectorTileGrid = new olTilegrid.createXYZ({
    tileSize: 512,
    maxZoom: MAX_ZOOM[props.mapSettings.projection],
  });

  const layer_bathshapes = new VectorTileLayer({
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

  const layer_vector = new VectorLayer({
    source: vectorSource,
    style: function (feat, res) {
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
                  color: "#FFFFFF",
                  width: 2,
                }),
              }),
            }),
          ];
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
                color: "#ffffff",
                width: 2,
              }),
            }),
          });
      }
    },
  });

  const draw = () => {
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
            type: "points",
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
