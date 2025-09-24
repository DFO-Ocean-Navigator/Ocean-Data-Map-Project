import React, { useState, useEffect } from "react";
import { Button, Row, Col, Form, Badge } from "react-bootstrap";
import DatePicker from "react-datepicker";
import {
  GetAllVariablesPromise,
  FilterDatasetsByDatePromise,
  FilterDatasetsByLocationPromise,
} from "../remote/OceanNavigator.js";

import { DATASET_DEFAULTS } from "./Defaults.js";
import { TRUE } from "ol/functions.js";

const LOADING_IMAGE = require("../images/spinner.gif").default;

const DatasetSearchWindow = ({ datasets, updateDataset, closeModal }) => {
  const [variables, setVariables] = useState([]);
  const [vectorVariables, setVectorVariables] = useState([]);
  const [allDatasets, setAllDatasets] = useState(datasets);
  const [visibleDatasetIds, setVisibleDatasetIds] = useState([]);
  const [variableDataMap, setVariableDataMap] = useState({});

  const [filters, setFilters] = useState({
    variable: null,
    vectorVariable: null,
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
      setLoading(true);
      const variablesResult = await GetAllVariablesPromise();
      const variableDataMapResult = variablesResult.data;
      const variableNames = Object.keys(variableDataMapResult);
      const variablesOptions = [
        { value: "any", label: "Any" },
        ...variableNames.map((name) => ({
          value: name,
          label: name,
        })),
      ];

      // Extract unique vector variables from all datasets

      const allVectorVariables = new Set();
      Object.entries(variableDataMapResult).forEach(
        ([variableName, datasetEntries]) => {
          datasetEntries.forEach((entry) => {
            if (entry.vector_variables === true) {
              allVectorVariables.add(variableName);
            }
          });
        }
      );

      const vectorVariablesOptions = [
        { value: "none", label: "None" },
        ...Array.from(allVectorVariables).map((name) => ({
          value: name,
          label: name,
        })),
      ];

      const allDatasetsWithDefaults = datasets.map((d) => ({
        ...DATASET_DEFAULTS,
        ...d,
      }));

      const allDatasetIds = datasets.map((d) => d.id);

      setVariables(variablesOptions);
      setVectorVariables(vectorVariablesOptions);
      setAllDatasets(allDatasetsWithDefaults);
      setVisibleDatasetIds(allDatasetIds);
      setVariableDataMap(variableDataMapResult);
      setLoading(false);
    };

    loadData();
  }, [datasets]);

  // Get filter label
  const getFilterLabel = (type, value, params = {}) => {
    const labels = {
      variable: () => value,
      vectorVariable: () => value,
      depth: () => (value === true ? "Yes" : "No"),
      date: () => new Date(value).toLocaleDateString(),
      location: () => `${params.latitude}°, ${params.longitude}°`,
    };

    return `${type.charAt(0).toUpperCase() + type.slice(1)}: ${
      labels[type]?.() || value
    }`;
  };

  // Client-side filtering logic
  const applyFilters = async (filtersToApply) => {
    let filteredDatasetIds = [...allDatasets.map((d) => d.id)];
    let updatedDatasets = [...allDatasets];

    for (const filter of filtersToApply) {
      switch (filter.type) {
        case "variable":
          if (filter.value !== "any") {
            const variableData = variableDataMap[filter.value] || [];
            const datasetIdsWithVariable = variableData.map(
              (entry) => entry.dataset_id
            );
            filteredDatasetIds = filteredDatasetIds.filter((id) =>
              datasetIdsWithVariable.includes(id)
            );
            //updates dataset info for displaying

            updatedDatasets = updatedDatasets.map((dataset) => {
              const variableEntry = variableData.find(
                (entry) => entry.dataset_id === dataset.id
              );
              if (variableEntry) {
                return {
                  ...dataset,
                  variable: filter.value,
                  variable_scale: `${variableEntry.variable_scale[0]},${variableEntry.variable_scale[1]}`,
                  variable_id: variableEntry.variable_id,
                };
              }
              return dataset;
            });
          }
          break;

        case "vectorVariable":
          if (filter.value !== "none") {
            const variableData = variableDataMap[filter.value] || [];
            const datasetsWithVector = variableData.map(
              (entry) => entry.dataset_id
            );

            filteredDatasetIds = filteredDatasetIds.filter((id) =>
              datasetsWithVector.includes(id)
            );
            
             //updates dataset info for displaying
            updatedDatasets = updatedDatasets.map((dataset) => {
              if (datasetsWithVector.includes(dataset.id)) {
                return {
                  ...dataset,
                  vectorVariable: filter.value,
                };
              }
              return dataset;
            });
          }
          break;

        case "depth":
          const datasetsWithDepthRequirement = [];
          Object.values(variableDataMap).forEach((variableEntries) => {
            variableEntries.forEach((entry) => {
              if (entry.depth === filter.value) {
                datasetsWithDepthRequirement.push(entry.dataset_id);
              }
            });
          });

          filteredDatasetIds = filteredDatasetIds.filter((id) =>
            datasetsWithDepthRequirement.includes(id)
          );
          break;

        case "date":
          setLoading(true);
          try {
            const result = await FilterDatasetsByDatePromise(
              filteredDatasetIds,
              filter.value
            );
            if (Array.isArray(result.data)) {
              filteredDatasetIds = result.data;
            }
          } catch (error) {
            console.error("Error filtering by date:", error);
          }
          setLoading(false);
          break;

        case "location":
          setLoading(true);

          const result = await FilterDatasetsByLocationPromise(
            filteredDatasetIds,
            filter.latitude,
            filter.longitude
          );
          if (Array.isArray(result.data)) {
            filteredDatasetIds = result.data;
          }

          setLoading(false);
          break;

        default:
          break;
      }
    }

    setAllDatasets(updatedDatasets);
    setVisibleDatasetIds(filteredDatasetIds);
  };

  // Handles all the filter change logic
  const handleFilterChange = async (filterName, value) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);
    let newActiveFilters = activeFilters.filter((f) => f.type !== filterName);

    let shouldAdd = false;
    if (filterName === "depth") {
      shouldAdd = value !== null && value !== undefined;
    } else if (filterName === "variable") {
      shouldAdd = value && value !== "any";
    } else if (filterName === "vectorVariable") {
      shouldAdd = value && !["any", "none"].includes(value);
    } else {
      shouldAdd = Boolean(value);
    }

    if (shouldAdd) {
      const filterValue = filterName === "date" ? value.toISOString() : value;
      const additionalParams =
        filterName === "depth"
          ? {
              variable:
                newFilters.variable !== null && newFilters.variable !== "any"
                  ? newFilters.variable
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

  // Validates coordinates for location filter
  const isValidCoordinate = (value, type) => {
    if (!value) return false;
    const num = parseFloat(value);
    if (isNaN(num)) return false;
    return type === "latitude"
      ? num >= -90 && num <= 90
      : num >= -180 && num <= 360;
  };

  // Handles location input
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
      vectorVariable: () => (newFilters.vectorVariable = null),
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
      vectorVariable: null,
      depth: null,
      date: null,
      latitude: "",
      longitude: "",
    });
    setActiveFilters([]);
    setVisibleDatasetIds(allDatasets.map((d) => d.id));
  };

  const visibleDatasets = allDatasets.filter((dataset) =>
    visibleDatasetIds.includes(dataset.id)
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
            <Form.Select
              value={filters.variable ?? ""}
              onChange={(e) => {
                const val = e.target.value || null;
                handleFilterChange("variable", val);
              }}
            >
              <option value="">Select variable...</option>
              {variables.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          {/* Vector Variable Filter */}
          <Form.Group className="mb-3">
            <Form.Label>Vector Variable</Form.Label>
            <Form.Select
              value={filters.vectorVariable ?? ""}
              onChange={(e) => {
                const val = e.target.value || null;
                handleFilterChange("vectorVariable", val);
              }}
            >
              <option value="">Select vector variable...</option>
              {vectorVariables.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          {/* Depth Filter */}
          <Form.Group className="mb-3">
            <Form.Label>Variables with Depth Dimensions</Form.Label>
            <Form.Select
              value={
                filters.depth === null || filters.depth === undefined
                  ? ""
                  : filters.depth.toString()
              }
              onChange={(e) => {
                const raw = e.target.value;
                const val = raw === "" ? null : raw === "true" ? true : false;
                handleFilterChange("depth", val);
              }}
            >
              <option value="">Select depth requirement...</option>
              {depthOptions.map((opt) => (
                <option key={String(opt.value)} value={String(opt.value)}>
                  {opt.label}
                </option>
              ))}
            </Form.Select>
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
                  Showing all {allDatasets.length} available datasets. Use
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
                        {dataset.variable && (
                          <>
                            Variable: {dataset.variable} | Scale:{" "}
                            {dataset.variable_scale}
                            <br />
                          </>
                        )}
                        {dataset.vectorVariable &&
                          dataset.vectorVariable !== "none" && (
                            <>
                              Vector Variable: {dataset.vectorVariable}
                              <br />
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
                          dataset.variable || null,
                          true,
                          dataset.vectorVariable || "none"
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
