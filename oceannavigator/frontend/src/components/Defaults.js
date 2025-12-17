const DATASET_DEFAULTS = Object.freeze({
  id: "giops_day",
  model_class: "Mercator",
  attribution: "",
  quantum: "day",
  depth: 0,
  time: -1,
  starttime: -1,
  variable: "votemper",
  quiverVariable: "None",
  quiverDensity: 0,
  variable_scale: [-5, 30],
  variable_two_dimensional: false,
});

const MAP_DEFAULTS = Object.freeze({
  interpType: "gaussian",
  interpRadius: 25, // km
  interpNeighbours: 10,
  mapBathymetryOpacity: 0.75, // Opacity of bathymetry contours
  topoShadedRelief: false, // Show relief mapping on topography
  bathymetry: true, // Show bathymetry contours
  bathyContour: "etopo1",
});

const DATASET_FILTER_DEFAULTS = {
  variable: "any",
  vectorVariable: "none",
  depth: "all",
  date: null,
  location: ["", ""]
};

export { DATASET_DEFAULTS, MAP_DEFAULTS, DATASET_FILTER_DEFAULTS };
