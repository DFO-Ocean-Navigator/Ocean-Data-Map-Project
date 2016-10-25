import React from 'react';
import ol from 'openlayers';
// ol = require('openlayers/dist/ol-debug.js');
require('openlayers/css/ol.css');
var proj4 = require('proj4/lib/index.js');

ol.proj.setProj4(proj4);

var X_IMAGE = require('../images/x.png');

var app = {};
var COLORS = [
    [ 0, 0, 255 ],
    [ 0, 128, 0 ],
    [ 255, 0, 0 ],
    [ 0, 255, 255 ],
    [ 255, 0, 255 ],
    [ 255, 255, 0 ],
    [ 0, 0, 0 ],
    [ 255, 255, 255 ],
];

var DEF_CENTER = {
    'EPSG:3857': [-50, 53],
    'EPSG:32661': [0, 90],
    'EPSG:3031': [0, -90],
};

var DEF_ZOOM = {
    'EPSG:3857': 4,
    'EPSG:32661': 2,
    'EPSG:3031': 2,
};

var MIN_ZOOM = {
    'EPSG:3857': 1,
    'EPSG:32661': 2,
    'EPSG:3031': 2,
};

var MAX_ZOOM = {
    'EPSG:3857': 8,
    'EPSG:32661': 5,
    'EPSG:3031': 5,
};

var drifter_color = {};

var TOPO_ATTRIBUTION = new ol.Attribution({
    html: 'Togographical Data from <a href="https://www.ngdc.noaa.gov/mgg/global/">ETOPO1</a>',
});

app.ScaleViewer = function(opt_options) {
    var options = opt_options || {};

    var scale = document.createElement('img');
    scale.setAttribute('src', options.image);

    var element = document.createElement('div');
    element.className = 'scale-viewer ol-unselectable ol-control';
    element.appendChild(scale);

    ol.control.Control.call(this, {
        element: element,
        target: options.target
    });
}
ol.inherits(app.ScaleViewer, ol.control.Control);

proj4.defs('EPSG:32661', '+proj=stere +lat_0=90 +lat_ts=90 +lon_0=0 +k=0.994 +x_0=2000000 +y_0=2000000 +ellps=WGS84 +datum=WGS84 +units=m +no_defs');
var proj32661 = ol.proj.get('EPSG:32661');
proj32661.setWorldExtent([-180.0, 60.0, 180.0, 90.0]);
proj32661.setExtent([-1154826.7379766018, -1154826.7379766018, 5154826.737976602, 5154826.737976601]);

proj4.defs('EPSG:3031', '+proj=stere +lat_0=-90 +lat_ts=-71 +lon_0=0 +k=1 +x_0=0 +y_0=0 +ellps=WGS84 +datum=WGS84 +units=m +no_defs');
var proj3031 = ol.proj.get('EPSG:3031');
proj3031.setWorldExtent([-180.0, -90.0, 180.0, -60.0]);
proj3031.setExtent([-3087442.3458218463, -3087442.3458218463, 3087442.345821846, 3087442.345821846]);


class Map extends React.Component {
    constructor(props) {
        super(props);

        this.loader = function(extent, resolution, projection) {
            if (this.props.state.vectortype) {
                $.ajax({
                    url: `/api/${this.props.state.vectortype}/${projection.getCode()}/${Math.round(resolution)}/${extent.map(function (i) { return Math.round(i);})}/${this.props.state.vectorid}.json`,
                    success: function(response) {
                        var features = (new ol.format.GeoJSON()).readFeatures(response, {
                            featureProjection: this.props.state.projection,
                        });
                        var featToAdd = []
                        for (var feat of features) {
                            var id = feat.get("name");
                            feat.setId(id);
                            if (feat.get("error") != null) {
                                feat.set("name", feat.get("name") + "<span>RMS Error: " + feat.get("error").toPrecision(3) + "</span>");
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
        this.vectorSource = new ol.source.Vector({
            features: [],
            strategy: ol.loadingstrategy.bbox,
            format: new ol.format.GeoJSON(),
            loader: this.loader.bind(this),
        });

        this.map = new ol.Map({
            layers: [
                new ol.layer.Tile({
                    source: new ol.source.XYZ({
                        url: `/tiles/topo/${this.props.state.projection}/{z}/{x}/{y}.png`,
                        projection: this.props.state.projection,
                        attributions: [
                            TOPO_ATTRIBUTION,
                        ],
                    })
                    // source: new ol.source.XYZ({
                    //     attributions: [
                    //         new ol.Attribution({
                    //             html: 'Tiles &copy; <a href="http://services.arcgisonline.com/ArcGIS/' +
                    //                 'rest/services/Ocean_Basemap/MapServer">ArcGIS</a>'
                    //         })
                    //     ],
                    //     url: 'http://server.arcgisonline.com/ArcGIS/rest/services/' +
                    //         'Ocean_Basemap/MapServer/tile/{z}/{y}/{x}',
                    //     projection: 'EPSG:3857',
                    // })
                }),
                new ol.layer.Tile({
                    source: new ol.source.XYZ({
                        attributions: [
                            new ol.Attribution({
                                html: 'CONCEPTS',
                            })
                        ],
                    })
                }),
                new ol.layer.Vector({
                    source: this.vectorSource,
                    style: function(feat, res) {
                        if (feat.get("type") == "area") {
                            return [
                                new ol.style.Style({
                                    stroke: new ol.style.Stroke({
                                        color: '#000000',
                                        width: 1,
                                    }),
                                }),
                                new ol.style.Style({
                                    geometry: new ol.geom.Point(ol.proj.transform(feat.get("centroid"), 'EPSG:4326', this.props.state.projection)),
                                    text: new ol.style.Text({
                                        text: feat.get("name"),
                                        fill: new ol.style.Fill({
                                            color: '#000',
                                        }),
                                    }),
                                }),
                            ];
                        } else if (feat.get("type") == "drifter") {
                            var start = feat.getGeometry().getCoordinateAt(0);
                            var end = feat.getGeometry().getCoordinateAt(1);
                            var endImage;
                            var color = drifter_color[feat.get("name")];
                            if (color == undefined) {
                                color = COLORS[Object.keys(drifter_color).length % COLORS.length];
                                drifter_color[feat.get("name")] = color;
                            }
                            if (feat.get("status") == 'inactive' || feat.get("status") == 'not responding') {
                                endImage = new ol.style.Icon({
                                    src: X_IMAGE,
                                    scale: 0.75,
                                });
                            } else {
                                endImage = new ol.style.Circle({
                                    radius: 4,
                                    fill: new ol.style.Fill({
                                        color: '#ff0000',
                                    }),
                                    stroke: new ol.style.Stroke({
                                        color: '#000000',
                                        width: 1
                                    }),
                                });
                            }

                            var styles = [
                                new ol.style.Style({
                                    stroke: new ol.style.Stroke({
                                        color: color,
                                        width: 2
                                    })
                                }),
                                new ol.style.Style({
                                    geometry: new ol.geom.Point(end),
                                    image: endImage,
                                }),
                                new ol.style.Style({
                                    geometry: new ol.geom.Point(start),
                                    image: new ol.style.Circle({
                                        radius: 4,
                                        fill: new ol.style.Fill({
                                            color: '#008000',
                                        }),
                                        stroke: new ol.style.Stroke({
                                            color: '#000000',
                                            width: 1
                                        }),
                                    }),
                                }),
                            ];

                            return styles;
                        } else if (feat.get("type") == "class4") {
                            var red = Math.min(255, 255 * (feat.get("error_norm") / 0.5));
                            var green = Math.min(255, 255 * (1 - feat.get("error_norm")) / 0.5);
                            return new ol.style.Style({
                                image: new ol.style.Circle({
                                    radius: 4,
                                    fill: new ol.style.Fill({
                                        color: [red, green, 0, 1],
                                    }),
                                    stroke: new ol.style.Stroke({
                                        color: '#000000',
                                        width: 1
                                    }),
                                }),
                            });
                        } else {
                            return new ol.style.Style({
                                stroke: new ol.style.Stroke({
                                    color: '#ff0000',
                                    width: 4
                                }),
                                image: new ol.style.Circle({
                                    radius: 4,
                                    fill: new ol.style.Fill({
                                        color: '#ff0000',
                                    }),
                                    stroke: new ol.style.Stroke({
                                        color: '#000000',
                                        width: 1
                                    }),
                                }),
                            });
                        }
                    }.bind(this),
                }),
            ],
            controls: ol.control.defaults({
                zoom: true,
                attributionOptions: ({
                    collapsible: true
                })
            }).extend([
                new ol.control.MousePosition({
                    projection: 'EPSG:4326',
                    coordinateFormat: function(c) {
                        return "<div>" + c[1].toFixed(4) + ", " + c[0].toFixed(4) + "</div>";
                    }
                }),
                new ol.Graticule({
                    strokeStyle: new ol.style.Stroke({color: 'rgba(128, 128, 128, 0.9)', lineDash: [0.5, 4]})
                }),
            ])
        });
        this.map.on('moveend', this.refreshFeatures.bind(this));
        this.map.on('moveend', function() {
            var c = ol.proj.transform(this.mapView.getCenter(), this.props.state.projection, 'EPSG:4326').map(function(c) {return c.toFixed(4);});
            this.props.updateState("center", c);
            this.props.updateState("zoom", this.mapView.getZoom());
        }.bind(this));

        var center = [-50, 53];
        if (this.props.state.center) {
            center = this.props.state.center.map(parseFloat);
        }
        var zoom = 4;
        if (this.props.state.zoom) {
            zoom = this.props.state.zoom;
        }
        var projection = this.props.state.projection;
        
        this.mapView = new ol.View({
            center: ol.proj.transform(center, 'EPSG:4326', projection),
            projection: projection,
            zoom: zoom,
            maxZoom: MAX_ZOOM[this.props.state.projection],
            minZoom: MIN_ZOOM[this.props.state.projection],
        });
        this.mapView.on('change:resolution', this.constrainPan.bind(this));
        this.mapView.on('change:center', this.constrainPan.bind(this));
        this.map.setView(this.mapView);

        this.map.on('pointermove', function(e) {
            var feature = this.map.forEachFeatureAtPixel(this.map.getEventPixel(e.originalEvent), function(feature, layer) {
                return feature;
            });
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

        var select = new ol.interaction.Select({
            style: function(feat, res) {
                if (feat.get("type") == "area") {
                    return [
                        new ol.style.Style({
                            stroke: new ol.style.Stroke({
                                color: '#0099ff',
                                width: 3,
                            }),
                        }),
                        new ol.style.Style({
                            geometry: new ol.geom.Point(ol.proj.transform(feat.get("centroid"), 'EPSG:4326', this.props.state.projection)),
                            text: new ol.style.Text({
                                text: feat.get("name"),
                                fill: new ol.style.Fill({
                                    color: '#0099ff',
                                }),
                            }),
                        }),
                    ];
                } else {
                    return new ol.style.Style({
                        stroke: new ol.style.Stroke({
                            color: '#0099ff',
                            width: 4
                        }),
                        image: new ol.style.Circle({
                            radius: 4,
                            fill: new ol.style.Fill({
                                color: '#0099ff',
                            }),
                            stroke: new ol.style.Stroke({
                                color: '#ffffff',
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

        var dragBox = new ol.interaction.DragBox({
            condition: ol.events.condition.platformModifierKeyOnly
        });
        this.map.addInteraction(dragBox);

        var pushSelection = function() {
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
                            var c = feature.getGeometry().clone().transform(this.props.state.projection, 'EPSG:4326').getCoordinates();
                            content.push([c[1], c[0]]);
                            break;
                        case "line":
                            content.push(feature.getGeometry().clone().transform(this.props.state.projection, 'EPSG:4326').getCoordinates().map(function(o) {
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
                                var points = feature.getGeometry().clone().transform(this.props.state.projection, 'EPSG:4326').getCoordinates().map(function(o) {
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
                    names.push(feature.get("name").replace(/<span>.*>/, ''));
                }
            }.bind(this));

            if (t && ((t != "line" && t != "drifter" && t != "class4") || content.length == 1)) {
                this.props.updateState(t, content);
                this.props.updateState('modal', t);
                this.props.updateState('names', names);
                this.props.updateState('plotEnabled', true);
            } else {
                this.props.updateState('plotEnabled', false);
            }
        }.bind(this);

        select.on("select", function(e) {
            if (e.selected.length > 0 && (e.selected[0].line || e.selected[0].drifter)) {
                this.selectedFeatures.clear();
                this.selectedFeatures.push(e.selected[0]);
            }
            pushSelection();

            if (!e.mapBrowserEvent.originalEvent.shiftKey && e.selected.length > 0) {
                this.props.action("plot");
            }
        }.bind(this));

        dragBox.on('boxend', function() {
            var info = [];
            var extent = dragBox.getGeometry().getExtent();
            this.vectorSource.forEachFeatureIntersectingExtent(extent, function(feature) {
                this.selectedFeatures.push(feature);
            }.bind(this));

            pushSelection();
        }.bind(this));

        // clear selection when drawing a new box and when clicking on the map
        dragBox.on('boxstart', function() {
            this.selectedFeatures.clear();
            this.props.updateState('plotEnabled', false);
        }.bind(this));
    }

    componentDidMount() {
        this.overlay = new ol.Overlay({
            element: this.popupElement,
            autoPan: false,
            offset: [0, -10],
            positioning: 'bottom-center',
        });

        this.map.addOverlay(this.overlay);
    }


    point() {
        $(this.map.getTarget()).css("cursor", "crosshair");
        var listen = this.map.once('singleclick', function(e) {
            this.resetMap();
            var lonlat = ol.proj.transform(e.coordinate, this.props.state.projection,'EPSG:4326');
            while (lonlat[0] < -180) {
                lonlat[0] += 360;
            }
            while (lonlat[0] > 180) {
                lonlat[0] -= 360;
            }

            this.vectorSource.addFeature(new ol.Feature({
                geometry: new ol.geom.Point(e.coordinate)
            }));
            $(this.map.getTarget()).css("cursor", "");

            this.props.action("point", lonlat);
        }.bind(this));
    }

    resetMap() {
        this.props.updateState("vectortype", null);
        this.props.updateState("vectorid", null);
        this.selectedFeatures.clear();
        this.vectorSource.clear();
        this.overlay.setPosition(undefined);
    }

    line() {
        $(this.map.getTarget()).css("cursor", "crosshair");
        this.resetMap();
        var draw = new ol.interaction.Draw({
            source: this.vectorSource,
            type: 'LineString'
        });
        draw.on('drawend', function(e) {
            var points = e.feature.getGeometry().getCoordinates().map(function (c) {
                var lonlat = ol.proj.transform(c, this.props.state.projection,'EPSG:4326');
                return [lonlat[1], lonlat[0]];
            }.bind(this));
            this.props.action("line", [points]);
            this.map.removeInteraction(draw);
            $(this.map.getTarget()).css("cursor", "");
        }.bind(this));
        this.map.addInteraction(draw);
    }

    area() {
        this.resetMap();
        var draw = new ol.interaction.Draw({
            source: this.vectorSource,
            type: 'Polygon'
        });
        draw.on('drawend', function(e) {
            var points = e.feature.getGeometry().getCoordinates()[0].map(function (c) {
                var lonlat = ol.proj.transform(c, this.props.state.projection,'EPSG:4326');
                return [lonlat[1], lonlat[0]];
            }.bind(this));
            var area = {
                polygons: [points],
                innerrings: [],
                name: "",
            };
            this.props.action("area", [area]);
            this.map.removeInteraction(draw);
            $(this.map.getTarget()).css("cursor", "");
        }.bind(this));
        this.map.addInteraction(draw);
    }

    componentDidUpdate(prevProps, prevState) {
        var datalayer = this.map.getLayers().getArray()[1];
        var old = datalayer.getSource();
        var props = old.getProperties();
        props['url'] = `/tiles/${this.props.state.projection}/${this.props.state.dataset}/${this.props.state.variable}/${this.props.state.time}/${this.props.state.depth}/${this.props.state.scale}/{z}/{x}/{y}.png`;
        props['projection'] = this.props.state.projection;

        var newSource = new ol.source.XYZ(props);

        datalayer.setSource(newSource);

        if (this.scaleViewer != null) {
            this.map.removeControl(this.scaleViewer);
        }
        this.scaleViewer = new app.ScaleViewer({
            image: `/scale/${this.props.state.dataset}/${this.props.state.variable}/${this.props.state.scale}.png`
        });
        this.map.addControl(this.scaleViewer);
        if (prevProps.state.projection != this.props.state.projection) {
            this.resetMap();
            var baselayer = this.map.getLayers().getArray()[0];
            baselayer.setSource(new ol.source.XYZ({
                url: `/tiles/topo/${this.props.state.projection}/{z}/{x}/{y}.png`,
                projection: this.props.state.projection,
                attributions: [
                    TOPO_ATTRIBUTION,
                ],
            }));
            this.mapView = new ol.View({
                projection: this.props.state.projection,
                center: ol.proj.transform(DEF_CENTER[this.props.state.projection], 'EPSG:4326', this.props.state.projection),
                zoom: DEF_ZOOM[this.props.state.projection],
                minZoom: MIN_ZOOM[this.props.state.projection],
                maxZoom: MAX_ZOOM[this.props.state.projection],
            });

            this.mapView.on('change:resolution', this.constrainPan.bind(this));
            this.mapView.on('change:center', this.constrainPan.bind(this));
            this.map.setView(this.mapView);
        }

        this.map.render();
    }

    refreshFeatures(e) {
        var extent = this.mapView.calculateExtent(this.map.getSize());
        var resolution = this.mapView.getResolution();

        if (this.vectorSource.getState() == 'ready') {
            var dorefresh = this.vectorSource.forEachFeatureIntersectingExtent(extent, function(f) {
                return f.get("resolution") > Math.round(resolution);
            });

            if (dorefresh) {
                var projection = this.mapView.getProjection();
                this.loader(extent, resolution, projection);
            }
        }
    }

    constrainPan(e) {
        var view = e.target;

        var visible = view.calculateExtent(this.map.getSize());
        var centre = view.getCenter();
        var delta;
        var adjust = false;

        var maxExtent = view.getProjection().getExtent();

        if (this.props.state.projection != 'EPSG:3857') {
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

    show(type, key) {
        this.resetMap();
        this.props.updateState("vectorid", key);
        this.props.updateState("vectortype", type);
        this.vectorSource.vectortype = type;
        this.vectorSource.vectorid = key;
    }

    add(type, data, name) {
        this.resetMap();

        switch(type) {
            case "point":
                for (var c of data) {
                    var geom = new ol.geom.Point([c[1], c[0]]);
                    geom.transform('EPSG:4326', this.props.state.projection);
                    var feat = new ol.Feature({
                        geometry: geom,
                        name: c[0].toFixed(4) + ", " + c[1].toFixed(4),
                        type: "point",
                    });
                    this.vectorSource.addFeature(feat);
                }
                break;
            case "line":
                var geom = new ol.geom.LineString(data.map(function (c) {
                    return [c[1], c[0]];
                }));
                geom.transform('EPSG:4326', this.props.state.projection);
                var feat = new ol.Feature({
                    geometry: geom,
                    name: name,
                    type: "line",
                });
                this.vectorSource.addFeature(feat);
                break;
            case "area":
                var geom = new ol.geom.Polygon([data.map(function (c) {
                    return [c[1], c[0]];
                })]);
                var centroid = ol.extent.getCenter(geom.getExtent());
                geom.transform('EPSG:4326', this.props.state.projection);
                var feat = new ol.Feature({
                    geometry: geom,
                    name: name,
                    type: "area",
                    centroid: centroid,
                });
                this.vectorSource.addFeature(feat);
                break;
        }

        var viewExtent = this.map.getView().calculateExtent(this.map.getSize());
        if (!ol.extent.containsExtent(viewExtent, this.vectorSource.getExtent()) ) {
            this.map.getView().fit(this.vectorSource.getExtent(), this.map.getSize());
        }
    }

    render() {
        return (
            <div className='Map'>
                <div ref={(c) => this.map.setTarget(c)} />
                <div className='ol-popup' ref={(c) => this.popupElement = c}>Empty</div>
            </div>
        );
    }
}

export default Map;
