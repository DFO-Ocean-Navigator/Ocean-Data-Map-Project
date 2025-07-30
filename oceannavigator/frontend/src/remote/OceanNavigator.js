// Cannot use async/awat syntax here since we still have clients
// that use IE which doesn't support that.

// const axios = require('axios');
import axios from "axios";
import { cacheAdapterEnhancer } from "axios-extensions";
import adapter from "axios/lib/adapters/xhr";

const instance = axios.create({
  headers: { "Cache-Control": "no-cache" },
  adapter: cacheAdapterEnhancer(adapter),
});

export function GetDatasetsPromise() {
  return instance.get("/api/v2.0/datasets");
}

export function GetVariablesPromise(dataset) {
  return instance.get(`/api/v2.0/dataset/${dataset}/variables`);
}

export function GetTimestampsPromise(dataset, variable) {
  return instance.get(
    "/api/v2.0/dataset/" + dataset + "/" + variable + "/timestamps"
  );
}

export function GetDepthsPromise(dataset, variable) {
  return instance.get("/api/v2.0/dataset/" + dataset + "/" + variable + "/depths", {
    params: {
      include_all_key: true,
    },
  });
}

export function GetPresetPointsPromise() {
  return instance.get("/api/v2.0/kml/point");
}

export function GetPresetLinesPromise() {
  return instance.get("/api/v2.0/kml/line");
}

export function GetPresetAreasPromise() {
  return instance.get("/api/v2.0/kml/area");
}

export function GetClass4Promise() {
  return instance.get("/api/v2.0/class4");
}
// Get all datasets (initial load)
export function GetAllDatasetsPromise() {
  return instance.get('/api/v2.0/datasets/all');
}

// Filter datasets by variable
export function FilterDatasetsByVariablePromise(datasetIds, variable) {
  return instance.post('/api/v2.0/datasets/filter/variable', 
    { dataset_ids: datasetIds },
    { params: { variable } }
  );
}

// Filter datasets by quiver variable
export function FilterDatasetsByQuiverVariablePromise(datasetIds, quiverVariable) {
  return instance.post('/api/v2.0/datasets/filter/quiver_variable', 
    { dataset_ids: datasetIds },
    { params: { quiver_variable: quiverVariable } }
  );
}

// Filter datasets by depth
export function FilterDatasetsByDepthPromise(datasetIds, hasDepth, variable = null) {
  const params = { has_depth: hasDepth };
  if (variable) {
    params.variable = variable;
  }
  
  return instance.post('/api/v2.0/datasets/filter/depth', 
    { dataset_ids: datasetIds },
    { params }
  );
}

// Filter datasets by date
export function FilterDatasetsByDatePromise(datasetIds, targetDate) {
  return instance.post('/api/v2.0/datasets/filter/date', 
    { dataset_ids: datasetIds },
    { params: { target_date: targetDate } }
  );
}

// Filter datasets by location

export function FilterDatasetsByLocationPromise(datasetIds, latitude, longitude, tolerance = 0.1) {
  return instance.post('/api/v2.0/datasets/filter/location', 
    { dataset_ids: datasetIds },
    { 
      params: { 
        latitude: latitude, 
        longitude: longitude,
        tolerance: tolerance
      } 
    }
  );
}
//returns a complete list of variables for users to select
export function GetAllVariablesPromise() {
  return instance.get("/api/v2.0/datasets/variables/all")
}

//returns a complete list of vector-variables for users to select
export function GetAllQuiverVariablesPromise() {
  return instance.get("/api/v2.0/datasets/quiver-variables/all")
}

export function SearchDatasetsPromise(filters) {
  const params = new URLSearchParams();
  
  if (filters.variable && filters.variable.value && filters.variable.value !== "any") {
    params.append("variable", filters.variable.value);
  }
  
  if (filters.quiverVariable && filters.quiverVariable.value && 
      filters.quiverVariable.value !== "any" && filters.quiverVariable.value !== "none") {
    params.append("quiver_variable", filters.quiverVariable.value);
  }
  
  // Updated to use hasDepth instead of depth
  if (filters.hasDepth && filters.hasDepth.value && filters.hasDepth.value !== "both") {
    params.append("has_depth", filters.hasDepth.value);
  }
  
  if (filters.date) {
    const dateISO = filters.date.toISOString();
    params.append("start_date", dateISO);
  }
  
  if (filters.latitude && filters.longitude) {
    const lat = parseFloat(filters.latitude);
    const lon = parseFloat(filters.longitude);
    if (!isNaN(lat) && !isNaN(lon)) {
      params.append("latitude", lat);
      params.append("longitude", lon);
    }
  }
  
  const url = `/api/v2.0/datasets/search${params.toString() ? '?' + params.toString() : ''}`;
  return instance.get(url);
}

export function GetTrackTimeRangePromise(track) {
  return instance.get(`/api/v2.0/observation/tracktimerange/${track}.json`);
}