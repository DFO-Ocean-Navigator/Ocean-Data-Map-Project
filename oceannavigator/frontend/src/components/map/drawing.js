import Feature from "ol/Feature.js";
import * as olExtent from "ol/extent";
import Draw from "ol/interaction/Draw";
import * as olgeom from "ol/geom";
import * as olProj from "ol/proj";
import { getDistance } from "ol/sphere";

export const drawAction = (vectorSource, vectorType, projection, action) => {
  const drawAction = new Draw({
    source: vectorSource,
    type: "Point",
    stopClick: true,
    wrapX: true,
  });

  drawAction.set("type", vectorType);
  drawAction.on("drawend", function (e) {
    // Disable zooming when drawing
    const latlon = olProj
      .transform(
        e.feature.getGeometry().getCoordinates(),
        projection,
        "EPSG:4326"
      )
      .reverse();
    // Draw point on map(s)
    action("addPoints", [latlon]);
  });
  return drawAction;
};

export const pointFeature = (
  vectorType,
  vectorCoordinates,
  vectorSource,
  projection
) => {
  if (vectorCoordinates.length < 2) {
    vectorType = "point";
  }

  let geom;
  let feat;

  switch (vectorType) {
    case "point":
      for (let c of vectorCoordinates) {
        geom = new olgeom.Point([c[1], c[0]]);
        geom = geom.transform("EPSG:4326", projection);
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
        vectorCoordinates.map(function (c) {
          return [c[1], c[0]];
        })
      );

      geom.transform("EPSG:4326", projection);
      feat = new Feature({
        geometry: geom,
        type: "line",
      });

      vectorSource.addFeature(feat);
      break;
    case "area":
      geom = new olgeom.Polygon([
        vectorCoordinates.map(function (c) {
          return [c[1], c[0]];
        }),
      ]);
      const centroid = olExtent.getCenter(geom.getExtent());
      geom.transform("EPSG:4326", projection);
      feat = new Feature({
        geometry: geom,
        type: "area",
        centroid: centroid,
      });
      vectorSource.addFeature(feat);
      break;
  }
};

export const getLineDistance = (line) => {
  var dist = 0;
  for (let i = 1; i < line.length; i++) {
    let start = [line[i - 1][1], line[i - 1][0]];
    let end = [line[i][1], line[i][0]];
    dist += getDistance(start, end);
  }

  return dist;
};

export const obsPointDrawAction = (map, obsDrawSource, projection, action) => {
  const drawAction = new Draw({
    source: obsDrawSource,
    type: "Point",
    stopClick: true,
  });
  drawAction.set("type", "Point");
  drawAction.on("drawend", function (e) {
    // Disable zooming when drawing
    const lonlat = olProj.transform(
      e.feature.getGeometry().getCoordinates(),
      projection,
      "EPSG:4326"
    );

    // Send area to Observation Selector
    obsDrawSource.clear();
    action("setObsArea", [[lonlat[1], lonlat[0]]]);

    map.removeInteraction(drawAction);
  });

  return drawAction;
};

export const obsAreaDrawAction = (map, obsDrawSource, projection, action) => {
  const drawAction = new Draw({
    source: obsDrawSource,
    type: "Polygon",
    stopClick: true,
  });
  drawAction.set("type", "Polygon");
  drawAction.on("drawend", function (e) {
    // Disable zooming when drawing
    const points = e.feature
      .getGeometry()
      .getCoordinates()[0]
      .map(function (c) {
        const lonlat = olProj.transform(c, projection, "EPSG:4326");
        return [lonlat[1], lonlat[0]];
      });
    // Send area to Observation Selector
    action("setObsArea", points);
    map.removeInteraction(drawAction);
    setTimeout(function () {
      obsDrawSource.clear();
    }, 251);
  });

  return drawAction;
};
