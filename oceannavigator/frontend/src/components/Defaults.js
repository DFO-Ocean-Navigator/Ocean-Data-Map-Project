const DATASET_DEFAULTS = Object.freeze({
  id: "giops_day",
  model_class: "Mercator",
  attribution: "",
  quantum: "day",
  depth: 0,
  time: { id: -1, value: "" },
  starttime: { id: -1, value: "" },
  variable: {
    id: "votemper",
    value: "Potential Temperature",
    scale: [-5, 30],
    interp: null,
    two_dimensional: false,
    vector_variable: false,
  },
  quiverVariable: "none",
  quiverDensity: 0,
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
  location: ["", ""],
};

export { DATASET_DEFAULTS, MAP_DEFAULTS, DATASET_FILTER_DEFAULTS };
