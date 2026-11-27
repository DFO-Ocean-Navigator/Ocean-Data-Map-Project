import { Style, Circle, Stroke, Fill, Text, RegularShape } from "ol/style";
import { LineString, Point } from "ol/geom";
import { toLonLat, transform } from "ol/proj";
import { isMobile } from "react-device-detect";

const OBS_COLORS = {
  argo: [255, 0, 0],
  mission: [255, 255, 0],
  drifter: [0, 255, 0],
  glider: [0, 255, 255],
  animal: [0, 0, 255],
};

const DRIFTER_COLORS = [
  [0, 128, 0],
  [255, 0, 255],
  [0, 0, 0],
  [255, 255, 255],
];

// CHS S111 standard arrows for quiver layer
import I0 from "../../images/s111/I0.svg";
import I1 from "../../images/s111/I1.svg";
import I2 from "../../images/s111/I2.svg";
import I3 from "../../images/s111/I3.svg";
import I4 from "../../images/s111/I4.svg";
import I5 from "../../images/s111/I5.svg";
import I6 from "../../images/s111/I6.svg";
import I7 from "../../images/s111/I7.svg";
import I8 from "../../images/s111/I8.svg";
import I9 from "../../images/s111/I9.svg";

const QUIVER_IMAGES = [I0, I1, I2, I3, I4, I5, I6, I7, I8, I9];

var drifter_color = {};

export function observationStyle(feature) {
  if (feature.getGeometry() instanceof LineString) {
    let color = OBS_COLORS[feature.get("type")];

    if (color === undefined) {
      color =
        DRIFTER_COLORS[
          Object.keys(drifter_color).length % DRIFTER_COLORS.length
        ];
      drifter_color[feature.get("id")] = color;
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
          color: "#555555",
          width: isMobile ? 6 : 4,
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
  let featureType = feature.get("type");
  switch (featureType) {
    case "argo":
      image = new Circle({
        radius: isMobile ? 6 : 4,
        fill: new Fill({ color: OBS_COLORS[featureType] }),
        stroke: stroke,
      });
      break;
    case "mission":
      image = new RegularShape({
        points: 3,
        radius: radius,
        fill: new Fill({ color: OBS_COLORS[featureType] }),
        stroke: stroke,
      });
      break;
    case "drifter":
      image = new RegularShape({
        points: 4,
        radius: radius,
        fill: new Fill({ color: OBS_COLORS[featureType] }),
        stroke: stroke,
      });
      break;
    case "glider":
      image = new RegularShape({
        points: 5,
        radius: radius,
        fill: new Fill({ color: OBS_COLORS[featureType] }),
        stroke: stroke,
      });
      break;
    case "animal":
      image = new RegularShape({
        points: 6,
        radius: radius,
        fill: new Fill({ color: OBS_COLORS[featureType] }),
        stroke: stroke,
      });
      break;
  }
  return new Style({ image: image });
}

export function polygonStyle(feature, projection) {
  if (feature.get("key")) {
    const styles = [
      new Style({
        stroke: new Stroke({
          color: "#ffffff",
          width: 5,
        }),
        fill: new Fill({
          color: "transparent",
        }),
      }),
      new Style({
        stroke: new Stroke({
          color: "#ff0000",
          width: 3,
        }),
      }),
    ];

    const textStyle = featureTextStyle(feature, "#000", "#ffffff", projection);
    if (textStyle) styles.push(textStyle);
    return styles;
  } else {
    const styles = [
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
    const textStyle = featureTextStyle(feature, "#000", "#ffffff", projection);
    if (textStyle) styles.push(textStyle);
    return styles;
  }
}

export function lineStyle(feature, projection) {
  const styles = [
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
  const textStyle = featureTextStyle(feature, "#000", "#ffffff", projection);
  if (textStyle) styles.push(textStyle);
  return styles;
}

export function pointStyle() {
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
}

export function drifterStyle(feature) {
  const start = feature.getGeometry().getCoordinateAt(0);
  const end = feature.getGeometry().getCoordinateAt(1);
  let endImage;
  let color = drifter_color[feature.get("name")];

  if (color === undefined) {
    color =
      DRIFTER_COLORS[Object.keys(drifter_color).length % DRIFTER_COLORS.length];
    drifter_color[feature.get("name")] = color;
  }
  if (
    feature.get("status") == "inactive" ||
    feature.get("status") == "not responding"
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
      geometry: new Point(end),
      image: endImage,
    }),
    new Style({
      geometry: new Point(start),
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

export function class4Style(feature) {
  const red = Math.min(255, 255 * (feature.get("error_norm") / 0.5));
  const green = Math.min(255, (255 * (1 - feature.get("error_norm"))) / 0.5);

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

export function featureTextStyle(
  feature,
  textColor = "#000",
  strokeColor = "#ffffff",
  projection = null,
) {
  if (!feature.get("name")) return null;

  const type = feature.get("type");
  let geometry = undefined;
  let textBaseline = "middle";
  let offsetY = 0;

  if (type === "LineString") {
    // For LineString
    textBaseline = "bottom";
    offsetY = -8;
  } else if (type === "Polygon") {
    if (!feature.get("centroid")) {
      let centroid = feature.getGeometry().getInteriorPoint().getCoordinates();
      feature.set("centroid", toLonLat(centroid).slice(0, 2));
    }
    geometry = new Point(
      transform(feature.get("centroid"), "EPSG:4326", projection),
    );
  }

  return new Style({
    geometry: geometry,
    text: new Text({
      text: feature.get("name"),
      font: "14px sans-serif",
      fill: new Fill({ color: textColor }),
      stroke: new Stroke({ color: strokeColor, width: 2 }),
      textAlign: "center",
      textBaseline: textBaseline,
      offsetY: offsetY,
    }),
  });
}

export function quiverStyle(feature, res) {
  let scale = feature.get("scale");
  let rotation = null;

  const deg2rad = (deg) => (deg * Math.PI) / 180.0;

  if (!feature.get("bearing")) {
    rotation = deg2rad(parseFloat(feature.get("data")));
  } else {
    rotation = deg2rad(parseFloat(feature.get("bearing")));
  }
  return new Style({
    image: new Icon({
      scale: 0.2 + (scale + 1) / 16,
      src: QUIVER_IMAGES[scale],
      opacity: 1,
      anchor: anchor,
      rotation: rotation,
    }),
  });
}

export function selectStyle(feat, res) {
  const styles = [
    new Style({
      stroke: new Stroke({ color: "#0099ff", width: 4 }),
      image: new Circle({
        radius: 4,
        fill: new Fill({ color: "#0099ff" }),
        stroke: new Stroke({ color: "#ffffff", width: 1 }),
      }),
    }),
  ];
  const textStyle = featureTextStyle(
    feat,
    "#000",
    "#ffffff",
    props.mapSettings,
  );
  if (textStyle && feat.get("type") !== "class4") styles.push(textStyle);

  return styles;
}
