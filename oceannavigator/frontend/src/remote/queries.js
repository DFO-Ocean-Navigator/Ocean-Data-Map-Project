import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  GetDatasetsPromise,
  GetColormapsPromise,
  GetVariablesPromise,
  GetTimestampsPromise,
  GetDepthsPromise,
  GetPlotImagePromise,
  GetAllVariablesPromise,
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
    enabled
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

export function useGetComboBoxQuery(url) {
  const { data = [], status } = useQuery({
    queryKey: ["comboBox", url],
    queryFn: () => GetComboBoxQuery(url),
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
