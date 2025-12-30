import { useQuery, QueryClient } from "@tanstack/react-query";

import {
  GetDatasetsPromise,
  GetVariablesPromise,
  GetTimestampsPromise,
  GetDepthsPromise,
  GetPlotImagePromise,
  GetAllVariablesPromise,
} from "./OceanNavigator.js";

const queryClient = new QueryClient();

export function useGetDatasets() {
  const { data = [], status } = useQuery({
    queryKey: ["datasets"],
    queryFn: GetDatasetsPromise,
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

export function usePlotImageQuery(feature, plotType, query) {
  const { data, status } = useQuery({
    queryKey: ["plotImage", { feature, plotType, query }],
    queryFn: () => GetPlotImagePromise(plotType, query),
  });

  return { data, status };
}

export function prefetchAllVariables() {
  queryClient.prefetchQuery({
    queryKey: ["datasetFilters", "allVariables"],
    queryFn: GetAllVariablesPromise,
  });
}
