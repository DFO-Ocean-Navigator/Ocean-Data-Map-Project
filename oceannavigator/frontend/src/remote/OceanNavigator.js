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

export function GetTrackTimeRangePromise(track) {
  return instance.get(`/api/v2.0/observation/tracktimerange/${track}.json`);
}