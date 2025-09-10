import React, { useState, useEffect } from "react";
import { Button, Row, Col, Form, Badge } from "react-bootstrap";
import Select from "react-select";
import DatePicker from "react-datepicker";
import {
  GetAllVariablesPromise,
  GetAllQuiverVariablesPromise,
  GetDatasetsPromise,
  GetVariableScalePromise,
  FilterDatasetsByVariablePromise,
  FilterDatasetsByQuiverVariablePromise,
  FilterDatasetsByDepthPromise,
  FilterDatasetsByDatePromise,
  FilterDatasetsByLocationPromise,
} from "../remote/OceanNavigator.js";

const DatasetSearchWindow = ({ updateDataset, closeModal }) => {
  const [data, setData] = useState({
    variables: [],
    quiverVariables: [],
    allDatasets: [],
    currentDatasets: [],
  });

  const [filters, setFilters] = useState({
    variable: null,
    quiverVariable: null,
    depth: null,
    date: null,
    latitude: "",
    longitude: "",
  });

  const [activeFilters, setActiveFilters] = useState([]);

  const depthOptions = [
    { value: "yes", label: "Yes (variables with depth dimensions)" },
    { value: "no", label: "Surface variables only" },
  ];

  // Loads initial data from back-end.
  useEffect(() => {
    // if (!show) return;

    const loadData = async () => {
      const [variablesResult, quiverVarsResult, datasetsResult] =
        await Promise.all([
          GetAllVariablesPromise(),
          GetAllQuiverVariablesPromise(),
          GetDatasetsPromise(),
        ]);

      const variables = [
        { value: "any", label: "Any" },
        ...variablesResult.data.data.map((v) => ({
          value: v.id,
          label: v.name || v.id,
        })),
      ];

      const quiverVariables = [
        { value: "none", label: "None" },
        ...quiverVarsResult.data.data.map((v) => ({
          value: v.id,
          label: v.name || v.id,
        })),
      ];

      const datasets = datasetsResult.data.map((d) => ({
        ...d,
        name: d.name ?? d.value ?? d.id,
      }));

      setData({
        variables,
        quiverVariables,
        allDatasets: datasets,
        currentDatasets: datasets,
      });
    };

    loadData();
  }, []);

  // Get filter label
  const getFilterLabel = (type, value, params = {}) => {
    const labels = {
      variable: () =>
        data.variables.find((v) => v.value === value)?.label || value,
      quiverVariable: () =>
        data.quiverVariables.find((v) => v.value === value)?.label || value,
      depth: () => (value === "yes" ? "Yes" : "No"),
      date: () => new Date(value).toLocaleDateString(),
      location: () => `${params.latitude}°, ${params.longitude}°`,
    };

    return `${type.charAt(0).toUpperCase() + type.slice(1)}: ${
      labels[type]?.() || value
    }`;
  };

  // whenever users selects a filter, we sent the datasetId and the value and then get data from back-end and update the datasets with the filtered one
  const applyFilters = async (filtersToApply) => {
    let datasets = [...data.allDatasets];

    for (const filter of filtersToApply) {
      const datasetIds = datasets.map((d) => d.id);
      let result;

      const filterActions = {
        variable: () =>
          FilterDatasetsByVariablePromise(datasetIds, filter.value),
        quiverVariable: () =>
          FilterDatasetsByQuiverVariablePromise(datasetIds, filter.value),
        depth: () => FilterDatasetsByDepthPromise(datasetIds, filter.value),
        date: () => FilterDatasetsByDatePromise(datasetIds, filter.value),
        location: () =>
          FilterDatasetsByLocationPromise(
            datasetIds,
            filter.latitude,
            filter.longitude
          ),
      };

      result = await filterActions[filter.type]();
      datasets = result.data.datasets || [];
    }

    setData((prev) => ({ ...prev, currentDatasets: datasets }));
  };

  // Handles all the filter change logic
  const handleFilterChange = async (filterName, value) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);
    let newActiveFilters = activeFilters.filter((f) => f.type !== filterName);

    const shouldAdd =
      value &&
      !(filterName === "variable" && value.value === "any") &&
      !(
        filterName === "quiverVariable" && ["any", "none"].includes(value.value)
      );

    if (shouldAdd) {
      const filterValue =
        filterName === "date" ? value.toISOString() : value.value;
      const additionalParams =
        filterName === "depth"
          ? {
              variable:
                newFilters.variable?.value !== "any"
                  ? newFilters.variable?.value
                  : null,
            }
          : {};

      newActiveFilters.push({
        type: filterName,
        value: filterValue,
        label: getFilterLabel(filterName, filterValue, additionalParams),
        ...additionalParams,
      });
    }

    setActiveFilters(newActiveFilters);
    await applyFilters(newActiveFilters);
  };

  // Validate coordinates for location filter
  const isValidCoordinate = (value, type) => {
    if (!value) return false;
    const num = parseFloat(value);
    if (isNaN(num)) return false;
    return type === "latitude"
      ? num >= -90 && num <= 90
      : num >= -180 && num <= 360;
  };

  // Handle location input with debouncing
  const handleLocationChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);

    if (
      isValidCoordinate(newFilters.latitude, "latitude") &&
      isValidCoordinate(newFilters.longitude, "longitude")
    ) {
      const lat = parseFloat(newFilters.latitude);
      const lng = parseFloat(newFilters.longitude);

      const newActiveFilters = activeFilters.filter(
        (f) => f.type !== "location"
      );
      newActiveFilters.push({
        type: "location",
        value: "location",
        label: getFilterLabel("location", "location", {
          latitude: lat,
          longitude: lng,
        }),
        latitude: lat,
        longitude: lng,
      });

      setActiveFilters(newActiveFilters);
      applyFilters(newActiveFilters);
    }
  };

  // Remove filter
  const removeFilter = async (filterToRemove) => {
    const newActiveFilters = activeFilters.filter(
      (f) =>
        !(f.type === filterToRemove.type && f.value === filterToRemove.value)
    );

    const newFilters = { ...filters };
    const clearMap = {
      variable: () => (newFilters.variable = null),
      quiverVariable: () => (newFilters.quiverVariable = null),
      depth: () => (newFilters.depth = null),
      date: () => (newFilters.date = null),
      location: () => {
        newFilters.latitude = "";
        newFilters.longitude = "";
      },
    };

    clearMap[filterToRemove.type]?.();
    setFilters(newFilters);
    setActiveFilters(newActiveFilters);
    await applyFilters(newActiveFilters);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      variable: null,
      quiverVariable: null,
      depth: null,
      date: null,
      latitude: "",
      longitude: "",
    });
    setActiveFilters([]);
    setData((prev) => ({ ...prev, currentDatasets: prev.allDatasets }));
  };

  async function createDatasetObjectProperties(dataset) {
    const ds = dataset;
    const filters = activeFilters;
    const variable =
      filters.find((f) => f.type === "variable")?.value ?? ds.sample_variable;
    const quiverVariable =
      filters.find((f) => f.type === "quiverVariable")?.value ?? "none";
    const depth_val = filters.find((f) => f.type === "depth")?.value ?? "none";

    // const tRes = await GetTimestampsPromise(ds.id, variable);
    // const timeData = tRes?.data ?? [];
    const time = -1; // timeData[timeData.length - 1].id;
    const starttime = -1;
    // let depth = 0;
    // if (depth_val == "Yes" || depth_val == "none") {
    //   const dRes = await GetDepthsPromise(ds.id, variable);
    //   const depths = Array.isArray(dRes?.data) ? dRes.data : [];

    //   const hasZero = depths.some((d) => String(d.id) === "0");
    //   if (!hasZero && depths.length) depth = depths[0].id;
    // }
    const vres = await GetVariableScalePromise(ds.id, variable);
    const var_scale_string = vres?.data ?? [];
    const var_scale = var_scale_string.split(",").map(Number);

    const datasetUpdate = {
      id: ds.id,
      model_class: ds.model_class,
      quantum: ds.quantum,
      quiverDensity: 0,
      quiverVariable,
      starttime,
      time,
      variable,
      variable_scale: var_scale,
    };
    console.log("datasetUpdate:", datasetUpdate);

    updateDataset("dataset", datasetUpdate);
    closeModal();
  }

  return (
    <>
      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="mb-3">
          <h6>Active Filters:</h6>
          <div className="d-flex flex-wrap gap-2">
            {activeFilters.map((filter, index) => (
              <Badge
                key={index}
                bg="primary"
                className="d-flex align-items-center"
              >
                {filter.label}
                <button
                  type="button"
                  className="btn-close btn-close-white ms-2"
                  style={{ fontSize: "0.7em" }}
                  onClick={() => removeFilter(filter)}
                />
              </Badge>
            ))}
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={clearAllFilters}
            >
              Clear All
            </Button>
          </div>
        </div>
      )}

      <Row>
        <Col md={4}>
          <h5>Filters</h5>

          {/* Variable Filter */}
          <Form.Group className="mb-3">
            <Form.Label>Variable</Form.Label>
            <Select
              value={filters.variable}
              onChange={(value) => handleFilterChange("variable", value)}
              options={data.variables}
              placeholder="Select variable..."
              isClearable
            />
          </Form.Group>

          {/* Vector Variable Filter */}
          <Form.Group className="mb-3">
            <Form.Label>Vector Variable</Form.Label>
            <Select
              value={filters.quiverVariable}
              onChange={(value) => handleFilterChange("quiverVariable", value)}
              options={data.quiverVariables}
              placeholder="Select vector variable..."
              isClearable
            />
          </Form.Group>

          {/* Depth Filter */}
          <Form.Group className="mb-3">
            <Form.Label>Variables with Depth Dimensions</Form.Label>
            <Select
              value={filters.depth}
              onChange={(value) => handleFilterChange("depth", value)}
              options={depthOptions}
              placeholder="Select depth requirement..."
              isClearable
            />
          </Form.Group>

          {/* Date Filter */}
          <Form.Group className="mb-3">
            <Form.Label>Date</Form.Label>
            <DatePicker
              selected={filters.date}
              onChange={(date) => handleFilterChange("date", date)}
              className="form-control"
              placeholderText="Select date..."
              isClearable
              dateFormat="yyyy-MM-dd"
              showYearDropdown
              showMonthDropdown
              dropdownMode="select"
            />
          </Form.Group>

          {/* Location Filter */}
          <Form.Group className="mb-3">
            <Form.Label>Geographic Location</Form.Label>
            <Row>
              <Col>
                <Form.Control
                  type="text"
                  placeholder="Latitude"
                  value={filters.latitude}
                  onChange={(e) =>
                    handleLocationChange("latitude", e.target.value)
                  }
                  className={
                    filters.latitude &&
                    !isValidCoordinate(filters.latitude, "latitude")
                      ? "is-invalid"
                      : ""
                  }
                />
              </Col>
              <Col>
                <Form.Control
                  type="text"
                  placeholder="Longitude"
                  value={filters.longitude}
                  onChange={(e) =>
                    handleLocationChange("longitude", e.target.value)
                  }
                  className={
                    filters.longitude &&
                    !isValidCoordinate(filters.longitude, "longitude")
                      ? "is-invalid"
                      : ""
                  }
                />
              </Col>
            </Row>
          </Form.Group>
        </Col>

        <Col md={8}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5>Available Datasets ({data.currentDatasets.length})</h5>
          </div>

          <div
            className="dataset-list"
            style={{ maxHeight: "500px", overflowY: "auto" }}
          >
            {activeFilters.length === 0 && (
              <div className="text-muted p-3 text-center">
                <h6>Welcome to Dataset Search</h6>
                <p>
                  Showing all {data.allDatasets.length} available datasets. Use
                  filters to narrow your search.
                </p>
              </div>
            )}

            {activeFilters.length > 0 && data.currentDatasets.length === 0 && (
              <div className="text-muted p-3 text-center">
                <h6>No datasets match your filters</h6>
                <p>Try removing some filters or adjusting your criteria.</p>
              </div>
            )}

            {data.currentDatasets.map((dataset) => (
              <div key={dataset.id} className="card mb-2">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <h6 className="card-title">{dataset.name}</h6>
                      <small className="text-muted">
                        {dataset.group && `Group: ${dataset.group}`}
                        {dataset.subgroup && ` - ${dataset.subgroup}`}
                        <br />
                        {dataset.type && `Type: ${dataset.type}`} | Quantum:{" "}
                        {dataset.quantum}
                        {dataset.matchingVariables?.length > 0 && (
                          <>
                            <br />
                            Variables: {dataset.matchingVariables.join(", ")}
                          </>
                        )}
                      </small>
                      {dataset.help && (
                        <small className="text-info d-block">
                          {dataset.help}
                        </small>
                      )}
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        createDatasetObjectProperties(dataset);
                      }}
                      className="ms-2"
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Col>
      </Row>
    </>
  );
};

export default DatasetSearchWindow;
