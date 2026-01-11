import axios from "axios";

const instance = axios.create({
  headers: { "Cache-Control": "no-cache" },
});

export async function GetDatasetsPromise() {
  const response = await instance.get("/api/v2.0/datasets");
  return response.data;
}

export async function GetVariablesPromise(dataset, vectorsOnly) {
  const response = await instance.get(
    `/api/v2.0/dataset/${dataset}/variables${
      vectorsOnly ? "?vectors_only=True" : ""
    }`
  );
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
  return response.data;
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

export async function GetTrackTimeRangePromise(track) {
  const response = await instance.get(
    `/api/v2.0/observation/tracktimerange/${track}.json`
  );

  return response.data;
}

export async function GetPlotImagePromise(plotType, query) {
  const queryConfig = {
    method: "get",
    url: `/api/v2.0/plot/${plotType}`,
    params: { query: JSON.stringify(query), format: "json" },
  };
  const response = await axios.request(queryConfig);
  return response.data;
}
