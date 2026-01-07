import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  GetDatasetsPromise,
  GetVariablesPromise,
  GetTimestampsPromise,
  GetDepthsPromise,
  GetPlotImagePromise,
  GetAllVariablesPromise,
  GetTrackTimeRangePromise,
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

export function useGetDatasetVariables(dataset, enabled = true) {
  const { data = [], status } = useQuery({
    queryKey: ["dataset", "variables", dataset.id],
    queryFn: () => GetVariablesPromise(dataset.id),
    enabled,
  });

  return { data, status };
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
        (parseFloat(location[1]) + 360) % 360
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

export function prefetchAllVariables() {
  const queryClient = useQueryClient();
  queryClient.prefetchQuery({
    queryKey: ["datasetFilters", "allVariables"],
    queryFn: GetAllVariablesPromise,
  });
}
