const DATASET_DEFAULTS = Object.freeze({
  id: "giops_day",
  attribution: "",
  quantum: "day",
  depth: 0,
  time: 2292451200,
  starttime: 2292451200,
  variable: "votemper",
  quiverVariable: "none",
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

export { DATASET_DEFAULTS, MAP_DEFAULTS };
