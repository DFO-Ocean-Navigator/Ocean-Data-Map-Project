// Cannot use async/awat syntax here since we still have clients
// that use IE which doesn't support that.

const axios = require("axios");

function _createPromise() {
  return axios.create();
}


export function GetDatasetsPromise() {
  return _createPromise().get("/api/v1.0/datasets");
}

export function GetVariablesPromise(dataset) {
  return _createPromise().get(
    "/api/v1.0/variables",
    {
      params: {
        dataset: dataset
      }
    }
  );
}

export function GetTimestampsPromise(dataset, variable) {
  return _createPromise().get(
    "/api/v1.0/timestamps",
    {
      params: {
        dataset: dataset,
        variable: variable
      }
    }
  );
}
