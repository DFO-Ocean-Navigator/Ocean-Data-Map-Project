import React, { useState, useEffect } from "react";
import { Button, Row, Col, Form, Badge } from "react-bootstrap";
import DatePicker from "react-datepicker";
import {
  GetAllVariablesPromise,
  FilterDatasetsByDatePromise,
  FilterDatasetsByLocationPromise,
} from "../remote/OceanNavigator.js";

const LOADING_IMAGE = require("../images/spinner.gif").default;

const DatasetSearchWindow = ({ datasets, updateDataset, closeModal }) => {
  //store variables
  const [variables, setVariables] = useState([]);
  //store vectorVariables
  const [vectorVariables, setVectorVariables] = useState([]);
  //stores only dataset that needs to be displayed
  const [datasetDisplayed, setDatasetDisplayed] = useState(datasets);
  //stores the response from api
  const [variableDataMap, setVariableDataMap] = useState({});

  const [locationInput, setLocationInput] = useState({
    latitude: "",
    longitude: "",
  });

  const FILTER_DEFAULTS = {
    variable: "any",
    vectorVariable: "none",
    depth: null,
    date: null,
    latitude: "",
    longitude: "",
  };

  const [filters, setFilters] = useState({
    variable: "any",
    vectorVariable: "none",
    depth: null,
    date: null,
    latitude: "",
    longitude: "",
  });
  const [loading, setLoading] = useState(false);

  const depthOptions = [
    { value: null, label: "Both 2D and 3D" },
    { value: true, label: "Yes (variables with depth dimensions)" },
    { value: false, label: "Surface variables only" },
  ];

  // Loads initial data from backend
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const variablesResult = await GetAllVariablesPromise();
      const variableDataMapResult = variablesResult.data;
      const variablesOptions = [
        { value: "any", label: "Any", key: "any" },
        ...Object.entries(variableDataMapResult).map(
          ([variableName, datasets]) => {
            const variableId = datasets[0]?.variable_id;
            return {
              value: variableName,
              label: variableName,
              key: `${variableName}-${variableId}`,
            };
          }
        ),
      ];

      // Extract unique vector variables from all datasets

      const allVectorVariables = new Set();
      const vector_VariableMap = {};
      Object.entries(variableDataMapResult).forEach(
        ([variableName, datasetEntries]) => {
          datasetEntries.forEach((entry) => {
            if (entry.vector_variables === true) {
              vector_VariableMap[variableName] = entry.variable_id;
              allVectorVariables.add(variableName);
            }
          });
        }
      );

      const vectorVariablesOptions = [
        { value: "none", label: "None", id: "none" },
        ...Array.from(allVectorVariables).map((name) => {
          const variableData = variableDataMapResult[name] || [];
          const vectorEntry = variableData.find(
            (entry) => entry.vector_variables === true
          );
          return {
            value: name,
            label: name,
            id: vectorEntry?.variable_id || name,
          };
        }),
      ];

      setVariables(variablesOptions);
      setVectorVariables(vectorVariablesOptions);
      setVariableDataMap(variableDataMapResult);
      setLoading(false);
    };

    loadData();
  }, [datasets]);

  // Client-side filtering logic
  const applyFilters = async (newFilters) => {
    let temp_dataset = [...datasets];
    setLoading(true);

    // Filter by variable
    if (newFilters.variable !== "any") {
      const variableData = variableDataMap[newFilters.variable] || [];
      const datasetIdsWithVariable = variableData.map(
        (entry) => entry.dataset_id
      );
      temp_dataset = temp_dataset.filter((obj) =>
        datasetIdsWithVariable.includes(obj.id)
      );
    }

    // Filter by vector variable
    if (newFilters.vectorVariable !== "none") {
      const variableData = variableDataMap[newFilters.vectorVariable] || [];
      const datasetsWithVector = variableData
        .map((entry) => {
          const ds = datasets.find((d) => d.id === entry.dataset_id);
          return ds && ds.model_class !== "Nemo" ? ds.id : null;
        })
        .filter(Boolean);
      temp_dataset = temp_dataset.filter((obj) =>
        datasetsWithVector.includes(obj.id)
      );
    }

    // Filter by depth
    if (newFilters.depth !== null) {
      const datasetsWithDepthRequirement = [];
      Object.values(variableDataMap).forEach((variableEntries) => {
        variableEntries.forEach((entry) => {
          if (entry.depth === newFilters.depth) {
            datasetsWithDepthRequirement.push(entry.dataset_id);
          }
        });
      });
      temp_dataset = temp_dataset.filter((obj) =>
        datasetsWithDepthRequirement.includes(obj.id)
      );
    }

    //  Filter by date
    if (newFilters.date !== null) {
      const result = await FilterDatasetsByDatePromise(
        temp_dataset.map((obj) => obj.id),
        newFilters.date.toISOString()
      );
      if (Array.isArray(result.data)) {
        temp_dataset = temp_dataset.filter((obj) =>
          result.data.includes(obj.id)
        );
      }
    }
    // Filter by Location
    if (newFilters.latitude !== "" && newFilters.longitude !== "") {
      const result = await FilterDatasetsByLocationPromise(
        temp_dataset.map((obj) => obj.id),
        newFilters.latitude,
        newFilters.longitude
      );
      if (Array.isArray(result.data)) {
        temp_dataset = temp_dataset.filter((obj) =>
          result.data.includes(obj.id)
        );
      }
    }

    setDatasetDisplayed(temp_dataset);
    setFilters(newFilters);
    setLoading(false);
  };

  // Handles all the filter change logic
  const handleFilterChange = (filterName, value) => {
    const newFilters = { ...filters, [filterName]: value };
    applyFilters(newFilters);
  };

  const removeFilter = (filterToRemove) => {
    const newFilters = { ...filters };

    switch (filterToRemove) {
      case "variable":
        newFilters.variable = FILTER_DEFAULTS.variable;
        break;
      case "vectorVariable":
        newFilters.vectorVariable = FILTER_DEFAULTS.vectorVariable;
        break;
      case "depth":
        newFilters.depth = FILTER_DEFAULTS.depth;
        break;
      case "date":
        newFilters.date = FILTER_DEFAULTS.date;
        break;
      case "location":
        newFilters.latitude = FILTER_DEFAULTS.latitude;
        newFilters.longitude = FILTER_DEFAULTS.longitude;
        break;
    }

    setFilters(newFilters);
    applyFilters(newFilters);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({ ...FILTER_DEFAULTS });
    setLocationInput({
      latitude: "",
      longitude: "",
    });
    setDatasetDisplayed(datasets);
  };

  return (
    <>
      {/* Active Filters */}
      <div className="mb-3">
        <h6>Active Filters:</h6>

        <div className="d-flex flex-wrap gap-2 align-items-center">
          {Object.entries(filters).map(([key, value]) => {
            if (key === "latitude") {
              if (!(filters.latitude !== "" && filters.longitude !== ""))
                return null;
              const label = `Location: ${filters.latitude}°, ${filters.longitude}°`;
              return (
                <Badge
                  key="location"
                  bg="primary"
                  className="d-flex align-items-center"
                >
                  {label}
                  <button
                    type="button"
                    className="btn-close btn-close-white ms-2"
                    style={{ fontSize: "0.7em" }}
                    onClick={() => removeFilter("location")}
                  />
                </Badge>
              );
            }
            if (key === "longitude") {
              // skip longitude entry because we handle location on latitude
              return null;
            }

            // Skip defaults
            if (value === FILTER_DEFAULTS[key]) return null;

            let label = "";
            if (key === "variable") {
              const friendly =
                variables.find((v) => v.value === value)?.label ?? value;
              label = `Variable: ${friendly}`;
            } else if (key === "vectorVariable") {
              const friendly =
                vectorVariables.find((v) => v.value === value)?.label ?? value;
              label = `Vector: ${friendly}`;
            } else if (key === "depth") {
              label =
                value === true
                  ? "Has depth"
                  : value === false
                  ? "Surface only"
                  : "Both 2D/3D";
            } else if (key === "date") {
              try {
                label = `Date: ${new Date(value).toLocaleDateString()}`;
              } catch {
                label = `Date: ${String(value)}`;
              }
            } else {
              label = `${key}: ${String(value)}`;
            }

            return (
              <Badge
                key={key}
                bg="primary"
                className="d-flex align-items-center"
              >
                {label}
                <button
                  type="button"
                  className="btn-close btn-close-white ms-2"
                  style={{ fontSize: "0.7em" }}
                  onClick={() => removeFilter(key)}
                />
              </Badge>
            );
          })}

          {/* placeholde If there are no active filters */}
          {Object.entries(filters).every(([k, v]) => {
            if (k === "latitude" || k === "longitude") {
              return !(filters.latitude !== "" && filters.longitude !== "");
            }
            return v === FILTER_DEFAULTS[k];
          }) && <div className="text-muted me-2">No active filters</div>}

          <Button
            variant="outline-secondary"
            size="sm"
            onClick={clearAllFilters}
          >
            Clear All
          </Button>
        </div>
      </div>

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
              {variables.map((opt) => (
                <option key={opt.key || opt.value} value={opt.value}>
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
                  : String(filters.depth)
              }
              onChange={(e) => {
                const raw = e.target.value;
                const val = raw === "" ? null : raw === "true" ? true : false;
                handleFilterChange("depth", val);
              }}
            >
              {depthOptions.map((opt) => (
                <option
                  key={String(opt.value)}
                  value={opt.value === null ? "" : String(opt.value)}
                >
                  {opt.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          {/* Date Filter */}
          <Form.Group className="mb-3">
            <Form.Label className="d-block">Date</Form.Label>
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
                  type="number"
                  min={-90}
                  max={+90}
                  placeholder="Latitude"
                  value={locationInput.latitude}
                  onChange={(e) =>
                    setLocationInput({
                      ...locationInput,
                      latitude: e.target.value,
                    })
                  }
                  className={
                    locationInput.latitude &&
                    (parseFloat(locationInput.latitude) < -90 ||
                      parseFloat(locationInput.latitude) > 90)
                      ? "is-invalid"
                      : ""
                  }
                />
              </Col>
              <Col>
                <Form.Control
                  type="number"
                  min={-360}
                  max={360}
                  placeholder="Longitude"
                  value={locationInput.longitude}
                  onChange={(e) =>
                    setLocationInput({
                      ...locationInput,
                      longitude: e.target.value,
                    })
                  }
                  className={
                    locationInput.longitude &&
                    (parseFloat(locationInput.longitude) < -360 ||
                      parseFloat(locationInput.longitude) > 360)
                      ? "is-invalid"
                      : ""
                  }
                />
              </Col>
            </Row>
            <Button
              variant="primary"
              size="sm"
              className="mt-2 w-100"
              disabled={!locationInput.latitude || !locationInput.longitude}
              onClick={() => {
                if (locationInput.latitude && locationInput.longitude) {
                  const newFilters = {
                    ...filters,
                    latitude: parseFloat(locationInput.latitude),
                    longitude: parseFloat(locationInput.longitude),
                  };
                  applyFilters(newFilters);
                }
              }}
            >
              Apply Location Filter
            </Button>
          </Form.Group>
        </Col>

        <Col md={8}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5>
              Showing Datasets ({datasetDisplayed.length}) / ({datasets.length})
            </h5>
          </div>

          <div
            className="dataset-list"
            style={{ maxHeight: "500px", overflowY: "auto" }}
          >
            {loading && (
              <div className="d-flex justify-content-center my-3">
                <img src={LOADING_IMAGE} alt="Loading..." height={100} />
              </div>
            )}

            {datasetDisplayed.map((dataset) => (
              <div key={dataset.id} className="card mb-2">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <h6 className="card-title">{dataset.value}</h6>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        const selectedVariable =
                          filters.variable && filters.variable !== "any"
                            ? filters.variable
                            : null;

                        const selectedVectorVariableObj = vectorVariables.find(
                          (v) => v.value === filters.vectorVariable
                        );
                        const selectedVectorVariable =
                          selectedVectorVariableObj?.id || "none";

                        updateDataset(
                          dataset.id,
                          selectedVariable || null,
                          true,
                          selectedVectorVariable || "none"
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
