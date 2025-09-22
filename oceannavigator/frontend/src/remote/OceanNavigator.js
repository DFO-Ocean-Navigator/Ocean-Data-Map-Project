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
  return instance.get(
    "/api/v2.0/dataset/" + dataset + "/" + variable + "/depths",
    {
      params: {
        include_all_key: true,
      },
    }
  );
}

export function FilterDatasetsByVariablePromise(datasetIds, variable) {
  const params = new URLSearchParams({
    variable: variable,
  });

  if (datasetIds && datasetIds.length > 0) {
    params.append("dataset_ids", datasetIds.join(","));
  }

  return instance.get(
    `/api/v2.0/datasets/filter/variable?${params.toString()}`
  );
}

// Filter datasets by quiver variable
export function FilterDatasetsByQuiverVariablePromise(
  datasetIds,
  quiverVariable
) {
  const params = new URLSearchParams({
    quiver_variable: quiverVariable,
  });

  if (datasetIds && datasetIds.length > 0) {
    params.append("dataset_ids", datasetIds.join(","));
  }

  return instance.get(
    `/api/v2.0/datasets/filter/quiver_variable?${params.toString()}`
  );
}

// Filter datasets by depth
export function FilterDatasetsByDepthPromise(datasetIds, hasDepth) {
  const params = new URLSearchParams({
    has_depth: hasDepth,
  });

  if (datasetIds && datasetIds.length > 0) {
    params.append("dataset_ids", datasetIds.join(","));
  }

  return instance.get(`/api/v2.0/datasets/filter/depth?${params.toString()}`);
}

// Filter datasets by date
export function FilterDatasetsByDatePromise(datasetIds, targetDate) {
  const params = new URLSearchParams({
    target_date: targetDate,
  });

  if (datasetIds && datasetIds.length > 0) {
    params.append("dataset_ids", datasetIds.join(","));
  }

  return instance.get(`/api/v2.0/datasets/filter/date?${params.toString()}`);
}

// Filter datasets by location
export function FilterDatasetsByLocationPromise(
  datasetIds,
  latitude,
  longitude
) {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
  });

  if (datasetIds && datasetIds.length > 0) {
    params.append("dataset_ids", datasetIds.join(","));
  }

  return instance.get(
    `/api/v2.0/datasets/filter/location?${params.toString()}`
  );
}

//returns a complete list of variables for users to select
export function GetAllVariablesPromise() {
  return instance.get("/api/v2.0/datasets/variables/all");
}

//returns a complete list of vector-variables for users to select
export function GetAllQuiverVariablesPromise() {
  return instance.get("/api/v2.0/datasets/quiver-variables/all");
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

// Filter datasets by date
export function FilterDatasetsByDatePromise(datasetIds, targetDate) {
  const params = new URLSearchParams({
    target_date: targetDate,
  });

  if (datasetIds && datasetIds.length > 0) {
    params.append("dataset_ids", datasetIds.join(","));
  }

  return instance.get(`/api/v2.0/datasets/filter/date?${params.toString()}`);
}

// Filter datasets by location
export function FilterDatasetsByLocationPromise(
  datasetIds,
  latitude,
  longitude
) {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
  });

  if (datasetIds && datasetIds.length > 0) {
    params.append("dataset_ids", datasetIds.join(","));
  }

  return instance.get(
    `/api/v2.0/datasets/filter/location?${params.toString()}`
  );
}

//returns a complete list of variables for users to select
export function GetAllVariablesPromise() {
  return instance.get("/api/v2.0/datasets/variables/all");
}

export function GetTrackTimeRangePromise(track) {
  return instance.get(`/api/v2.0/observation/tracktimerange/${track}.json`);
}
