import React, {
  forwardRef,
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
} from "react";
import { Map, View } from "ol";
import Feature from "ol/Feature.js";
import TileLayer from "ol/layer/Tile";
import { Style, Circle, Stroke, Fill, RegularShape } from "ol/style";
import VectorTile from "ol/source/VectorTile";
import VectorTileLayer from "ol/layer/VectorTile.js";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector.js";
import GeoJSON from "ol/format/GeoJSON.js";
import MVT from "ol/format/MVT.js";
import XYZ from "ol/source/XYZ";
import Draw from "ol/interaction/Draw";
import * as olExtent from 'ol/extent';
import * as olinteraction from "ol/interaction";
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
  const [map, setMap] = useState(null);
  const [view, setView] = useState({});
  const [vectorSource, setVectorSource] = useState();

  useEffect(() => {
    let options = {
      view: new View({ zoom: 4, center: [-50, 53] }),
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
      overlays: [],
    };
    let mapObject = new Map(options);
    mapObject.setTarget(mapRef.current);
    setMap(mapObject);

    let newVectorSource = new VectorSource({
      features: [],
      strategy: olLoadingstrategy.bbox,
      format: new GeoJSON(),
      // loader: this.loader.bind(this),
    });

    setVectorSource(newVectorSource);
  }, []);

  useEffect(() => {
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

    setView(mapView);
  }, [props.mapSettings]);

  useEffect(() => {
    if (map) {
      map.setView(view);
    }
  }, [view]);

  useEffect(() => {
    if (map) {
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
  }, [props.pointCoordinates, props.drawing.type]);

  useImperativeHandle(ref, () => ({
    draw: draw,
  }));

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

  const controlDoubleClickZoom = (active) => {
    const interactions = map.getInteractions();
    for (let i = 0; i < interactions.getLength(); i++) {
      const interaction = interactions.item(i);
      if (interaction instanceof olinteraction.DoubleClickZoom) {
        interaction.setActive(active);
      }
    }
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
    source: new XYZ(getDataSource()),
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
              // text: new Text({
              //   text: feat.get("name"),
              //   font: "14px sans-serif",
              //   fill: new Fill({
              //     color: "#000",
              //   }),
              //   stroke: new Stroke({
              //     color: "#FFFFFF",
              //     width: 2,
              //   }),
              // }),
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
    });
    drawAction.set("type", props.drawing.type);
    drawAction.on("drawend", function (e) {
      // Disable zooming when drawing
      controlDoubleClickZoom(false);
      const latlon = olProj
        .transform(
          e.feature.getGeometry().getCoordinates(),
          props.mapSettings.projection,
          "EPSG:4326"
        )
        .reverse();
      // Draw point on map(s)
      props.action("addPoints", latlon);
      setTimeout(() => {
        controlDoubleClickZoom(true);
      }, 251);
    });
    map.addInteraction(drawAction);
  };

  const drawPoints = () => {
    let geom;
    let feat;
    switch (props.drawing.type) {
      case "point":
        for (let c of props.pointCoordinates) {
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
          props.pointCoordinates.map(function (c) {
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
          props.pointCoordinates.map(function (c) {
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
    <div
      style={{ height: "100vh", width: "100%" }}
      ref={mapRef}
      id="map-container"
      className="map-container"
    />
  );
});

export default GlobalMap;
