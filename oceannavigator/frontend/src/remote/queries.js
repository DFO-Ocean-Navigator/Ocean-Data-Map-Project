import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  GetDatasetsPromise,
  GetColormapsPromise,
  GetVariablesPromise,
  GetTimestampsPromise,
  GetDepthsPromise,
  GetPlotImagePromise,
  GetAllVariablesPromise,
  GetPointDepthPromise,
  GetPointDataPromise,
  GetTrackTimeRangePromise,
  GetComboBoxQuery,
  GetClass4ForecastsPromise,
  GetClass4ModelsPromise,
  GetObservationDatatypes,
  GetObservationTimeRange,
  GetObservationMetaKeys,
  GetObservationMetaValues,
  GetObservationVariablesStationPromise,
  GetObservationVariablesPlatformPromise,
  FilterDatasetsByDatePromise,
  FilterDatasetsByLocationPromise,
} from "./OceanNavigator.js";

export function useGetDatasets() {
  const { data = [], status } = useQuery({
    queryKey: ["datasets"],
    queryFn: GetDatasetsPromise,
  });

  return { data, status };
}

export function useGetAllVariables() {
  const { data = {}, status } = useQuery({
    queryKey: ["datasetFilters", "allVariables"],
    queryFn: GetAllVariablesPromise,
  });

  return { data, status };
}

export function useGetDatasetVariables(
  dataset,
  enabled = true,
  vectorsOnly = false,
) {
  const { data = [], status } = useQuery({
    queryKey: ["dataset", "variables", dataset.id, vectorsOnly],
    queryFn: () => GetVariablesPromise(dataset.id, vectorsOnly),
    enabled,
  });

  return { data, status };
}

// Returns the timestamps for a given dataset and variable.
export function useGetPointDepth(latitude, longitude) {
  const { data = [], isSuccess } = useQuery({
    queryKey: ["point", "depth", latitude, longitude],
    queryFn: () => GetPointDepthPromise(latitude, longitude),
    enabled: Number.isFinite(latitude) && Number.isFinite(longitude),
    // The refetchOnWindowFocus option is set to false to prevent automatic refetching when the window gains focus, and retry is set to false to avoid retrying failed requests.
    refetchOnWindowFocus: false,
    retry: false,
  });

  return { data, isSuccess };
}

// Returns the data in a dataset for a given point.
export function useGetPointData(
  dataset,
  variable,
  time,
  depth,
  latitude,
  longitude,
) {
  // Use the useQuery hook to fetch point data based on the provided parameters. The query is enabled only if all required parameters are valid. The query key is constructed using the dataset, variable, time, depth, latitude, and longitude to ensure that the query is unique for each combination of these parameters. The query function calls GetPointDataPromise with the provided parameters and a signal for cancellation. The refetchOnWindowFocus option is set to false to prevent automatic refetching when the window gains focus, and retry is set to false to avoid retrying failed requests.
  const { data = [], isSuccess } = useQuery({
    queryKey: [
      "point",
      "data",
      dataset,
      variable,
      time,
      depth,
      latitude,
      longitude,
    ],
    queryFn: () =>
      GetPointDataPromise(dataset, variable, time, depth, latitude, longitude),
    enabled:
      // Check if all required parameters are valid before enabling the query. The query is enabled only if dataset and variable are truthy, time is not null and greater than or equal to 0, depth is not null, and both latitude and longitude are finite numbers.
      Boolean(dataset && variable && time != null && time >= 0) &&
      depth != null &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude),
    refetchOnWindowFocus: false,
    retry: false,
  });

  return { data, isSuccess };
}

export function useGetDatasetTimestamps(dataset, enabled) {
  let variable = Array.isArray(dataset.variable)
    ? dataset.variable[0]
    : dataset.variable;
  const { data = [], status } = useQuery({
    queryKey: ["dataset", "timestamps", dataset.id, variable.id],
    queryFn: () => GetTimestampsPromise(dataset.id, variable.id),
    enabled,
  });

  return { data, status };
}

export function useGetDatasetDepths(dataset, enabled) {
  let variable = Array.isArray(dataset.variable)
    ? dataset.variable[0]
    : dataset.variable;
  const { data = [], status } = useQuery({
    queryKey: ["dataset", "depths", dataset.id, variable.id],
    queryFn: () => GetDepthsPromise(dataset.id, variable.id),
    enabled: enabled,
  });

  return { data, status };
}

export function useGetPlotImage(feature, plotType, query) {
  const { data, status } = useQuery({
    queryKey: ["plotImage", { feature, plotType, query }],
    queryFn: () => GetPlotImagePromise(plotType, query),
  });

  return { data, status };
}

export function useDateFilter(datasetIds, date, enabled) {
  const { data, status } = useQuery({
    queryKey: ["datasetFilters", "date", datasetIds, date],
    queryFn: () => FilterDatasetsByDatePromise(datasetIds, date.toISOString()),
    enabled: enabled,
  });

  return { data, status };
}

export function useLocationFilter(datasetIds, location, enabled) {
  const { data, status } = useQuery({
    queryKey: ["datasetFilters", "location", datasetIds, location],
    queryFn: () =>
      FilterDatasetsByLocationPromise(
        datasetIds,
        location[0],
        (parseFloat(location[1]) + 360) % 360,
      ),
    enabled: enabled,
  });
  return { data, status };
}

export function useGetTrackTimeRange(trackId) {
  const { data = [], status } = useQuery({
    queryKey: ["observations", "trackTimeRange", trackId],
    queryFn: () => GetTrackTimeRangePromise(trackId),
  });

  return { data, status };
}

export function useGetColormaps() {
  const { data = [], status } = useQuery({
    queryKey: ["colormaps"],
    queryFn: () => GetColormapsPromise(),
  });
  return { data, status };
}

export function useGetClass4Forecasts(class4Type, class4Id) {
  const { data = [], status } = useQuery({
    queryKey: ["class4", "forecasts", class4Type, class4Id],
    queryFn: () => GetClass4ForecastsPromise(class4Type, class4Id),
  });

  return { data, status };
}

export function useGetObservationTimeRange() {
  const { data = [], status } = useQuery({
    queryKey: ["observation", "timerange"],
    queryFn: () => GetObservationTimeRange(),
  });

  return { data, status };
}

export function useGetObservationDatatypes() {
  const { data = [], status } = useQuery({
    queryKey: ["observation", "datatypes"],
    queryFn: () => GetObservationDatatypes(),
  });

  return { data, status };
}

export function useGetObservationMetaKeys(platformType) {
  const { data = [], status } = useQuery({
    queryKey: ["observation", "metaKeys", platformType],
    queryFn: () => GetObservationMetaKeys(platformType),
  });

  return { data, status };
}

export function useGetObservationMetaValues(platformType, metaKey, enabled) {
  const { data = [], status } = useQuery({
    queryKey: ["observation", "metaValues", platformType, metaKey],
    queryFn: () => GetObservationMetaValues(platformType, metaKey),
    enabled,
  });

  return { data, status };
}

export function useGetObservationVariablesStation(stationId, enabled = true) {
  const { data = [], status } = useQuery({
    queryKey: ["observation", "variables", "station", stationId],
    queryFn: () => GetObservationVariablesStationPromise(stationId),
    enabled: enabled,
  });

  return { data, status };
}

export function useGetObservationVariablesPlatform(platformId, enabled = true) {
  const { data = [], status } = useQuery({
    queryKey: ["observation", "variables", "platform", platformId],
    queryFn: () => GetObservationVariablesPlatformPromise(platformId),
    enabled: enabled,
  });

  return { data, status };
}

export function useGetClass4Models(class4Type, class4Id) {
  const { data = [], status } = useQuery({
    queryKey: ["class4", "models", class4Type, class4Id],
    queryFn: () => GetClass4ModelsPromise(class4Type, class4Id),
  });

  return { data, status };
}

export function prefetchAllVariables() {
  const queryClient = useQueryClient();
  queryClient.prefetchQuery({
    queryKey: ["datasetFilters", "allVariables"],
    queryFn: GetAllVariablesPromise,
  });
}
