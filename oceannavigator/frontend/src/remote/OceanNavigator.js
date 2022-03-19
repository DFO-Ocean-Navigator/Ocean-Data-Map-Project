// Cannot use async/awat syntax here since we still have clients
// that use IE which doesn't support that.

const axios = require("axios");
import { cacheAdapterEnhancer } from "axios-extensions";

const instance = axios.create({
  headers: { "Cache-Control": "no-cache" },
  adapter: cacheAdapterEnhancer(axios.defaults.adapter)
});

export function GetDatasetsPromise() {
  return instance.get(
    "/api/v1.0/datasets/"
  );
}

export function GetVariablesPromise(dataset) {
  return instance.get(
    "/api/v1.0/variables/",
    {
      params: {
        dataset: dataset
      }
    }
  );
}

export function GetTimestampsPromise(dataset, variable) {
  return instance.get(
    "/api/v1.0/timestamps/",
    {
      params: {
        dataset: dataset,
        variable: variable
      }
    }
  );
}

export function GetDepthsPromise(dataset, variable) {
  return instance.get(
    "/api/v1.0/depth/",
    {
      params: {
        dataset: dataset,
        variable: variable,
        all: true,
      }
    }
  );
}

export function GetPresetPointsPromise() {
  return instance.get(
    "/api/v1.0/points/"
  );
}

export function GetPresetLinesPromise() {
  return instance.get(
    "/api/v1.0/lines/"
  );
}

export function GetPresetAreasPromise() {
  return instance.get(
    "/api/v1.0/areas/"
  );
}

export function GetObsTrackTimeRangePromise(trackId) {
  return instance.get(
    `/api/v1.0/observation/tracktimerange/${trackId}.json`
  );
}

export function GetClass4Promise() {
  return instance.get(
    "/api/v1.0/class4/"
  );
}
