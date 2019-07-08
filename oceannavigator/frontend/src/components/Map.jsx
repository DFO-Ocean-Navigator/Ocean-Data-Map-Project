/* eslint react/no-deprecated: 0 */
import React from "react";
import PropTypes from "prop-types";
import proj4 from "proj4";
import * as ol from "ol";
import * as olproj from "ol/proj";
import * as olproj4 from "ol/proj/proj4";
import * as olcontrol from "ol/control";
import * as olsource from "ol/source";
import * as olloadingstrategy from "ol/loadingstrategy";
import * as olformat from "ol/format";
import * as oltilegrid from "ol/tilegrid";
import * as ollayer from "ol/layer";
import * as olstyle from "ol/style";
import * as olinteraction from "ol/interaction";
import * as olcondition from "ol/events/condition";
import * as olgeom from "ol/geom";
import * as olextent from "ol/extent";

require("ol/ol.css");

const i18n = require("../i18n.js");
const SmartPhone = require("detect-mobile-browser")(false);
const X_IMAGE = require("../images/x.png");

var app = {};
const COLORS = [
  [ 0, 0, 255 ],
  [ 0, 128, 0 ],
  [ 255, 0, 0 ],
  [ 0, 255, 255 ],
  [ 255, 0, 255 ],
  [ 255, 255, 0 ],
  [ 0, 0, 0 ],
  [ 255, 255, 255 ],
];

let CURRENT_PROJ = "EPSG:3857";

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
  "EPSG:3857": 13,
  "EPSG:32661": 5,
  "EPSG:3031": 5,
};

var drifter_color = {};

// Reset Pan button
app.ResetPanButton = function(opt_options) {
  const options = opt_options || {};

  const button = document.createElement("button");
  button.innerHTML = "🏠";
  button.setAttribute("title", "Reset Map Location");

  const this_ = this;
  const handleResetPan = function() {
    // Move to center of map according to correct projection
    this_.getMap().getView().setCenter(DEF_CENTER[CURRENT_PROJ]);
  };

  button.addEventListener("click", handleResetPan, false);
  button.addEventListener("touchstart", handleResetPan, false);

  const element = document.createElement("div");
  element.className = "reset-pan ol-unselectable ol-control";
  element.appendChild(button);

  olcontrol.Control.call(this, {
    element: element,
    target: options.target,
  });
};
ol.inherits(app.ResetPanButton, olcontrol.Control);

// Variable scale legend
app.ScaleViewer = function(opt_options) {
  const options = opt_options || {};

  const scale = document.createElement("img");
  scale.setAttribute("src", options.image);
  scale.setAttribute("alt", "Variable Scale");
  scale.setAttribute("title", "Variable Scale");

  const element = document.createElement("div");
  element.className = "scale-viewer ol-unselectable ol-control";
  element.appendChild(scale);

  olcontrol.Control.call(this, {
    element: element,
    target: options.target,
  });
};
ol.inherits(app.ScaleViewer, olcontrol.Control);

proj4.defs("EPSG:32661", "+proj=stere +lat_0=90 +lat_ts=90 +lon_0=0 +k=0.994 +x_0=2000000 +y_0=2000000 +ellps=WGS84 +datum=WGS84 +units=m +no_defs");
proj4.defs("EPSG:3031", "+proj=stere +lat_0=-90 +lat_ts=-71 +lon_0=0 +k=1 +x_0=0 +y_0=0 +ellps=WGS84 +datum=WGS84 +units=m +no_defs");
olproj4.register(proj4);

var proj32661 = olproj.get("EPSG:32661");
proj32661.setWorldExtent([-180.0, 60.0, 180.0, 90.0]);
proj32661.setExtent([
  -1154826.7379766018,
  -1154826.7379766018,
  5154826.737976602,
  5154826.737976601
]);

var proj3031 = olproj.get("EPSG:3031");
proj3031.setWorldExtent([-180.0, -90.0, 180.0, -60.0]);
proj3031.setExtent([
  -3087442.3458218463,
  -3087442.3458218463,
  3087442.345821846,
  3087442.345821846
]);

export default class Map extends React.PureComponent {
  constructor(props) {
    super(props);

    this._drawing = false;
    // Track if mounted to prevent no-op errors with the Ajax callbacks.
    this._mounted = false;

    this.state = {
      location: [0,90]
    };

    this.loader = function(extent, resolution, projection) {
      if (this.props.state.vectortype) {
        $.ajax({
          url: (
            `/api/${this.props.state.vectortype}` +
            `/${projection.getCode()}` +
            `/${Math.round(resolution)}` +
            `/${extent.map(function (i) { return Math.round(i);})}` +
            `/${this.props.state.vectorid}.json`
          ),
          success: function(response) {
            var features = (new olformat.GeoJSON()).readFeatures(response, {
              featureProjection: this.props.state.projection,
            });
            var featToAdd = [];
            for (let feat of features) {
              var id = feat.get("name");
              feat.setId(id);
              if (feat.get("error") != null) {
                feat.set("name", feat.get("name") + "<span>" + _("RMS Error: ") + feat.get("error").toPrecision(3) + "</span>");
              }
              var oldfeat = this.vectorSource.getFeatureById(id);
              if (oldfeat != null && oldfeat.get("resolution") > feat.get("resolution")) {
                oldfeat.setGeometry(feat.getGeometry());
                oldfeat.set("resolution", feat.get("resolution"));
              } else {
                featToAdd.push(feat);
              }
            }
            this.vectorSource.addFeatures(featToAdd);
          }.bind(this),
          error: function() {
            console.error("Error!");
          }
        });
      }
    };
    this.vectorSource = new olsource.Vector({
      features: [],
      strategy: olloadingstrategy.bbox,
      format: new olformat.GeoJSON(),
      loader: this.loader.bind(this),
    });

    this.vectorTileGrid = new oltilegrid.createXYZ({
      tileSize:512, 
      maxZoom: MAX_ZOOM[this.props.state.projection]
    }),

    // Basemap layer
    this.layer_basemap = this.getBasemap(
      this.props.state.basemap,
      this.props.state.projection,
      this.props.state.basemap_attribution
    );

    // Data layer
    this.layer_data = new ollayer.Tile(
      {
        preload: 7,
        source: new olsource.XYZ({
          attributions: [
            new olcontrol.Attribution({
              html: "CONCEPTS",
            })
          ],
        }),
      });

    // Bathymetry layer
    this.layer_bath = new ollayer.Tile(
      {
        source: new olsource.XYZ({
          url: `/tiles/bath/${this.props.state.projection}/{z}/{x}/{y}.png`,
          projection: this.props.state.projection,
        }),
        opacity: this.props.options.mapBathymetryOpacity,
        visible: this.props.options.bathymetry,
        preload: 7,
      });

    // MBTiles Land shapes (high res)
    this.layer_landshapes = new ollayer.VectorTile(
      {
        opacity: 1,
        style: new olstyle.Style({
          stroke: new olstyle.Stroke({
            color: 'rgba(0, 0, 0, 1)'
          }),
				  fill: new olstyle.Fill({
					  color: 'white'
            })
          }),
        source: new olsource.VectorTile({
          format: new olformat.MVT(),
          tileGrid: this.vectorTileGrid,
          tilePixelRatio: 8,
          url: `/api/v1.0/mbt/${this.props.state.projection}/lands/{z}/{x}/{y}`,
          projection: this.props.state.projection,
        }),
      });

    // MBTiles Bathymetry shapes (high res)
      this.layer_bathshapes = new ollayer.VectorTile(
        {
          opacity: this.props.options.mapBathymetryOpacity,
          visible: this.props.options.bathymetry,
          style: new olstyle.Style({
            stroke: new olstyle.Stroke({
              color: 'rgba(0, 0, 0, 1)'
            })
          }),
          source: new olsource.VectorTile({
            format: new olformat.MVT(),
            tileGrid: this.vectorTileGrid,
            tilePixelRatio: 8,
            url: `/api/v1.0/mbt/${this.props.state.projection}/bath/{z}/{x}/{y}`,
          }),
        });

    // Drawing layer
    this.layer_vector = new ollayer.Vector(
      {
        source: this.vectorSource,
        style: function(feat, res) {

          switch (feat.get("type")) {
            case "area": {
              return [
                new olstyle.Style({
                  stroke: new olstyle.Stroke({
                    color: "#000000",
                    width: 1,
                  }),
                }),
                new olstyle.Style({
                  geometry: new olgeom.Point(olproj.transform(feat.get("centroid"), "EPSG:4326", this.props.state.projection)),
                  text: new olstyle.Text({
                    text: feat.get("name"),
                    fill: new olstyle.Fill({
                      color: "#000",
                    }),
                  }),
                }),
              ];
            }
            
            case "drifter": {
              const start = feat.getGeometry().getCoordinateAt(0);
              const end = feat.getGeometry().getCoordinateAt(1);
              let endImage;
              let color = drifter_color[feat.get("name")];
              
              if (color === undefined) {
                color = COLORS[Object.keys(drifter_color).length % COLORS.length];
                drifter_color[feat.get("name")] = color;
              }
              if (feat.get("status") == "inactive" || feat.get("status") == "not responding") {
                endImage = new olstyle.Icon({
                  src: X_IMAGE,
                  scale: 0.75,
                });
              } else {
                endImage = new olstyle.Circle({
                  radius: SmartPhone.isAny() ? 6 : 4,
                  fill: new olstyle.Fill({
                    color: "#ff0000",
                  }),
                  stroke: new olstyle.Stroke({
                    color: "#000000",
                    width: 1
                  }),
                });
              }

              const styles = [
                new olstyle.Style({
                  stroke: new olstyle.Stroke({
                    color: [color[0], color[1], color[2], 0.004],
                    width: 8,
                  }),
                }),
                new olstyle.Style({
                  stroke: new olstyle.Stroke({
                    color: color,
                    width: SmartPhone.isAny() ? 4 : 2,
                  })
                }),
                new olstyle.Style({
                  geometry: new olgeom.Point(end),
                  image: endImage,
                }),
                new olstyle.Style({
                  geometry: new olgeom.Point(start),
                  image: new olstyle.Circle({
                    radius: SmartPhone.isAny() ? 6 : 4,
                    fill: new olstyle.Fill({
                      color: "#008000",
                    }),
                    stroke: new olstyle.Stroke({
                      color: "#000000",
                      width: 1
                    }),
                  }),
                }),
              ];

              return styles;
            }

            case "class4": {
              const red = Math.min(255, 255 * (feat.get("error_norm") / 0.5));
              const green = Math.min(255, 255 * (1 - feat.get("error_norm")) / 0.5);
              
              return new olstyle.Style({
                image: new olstyle.Circle({
                  radius: SmartPhone.isAny() ? 6 : 4,
                  fill: new olstyle.Fill({
                    color: [red, green, 0, 1],
                  }),
                  stroke: new olstyle.Stroke({
                    color: "#000000",
                    width: 1
                  }),
                }),
              });
            }

            default:
              return new olstyle.Style({
                stroke: new olstyle.Stroke({
                  color: "#ff0000",
                  width: SmartPhone.isAny() ? 8 : 4,
                }),
                image: new olstyle.Circle({
                  radius: SmartPhone.isAny() ? 6 : 4,
                  fill: new olstyle.Fill({
                    color: "#ff0000",
                  }),
                  stroke: new olstyle.Stroke({
                    color: "#000000",
                    width: 1
                  }),
                }),
              });
          }

        }.bind(this),
      });

    // Construct our map
    this.map = new ol.Map({
      layers: [
        this.layer_basemap,
        this.layer_data,
        this.layer_landshapes,
        this.layer_bath,
        this.layer_bathshapes,
        this.layer_vector,
      ],
      controls: olcontrol.defaults({
        zoom: true,
        attributionOptions: ({
          collapsible: false,
          collapsed: false,
        })
      }).extend([
        new app.ResetPanButton(), 
        new olcontrol.FullScreen(),
        new olcontrol.MousePosition({
          projection: "EPSG:4326",
          coordinateFormat: function(c) {
            return "<div>" + c[1].toFixed(4) + ", " + c[0].toFixed(4) + "</div>";
          }
        }),
        new ol.Graticule({
          strokeStyle: new olstyle.Stroke({color: "rgba(128, 128, 128, 0.9)", lineDash: [0.5, 4]})
        }),
      ])
    });
    this.map.on("moveend", this.refreshFeatures.bind(this));
    this.map.on("moveend", function() {
      const c = olproj.transform(this.mapView.getCenter(), this.props.state.projection, "EPSG:4326").map(function(c) {return c.toFixed(4);});
      this.props.updateState("center", c);
      this.props.updateState("zoom", this.mapView.getZoom());
      const extent = this.mapView.calculateExtent(this.map.getSize());
      this.props.updateState("extent", extent);
      this.map.render();
      if (this.props.partner) {
        this.props.partner.mapView.setCenter(this.mapView.getCenter());
        this.props.partner.mapView.setZoom(this.mapView.getZoom());
      }
    }.bind(this));

    let center = [-50, 53];
    if (this.props.state.center) {
      center = this.props.state.center.map(parseFloat);
    }
    let zoom = 4;
    if (this.props.state.zoom) {
      zoom = this.props.state.zoom;
    }
    const projection = this.props.state.projection;
        
    this.mapView = new ol.View({
      center: olproj.transform(center, "EPSG:4326", projection),
      projection: projection,
      zoom: zoom,
      maxZoom: MAX_ZOOM[this.props.state.projection],
      minZoom: MIN_ZOOM[this.props.state.projection],
    });
    //this.mapView.on("change:resolution", this.constrainPan.bind(this));
    //this.mapView.on("change:center", this.constrainPan.bind(this));
    this.map.setView(this.mapView);

    this.map.on("pointermove", function(e) {
      const feature = this.map.forEachFeatureAtPixel(
        this.map.getEventPixel(e.originalEvent),
        function(feature, layer) {
          return feature;
        }
      );
      if (feature && feature.name) {
        this.overlay.setPosition(e.coordinate);
        this.popupElement.innerHTML = feature.name;
        $(this.map.getTarget()).css("cursor", "pointer");
      } else if (feature && feature.get("name")) {
        this.overlay.setPosition(e.coordinate);
        this.popupElement.innerHTML = feature.get("name");
        $(this.map.getTarget()).css("cursor", "pointer");
      } else {
        this.overlay.setPosition(undefined);
        $(this.map.getTarget()).css("cursor", "");
      }
    }.bind(this));

    // Info popup balloon
    this.map.on("singleclick", function(e) {
      if (this._drawing) { // Prevent conflict with drawing
        return;
      }
      
      const coord = e.coordinate; // Click location
      
      this.infoPopupContent.innerHTML = _("Loading...");
      if (this.infoRequest !== undefined) {
        this.infoRequest.abort();
      }
      const location = olproj.transform(coord, this.props.state.projection, "EPSG:4326");
      this.setState({
        location: [location[0], location[1]]
      });
      this.infoOverlay.setPosition(coord); // Set balloon position

      this.infoRequest = $.ajax({
        url: (
          `/api/data/${this.props.state.dataset}` +
          `/${this.props.state.variable}` +
          `/${this.props.state.time}` +
          `/${this.props.state.depth}` +
          `/${location[1]},${location[0]}.json`
        ),
        success: function(response) {
          let text = "<p>" + 
                        "Location: " + response.location[0].toFixed(4) + ", " + response.location[1].toFixed(4);
          for (let i = 0; i < response.name.length; ++i) {
            if (response.value[i] != "nan") {
              text += "<br />" + 
                            response.name[i] + ": " + response.value[i] + " " + response.units[i];
            }
          }
          text += "</p>";
          this.infoPopupContent.innerHTML = text;
        }.bind(this),
      });
    }.bind(this));

    var select = new olinteraction.Select({
      style: function(feat, res) {
        if (feat.get("type") == "area") {
          return [
            new olstyle.Style({
              stroke: new olstyle.Stroke({
                color: "#0099ff",
                width: 3,
              }),
            }),
            new olstyle.Style({
              geometry: new olgeom.Point(olproj.transform(feat.get("centroid"), "EPSG:4326", this.props.state.projection)),
              text: new olstyle.Text({
                text: feat.get("name"),
                fill: new olstyle.Fill({
                  color: "#0099ff",
                }),
              }),
            }),
          ];
        } else {
          return new olstyle.Style({
            stroke: new olstyle.Stroke({
              color: "#0099ff",
              width: 4
            }),
            image: new olstyle.Circle({
              radius: SmartPhone.isAny() ? 6 : 4,
              fill: new olstyle.Fill({
                color: "#0099ff",
              }),
              stroke: new olstyle.Stroke({
                color: "#ffffff",
                width: 1
              }),
            }),
          });
        }
      }.bind(this),
      filter: function(feature) {
        return this.vectorSource.forEachFeature(function(f) {
          if (f == feature) {
            return true;
          }
        });
      }.bind(this)
    });
    this.selectedFeatures = select.getFeatures();
    this.map.addInteraction(select);

    const dragBox = new olinteraction.DragBox({
      condition: olcondition.platformModifierKeyOnly
    });
    this.map.addInteraction(dragBox);

    const pushSelection = function() {
      var t = undefined;
      var content = [];
      var names = [];
      this.selectedFeatures.forEach(function (feature) {
        if (feature.get("type") != null) {
          switch(feature.get("type")) {
            case "class4":
              content.push(feature.get("id"));
              break;
            case "point":
              var c = feature.getGeometry().clone().transform(this.props.state.projection, "EPSG:4326").getCoordinates();
              content.push([c[1], c[0], feature.get("observation")]);
              break;
            case "line":
              content.push(feature.getGeometry().clone().transform(this.props.state.projection, "EPSG:4326").getCoordinates().map(function(o) {
                return [o[1], o[0]];
              }));
              break;
            case "drifter":
              content.push(feature.get("name"));
              break;
            case "area":
              if (feature.get("key")) {
                content.push(feature.get("key"));
              } else {
                var points = feature.getGeometry().clone().transform(this.props.state.projection, "EPSG:4326").getCoordinates().map(function(o) {
                  return o.map(function (p) { return [p[1], p[0]]; });
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
      }.bind(this));

      
      this.props.updateState(t, content);
      this.props.updateState("modal", t);
      this.props.updateState("names", names);

    }.bind(this);

    select.on("select", function(e) {
      if (e.selected.length > 0 &&
        (e.selected[0].line || e.selected[0].drifter)
      ) {
        this.selectedFeatures.clear();
        this.selectedFeatures.push(e.selected[0]);
      }
      pushSelection();

      if (!e.mapBrowserEvent.originalEvent.shiftKey && e.selected.length > 0) {
        this.props.action("plot");
      }
      if (this.infoRequest !== undefined) {
        this.infoRequest.abort();
      }
      this.infoOverlay.setPosition(undefined);
    }.bind(this));

    dragBox.on("boxend", function() {
      var extent = dragBox.getGeometry().getExtent();
      this.vectorSource.forEachFeatureIntersectingExtent(
        extent,
        function(feature) {
          this.selectedFeatures.push(feature);
        }.bind(this)
      );

      pushSelection();
    }.bind(this));

    // clear selection when drawing a new box and when clicking on the map
    dragBox.on("boxstart", function() {
      this.selectedFeatures.clear();
      this.props.updateState("plotEnabled", false);
    }.bind(this));
  }

  getBasemap(source, projection, attribution) {
    switch(source) {
      case "topo":
        const shadedRelief = this.props.options.topoShadedRelief ? "true" : "false";

        return new ollayer.Tile({
          preload: 7,
          source: new olsource.XYZ({
            url: `/api/v1.0/tiles/topo/${shadedRelief}/${projection}/{z}/{x}/{y}.png`,
            projection: projection,
            attributions: [
              new olcontrol.Attribution({
                html: attribution,
              })
            ],
          })
        });
      case "ocean":
        return new ollayer.Tile({
          preload: 7,
          source: new olsource.XYZ({
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean_Basemap/MapServer/tile/{z}/{y}/{x}",
            projection: "EPSG:3857",
            attributions: [
              new olcontrol.Attribution({
                html: attribution,
              })
            ],
          })
        });
      case "world":
        return new ollayer.Tile({
          preload: 7,
          source: new olsource.XYZ({
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            projection: "EPSG:3857",
            attributions: [
              new olcontrol.Attribution({
                html: attribution,
              })
            ],
          })
        });
    }
  }

  componentWillMount() {
    // Renders a map drawing from the data saved in a permalink
    if (typeof(this.props.state.modal) === "string") {
      switch (this.props.state.modal) {
        case "point":
          this.add(this.props.state.modal, this.props.state[this.props.state.modal]);
          break;
        case "line":
          this.add(this.props.state.modal, this.props.state.line[0]);
          break;
        case "area":
          this.add(this.props.state.modal, this.props.state.area[0].polygons[0]);
          break;
        default:
          break;
      }
    }
  }

  componentDidMount() {
    this.overlay = new ol.Overlay({
      element: this.popupElement,
      autoPan: false,
      offset: [0, -10],
      positioning: "bottom-center",
    });
    this.map.addOverlay(this.overlay);

    this.infoOverlay = new ol.Overlay({
      element: this.infoPopup,
      autoPan: true,
      autoPanAnimation: {
        duration: 250,
      },
    });
    this.map.addOverlay(this.infoOverlay);

    this.infoPopupCloser.onclick = function() {
      this.infoOverlay.setPosition(undefined);
      this.infoPopupCloser.blur();
      return false;
    }.bind(this);

    this.infoPopupLauncher.onclick = function() {
      this.infoOverlay.setPosition(undefined);
      this.infoPopupLauncher.blur();
      this.props.action("point", this.state.location);
      return false;
    }.bind(this);

    // Tracks if this component is mounted
    this._mounted = true;
  }

  componentWillUnmount() {
    this._mounted = false;
  }

  resetMap() {
    this.removeMapInteractions("all");
    this.props.updateState("vectortype", null);
    this.props.updateState("vectorid", null);
    this.selectedFeatures.clear();
    this.vectorSource.clear();
    this.overlay.setPosition(undefined);
    this.infoOverlay.setPosition(undefined);
  }

  removeMapInteractions(type) {
    const interactions = this.map.getInteractions();
    const stat = {
      coll: interactions,
      ret: false,
    };
    interactions.forEach(function(e, i, a) {
      if (e instanceof olinteraction.Draw) {
        stat.coll.remove(e);
        if (e.get("type") === type) {
          stat.ret = true;
        }
      }
    }, stat);
    return stat.ret;
  }

  controlDoubleClickZoom(active) {
    const interactions = this.map.getInteractions();
    for (let i = 0; i < interactions.getLength(); i++) {
      const interaction = interactions.item(i);
      if (interaction instanceof olinteraction.DoubleClickZoom) {
        interaction.setActive(active);
      }
    }
  }

  point() {
    if (this.removeMapInteractions("Point")) {
      return;
    }

    this._drawing = true;

    //Resets map (in case other plots have been drawn)
    this.resetMap();
    const draw = new olinteraction.Draw({
      source: this.vectorSource,
      type: "Point",
    });
    draw.set("type", "Point");
    draw.on("drawend", function(e) {
      // Disable zooming when drawing
      this.controlDoubleClickZoom(false);
      const lonlat = olproj.transform(e.feature.getGeometry().getCoordinates(), this.props.state.projection, "EPSG:4326");
      // Draw point on map(s)
      this.props.action("add", "point", [[lonlat[1], lonlat[0]]]);
      this.props.updateState("plotEnabled", true);
      // Pass point to PointWindow
      this.props.action("point", lonlat);   //This function has the sole responsibility for opening the point window
      this.map.removeInteraction(draw);
      this._drawing = false;
      setTimeout(
        function() { this.controlDoubleClickZoom(true); }.bind(this),
        251
      );
    }.bind(this));
    this.map.addInteraction(draw);
  }

  line() {
    if (this.removeMapInteractions("LineString")) {
      return;
    }

    this._drawing = true;

    this.resetMap();
    const draw = new olinteraction.Draw({
      source: this.vectorSource,
      type: "LineString"
    });
    draw.set("type", "LineString");
    draw.on("drawend", function(e) {
      // Disable zooming when drawing
      this.controlDoubleClickZoom(false);
      const points = e.feature.getGeometry().getCoordinates().map(
        function (c) {
          const lonlat = olproj.transform(c, this.props.state.projection,"EPSG:4326");
          return [lonlat[1], lonlat[0]];
        }.bind(this)
      );
      // Draw line(s) on map(s)
      this.props.action("add", "line", points);
      this.props.updateState("plotEnabled", true);
      // Send line(s) to LineWindow
      this.props.action("line", [points]);
      this.map.removeInteraction(draw);
      this._drawing = false;
      setTimeout(
        function() { this.controlDoubleClickZoom(true); }.bind(this),
        251
      );
    }.bind(this));
    this.map.addInteraction(draw);
  }

  area() {
    if (this.removeMapInteractions("Polygon")) {
      return;
    }

    this._drawing = true;

    this.resetMap();
    const draw = new olinteraction.Draw({
      source: this.vectorSource,
      type: "Polygon"
    });
    draw.set("type", "Polygon");
    draw.on("drawend", function(e) {
      // Disable zooming when drawing
      this.controlDoubleClickZoom(false);
      const points = e.feature.getGeometry().getCoordinates()[0].map(
        function (c) {
          const lonlat = olproj.transform(c, this.props.state.projection,"EPSG:4326");
          return [lonlat[1], lonlat[0]];
        }.bind(this)
      );
      const area = {
        polygons: [points],
        innerrings: [],
        name: "",
      };
      // Draw area on map(s)
      this.props.action("add", "area", points);
      this.props.updateState("plotEnabled", true);
      // Send area to AreaWindow
      this.props.action("area", [area]);
      this.map.removeInteraction(draw);
      this._drawing = false;
      setTimeout(
        function() {this.controlDoubleClickZoom(true); }.bind(this),
        251
      );
    }.bind(this));
    this.map.addInteraction(draw);
  }

  componentDidUpdate(prevProps, prevState) {
    const datalayer = this.map.getLayers().getArray()[1];
    const old = datalayer.getSource();
    const props = old.getProperties();
    props.url = "/tiles/v0.1" + 
                `/${this.props.options.interpType}` + 
                `/${this.props.options.interpRadius}` +
                `/${this.props.options.interpNeighbours}` +
                `/${this.props.state.projection}` + 
                `/${this.props.state.dataset}` + 
                `/${this.props.state.variable}` + 
                `/${this.props.state.time}` + 
                `/${this.props.state.depth}` + 
                `/${this.props.scale}` + 
                "/{z}/{x}/{y}.png";
    props.projection = this.props.state.projection;
    props.attributions = [
      new olcontrol.Attribution({
        html: this.props.state.dataset_attribution,
      }),
    ];

    CURRENT_PROJ = this.props.state.projection;

    const newSource = new olsource.XYZ(props);

    datalayer.setSource(newSource);

    // Update colour scale
    if (this.scaleViewer != null) {
      this.map.removeControl(this.scaleViewer);
    }
    this.scaleViewer = new app.ScaleViewer({
      image: (
        `/scale/${this.props.state.dataset}` +
        `/${this.props.state.variable}` +
        `/${this.props.scale}.png`
      )
    });
    this.map.addControl(this.scaleViewer);
    if (prevProps.state.projection != this.props.state.projection) {
      this.resetMap();
      this.layer_basemap = this.getBasemap(
        this.props.state.basemap,
        this.props.state.projection,
        this.props.state.basemap_attribution
      );
      this.map.getLayers().setAt(0, this.layer_basemap);
      this.mapView = new ol.View({
        projection: this.props.state.projection,
        center: olproj.transform(
          DEF_CENTER[this.props.state.projection],
          "EPSG:4326",
          this.props.state.projection
        ),
        zoom: DEF_ZOOM[this.props.state.projection],
        minZoom: MIN_ZOOM[this.props.state.projection],
        maxZoom: MAX_ZOOM[this.props.state.projection],
      });

      // Update bathymetry
      this.layer_bath.setSource(
        new olsource.XYZ({
          url: (
            `/tiles/bath/${this.props.state.projection}` +
            "/{z}/{x}/{y}.png"
          ),
          projection: this.props.state.projection,
        })
      );

      // Update Hi-res bath layer
      this.layer_bathshapes.setSource(
        new olsource.VectorTile({
          format: new olformat.MVT(),
          tileGrid: this.vectorTileGrid,
          tilePixelRatio: 8,
          url: `/api/v1.0/mbt/${this.props.state.projection}/bath/{z}/{x}/{y}`,
        })
      );

      // Update Hi-res land layer
      this.layer_landshapes.setSource(
        new olsource.VectorTile({
          format: new olformat.MVT(),
          tileGrid: this.vectorTileGrid,
          tilePixelRatio: 8,
          url: `/api/v1.0/mbt/${this.props.state.projection}/lands/{z}/{x}/{y}`,
          projection: this.props.state.projection,
        })
      );

      //this.mapView.on("change:resolution", this.constrainPan.bind(this));
      //this.mapView.on("change:center", this.constrainPan.bind(this));
      this.map.setView(this.mapView);
    }

    if (prevProps.state.basemap != this.props.state.basemap ||
        prevProps.state.basemap_attribution != this.props.state.basemap_attribution ||
        prevProps.options.topoShadedRelief != this.props.options.topoShadedRelief
    ) {
      this.layer_basemap = this.getBasemap(
        this.props.state.basemap,
        this.props.state.projection,
        this.props.state.basemap_attribution
      );
      this.map.getLayers().setAt(0, this.layer_basemap);
    }

    for (let prop of ["projection", "dataset", "variable", "depth", "time"]) {
      if (prevProps.state[prop] != this.props.state[prop]) {
        this.infoOverlay.setPosition(undefined);
        break;
      }
    }

    this.layer_bath.setOpacity(this.props.options.mapBathymetryOpacity);
    this.layer_bath.setVisible(this.props.options.bathymetry);

    this.map.render();
  }

  refreshFeatures(e) {
    var extent = this.mapView.calculateExtent(this.map.getSize());
    var resolution = this.mapView.getResolution();

    if (this.vectorSource.getState() == "ready") {
      var dorefresh = this.vectorSource.forEachFeatureIntersectingExtent(
        extent,
        function(f) {
          return f.get("resolution") > Math.round(resolution);
        }
      );

      if (dorefresh) {
        var projection = this.mapView.getProjection();
        this.loader(extent, resolution, projection);
      }
    }
  }

  /*
  constrainPan(e) {
    const view = e.target;

    var visible = view.calculateExtent(this.map.getSize());
    var centre = view.getCenter();
    var delta;
    var adjust = false;

    var maxExtent = view.getProjection().getExtent();

    if (this.props.state.projection != "EPSG:3857") {
      if ((delta = maxExtent[0] - visible[0]) > 0) {
        adjust = true;
        centre[0] += delta;
      } else if ((delta = maxExtent[2] - visible[2]) < 0) {
        adjust = true;
        centre[0] += delta;
      }
    }
    if ((delta = maxExtent[1] - visible[1]) > 0) {
      adjust = true;
      centre[1] += delta;
    } else if ((delta = maxExtent[3] - visible[3]) < 0) {
      adjust = true;
      centre[1] += delta;
    }
    if (adjust) {
      view.setCenter(centre);
    }
  }
  */
  
  show(type, key) {
    this.resetMap();
    this.props.updateState(["vectorid", "vectortype"], [key, type]);
  }

  add(type, data, name) {
    if (this._mounted) {
      this.resetMap();
    }

    var geom;
    var feat;
    switch(type) {
      case "point":
        this.props.updateState("point", data);
        this.props.updateState("modal", "point");
        this.props.updateState("names", data[0]);
        for (let c of data) {
          geom = new olgeom.Point([c[1], c[0]]);
          geom.transform("EPSG:4326", this.props.state.projection);
          feat = new ol.Feature({
            geometry: geom,
            name: c[0].toFixed(4) + ", " + c[1].toFixed(4),
            type: "point",
          });
          this.vectorSource.addFeature(feat);
        }
        break;
      case "line":
        this.props.updateState("line", [data]);
        this.props.updateState("modal", "line");
        this.props.updateState("names", data);
        geom = new olgeom.LineString(data.map(function (c) {
          return [c[1], c[0]];
        }));
        
        geom.transform("EPSG:4326", this.props.state.projection);
        feat = new ol.Feature({
          geometry: geom,
          name: name,
          type: "line",
        });
        //this.props.action("add", "line", points);
        this.vectorSource.addFeature(feat);
        break;
      case "area":
        this.props.updateState("area", [{
          "innerrings": [],
          "name": "",
          "polygons": [data]
        }]);
        this.props.updateState("modal", "area");
        this.props.updateState("names", data);
        geom = new olgeom.Polygon([data.map(function (c) {
          return [c[1], c[0]];
        })]);
        const centroid = olextent.getCenter(geom.getExtent());
        geom.transform("EPSG:4326", this.props.state.projection);
        feat = new ol.Feature({
          geometry: geom,
          name: name,
          type: "area",
          centroid: centroid,
        });
        this.vectorSource.addFeature(feat);
        break;
      case "observation":
        for (let p of data) {
          geom = new olgeom.Point([p.longitude, p.latitude]);
          geom.transform("EPSG:4326", this.props.state.projection);
          feat = new ol.Feature({
            geometry: geom,
            name: String(p.station),
            type: "point",
            observation: p,
          });
          this.vectorSource.addFeature(feat);
        }
        break;
    }

    const viewExtent = this.map.getView().calculateExtent(this.map.getSize());
    if (!olextent.containsExtent(viewExtent, this.vectorSource.getExtent()) ) {
      this.map.getView().fit(this.vectorSource.getExtent(), this.map.getSize());
    }
  }

  render() {
    return (
      <div className='Map'>
        <div ref={(c) => this.map.setTarget(c)} />
        <div
          className='title ol-popup'
          ref={(c) => this.popupElement = c}
        >Empty</div>
        <div
          className='ballon ol-popup'
          ref={(c) => this.infoPopup = c}
        >
          <div className={"balloonClose"}>
            <a href="#"  title={_("Close")} ref={(c) => this.infoPopupCloser = c}></a>
          </div>
          <div className={"balloonLaunch"}>
            <a href="#" style={{right:"5px", top:"20px"}} title={_("Plot Point")} ref={(c) => this.infoPopupLauncher = c}></a>
          </div>      
        
          <div ref={(c) => this.infoPopupContent = c}></div>
        </div>
      </div>
    );
  }
}

//***********************************************************************
Map.propTypes = {
  state: PropTypes.object,
  projection: PropTypes.string,
  updateState: PropTypes.func,
  scale: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
  action: PropTypes.func,
  partner: PropTypes.object,
  options: PropTypes.object,
};
