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

export async function GetDatasetsPromise() {
  const response = await instance.get("/api/v2.0/datasets");
  return response.data;
}

export async function GetVariablesPromise(dataset) {
  const response = await instance.get(`/api/v2.0/dataset/${dataset}/variables`);
  return response.data;
}

export async function GetTimestampsPromise(dataset, variable) {
  const response = await instance.get(
    "/api/v2.0/dataset/" + dataset + "/" + variable + "/timestamps"
  );
  return response.data;
}
export async function GetDepthsPromise(dataset, variable) {
  const response = await instance.get(
    "/api/v2.0/dataset/" + dataset + "/" + variable + "/depths",
    {
      params: {
        include_all_key: true,
      },
    }
  );
  return response.data;
}

//returns a complete list of variables for users to select
export async function GetAllVariablesPromise() {
  const response = await instance.get("/api/v2.0/datasets/variables/all");
  return response.data
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
export async function FilterDatasetsByDatePromise(datasetIds, targetDate) {
  const params = new URLSearchParams({
    target_date: targetDate,
  });

  if (datasetIds && datasetIds.length > 0) {
    params.append("dataset_ids", datasetIds.join(","));
  }

  const response = await instance.get(
    `/api/v2.0/datasets/filter/date?${params.toString()}`
  );
  return response.data;
}

// Filter datasets by location
export async function FilterDatasetsByLocationPromise(
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

  const response = await instance.get(
    `/api/v2.0/datasets/filter/location?${params.toString()}`
  );
  return response.data;
}

export function GetTrackTimeRangePromise(track) {
  return instance.get(`/api/v2.0/observation/tracktimerange/${track}.json`);
}
