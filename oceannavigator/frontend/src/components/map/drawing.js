import Draw from "ol/interaction/Draw";
import { transform } from "ol/proj";
import { getDistance } from "ol/sphere";

export const getDrawAction = (vectorSource, featureType) => {
  const drawAction = new Draw({
    source: vectorSource,
    type: featureType,
    stopClick: true,
    wrapX: true,
  });

  drawAction.on("drawend", function (e) {
    e.feature.setId("id" + Math.random().toString(16).slice(2))
    e.feature.setProperties({type: featureType})
  });
  return drawAction;
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
    const lonlat = transform(
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
        const lonlat = transform(c, projection, "EPSG:4326");
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
