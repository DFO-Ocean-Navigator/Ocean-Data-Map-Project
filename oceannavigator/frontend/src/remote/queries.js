import { useQuery } from "@tanstack/react-query";

import {
  GetDatasetsPromise,
  GetVariablesPromise,
  GetTimestampsPromise,
  GetDepthsPromise,
  GetPlotImagePromise,
} from "./OceanNavigator.js";

export function useGetDatasets() {
  const {
    data = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["datasets"],
    queryFn: GetDatasetsPromise,
  });

  return { data, isLoading, isError };
}

export function useGetDatasetParams(dataset) {
  const {
    data: variables = [],
    isLoading: variablesLoading,
    isError: variablesError,
  } = useQuery({
    queryKey: ["dataset", "variables", dataset.id],
    queryFn: () => GetVariablesPromise(dataset.id),
  });

  const variableIds = variables.map((v) => {
    return v.id;
  });

  let queryVar = Array.isArray(dataset.variable)
    ? dataset.variable[0]
    : dataset.variable;

  const {
    data: timestamps = [],
    isLoading: timestampsLoading,
    isError: timestampsError,
  } = useQuery({
    queryKey: ["dataset", "timestamps", dataset.id, queryVar],
    queryFn: () => GetTimestampsPromise(dataset.id, queryVar),
    enabled: !!variableIds.includes(queryVar),
  });

  const {
    data: depths = [],
    isLoading: depthsLoading,
    isError: depthsError,
  } = useQuery({
    queryKey: ["dataset", "depths", dataset.id, queryVar],
    queryFn: () => GetDepthsPromise(dataset.id, queryVar),
    enabled: !!variableIds.includes(queryVar),
  });

  const isLoading = variablesLoading || timestampsLoading || depthsLoading;
  const isError = variablesError || timestampsError || depthsError;

  return {
    variables,
    timestamps,
    depths,
    isLoading,
    isError,
  };
}

export function usePlotImageQuery(feature, plotType, query){
  const { data, isLoading, isError } = useQuery({
    queryKey: ["plotImage", { feature, plotType, query }],
    queryFn: () => GetPlotImagePromise(plotType, query),
  });

  return {data, isLoading, isError}
}