import React, { useState, useEffect } from "react";
import { Button, Row, Col, Form, Badge } from "react-bootstrap";
import Select from "react-select";
import DatePicker from "react-datepicker";
import {
  GetAllVariablesPromise,
  FilterDatasetsByVariablePromise,
  FilterDatasetsByQuiverVariablePromise,
  FilterDatasetsByDepthPromise,
  FilterDatasetsByDatePromise,
  FilterDatasetsByLocationPromise,
} from "../remote/OceanNavigator.js";

import { DATASET_DEFAULTS } from "./Defaults.js";

const LOADING_IMAGE = require("../images/spinner.gif").default;

const DatasetSearchWindow = ({ datasets, updateDataset, closeModal }) => {
  const [data, setData] = useState({
    variables: [],
    quiverVariables: [],
    allDatasets: datasets,
    visibleDatasetIds: [],
  });

  const [filters, setFilters] = useState({
    variable: null,
    quiverVariable: null,
    depth: null,
    date: null,
    latitude: "",
    longitude: "",
  });
  const [loading, setLoading] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);

  const depthOptions = [
    { value: true, label: "Yes (variables with depth dimensions)" },
    { value: false, label: "Surface variables only" },
  ];

  // Loads initial data from backend
  useEffect(() => {
    const loadData = async () => {
      const [variablesResult] = await Promise.all([GetAllVariablesPromise()]);
      console.log(variablesResult);
      const variables = [
        { value: "any", label: "Any" },
        ...variablesResult.data.variable.map((name) => ({
          value: name,
          label: name,
        })),
      ];

      const quiverVariables = [
        { value: "none", label: "None" },
        ...variablesResult.data.vector_variable.map((name) => ({
          value: name,
          label: name,
        })),
      ];

      const allDataset = datasets.map((d) => ({
        ...DATASET_DEFAULTS,
        ...d,
      }));

      const allDatasetIds = datasets.map((d) => d.id);

      setData({
        variables,
        quiverVariables,
        allDatasets: allDataset,
        visibleDatasetIds: allDatasetIds,
      });
    };

    loadData();
  }, []);

  // Get filter label
  const getFilterLabel = (type, value, params = {}) => {
    const labels = {
      variable: () => value,
      quiverVariable: () =>
        data.quiverVariables.find((v) => v.value === value)?.label || value,
      depth: () => (value === true ? true : false),
      date: () => new Date(value).toLocaleDateString(),
      location: () => `${params.latitude}°, ${params.longitude}°`,
    };

    return `${type.charAt(0).toUpperCase() + type.slice(1)}: ${
      labels[type]?.() || value
    }`;
  };

  // whenever users selects a filter, we sent the datasetId and the value and then get data from back-end and update the datasets with the filtered one
  const applyFilters = async (filtersToApply) => {
    let currentVisibleIds = [...data.allDatasets.map((d) => d.id)];
    let updatedDatasets = [...data.allDatasets];

    for (const filter of filtersToApply) {
      let result;

      switch (filter.type) {
        case "variable":
          result = await FilterDatasetsByVariablePromise(
            currentVisibleIds,
            filter.value
          );
          if (result.data.datasets) {
            //stores the list of dataset from back-end
            const updates = result.data.datasets;
            currentVisibleIds = updates.map((u) => u.id);
            //updates variable and variable_scale information for each dataset displayed
            updatedDatasets = updatedDatasets.map((dataset) => {
              const update = updates.find((u) => u.id === dataset.id);
              if (update) {
                return {
                  ...dataset,
                  variable: update.variable,
                  variable_scale: update.variable_scale,
                };
              }
              return dataset;
            });
          }
          break;

        case "quiverVariable":
          result = await FilterDatasetsByQuiverVariablePromise(
            currentVisibleIds,
            filter.value
          );
          if (result.data.datasets) {
            const updates = result.data.datasets;
            currentVisibleIds = updates.map((u) => u.id);

            updatedDatasets = updatedDatasets.map((dataset) => {
              const update = updates.find((u) => u.id === dataset.id);
              if (update) {
                return {
                  ...dataset,
                  quiverVariable: update.quiverVariable,
                };
              }
              return dataset;
            });
          }
          break;

        case "depth":
          result = await FilterDatasetsByDepthPromise(
            currentVisibleIds,
            filter.value
          );
          if (result.data.dataset_ids) {
            currentVisibleIds = result.data.dataset_ids;
          }
          break;

        case "date":
          setLoading(true);
          result = await FilterDatasetsByDatePromise(
            currentVisibleIds,
            filter.value
          );
          setLoading(false);
          if (result.data.dataset_ids) {
            currentVisibleIds = result.data.dataset_ids;
          }
          break;

        case "location":
          setLoading(true);
          result = await FilterDatasetsByLocationPromise(
            currentVisibleIds,
            filter.latitude,
            filter.longitude
          );
          setLoading(false);
          if (result.data.dataset_ids) {
            currentVisibleIds = result.data.dataset_ids;
          }
          break;

        default:
          break;
      }
    }

    setData((prev) => ({
      ...prev,
      allDatasets: updatedDatasets,
      visibleDatasetIds: currentVisibleIds,
    }));
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
    setData((prev) => ({
      ...prev,
      visibleDatasetIds: prev.allDatasets.map((d) => d.id),
    }));
  };

  const visibleDatasets = data.allDatasets.filter((dataset) =>
    data.visibleDatasetIds.includes(dataset.id)
  );

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
            <h5>Available Datasets ({visibleDatasets.length})</h5>
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
            {loading && (
              <div className="d-flex justify-content-center my-3">
                <img src={LOADING_IMAGE} alt="Loading..." height={100} />
              </div>
            )}
            {activeFilters.length > 0 && visibleDatasets.length === 0 && (
              <div className="text-muted p-3 text-center">
                <h6>No datasets match your filters</h6>
                <p>Try removing some filters or adjusting your criteria.</p>
              </div>
            )}

            {visibleDatasets.map((dataset) => (
              <div key={dataset.id} className="card mb-2">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <h6 className="card-title">
                        {dataset.name || dataset.value}
                      </h6>
                      <small className="text-muted">
                        {dataset.group && `Group: ${dataset.group}`}
                        {dataset.subgroup && ` - ${dataset.subgroup}`}
                        <br />
                        {dataset.model_class &&
                          `Type: ${dataset.model_class}`}{" "}
                        | Quantum: {dataset.quantum}
                        <br />
                        Variable: {dataset.variable} | Scale:{" "}
                        {dataset.variable_scale}
                        {dataset.quiverVariable !== "none" && (
                          <>
                            <br />
                            Vector Variable: {dataset.quiverVariable}
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
                        updateDataset(
                          dataset.id,
                          dataset.variable,
                          true,
                          dataset.quiverVariable
                        );
                        closeModal();
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
