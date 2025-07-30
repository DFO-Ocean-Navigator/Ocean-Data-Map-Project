import React, { useState, useEffect, useRef } from "react";
import {
  Button,
  Modal,
  Row,
  Col,
  Form,
  Alert,
  Spinner,
  Badge,
} from "react-bootstrap";
import Select from "react-select";
import DatePicker from "react-datepicker";
import {
  GetAllVariablesPromise,
  GetAllQuiverVariablesPromise,
  GetAllDatasetsPromise,
  FilterDatasetsByVariablePromise,
  FilterDatasetsByQuiverVariablePromise,
  FilterDatasetsByDepthPromise,
  FilterDatasetsByDatePromise,
  FilterDatasetsByLocationPromise,
} from "../remote/OceanNavigator.js";

import "react-datepicker/dist/react-datepicker.css";

const DatasetSearchWindow = ({
  show,
  onClose,
  onApply,
  standalone = false,
}) => {
  const [allVariables, setAllVariables] = useState([]);
  const [allQuiverVariables, setAllQuiverVariables] = useState([]);
  const [allDatasets, setAllDatasets] = useState([]);
  const [currentDatasets, setCurrentDatasets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState("");

  // Refs for uncontrolled location inputs
  const latitudeInputRef = useRef(null);
  const longitudeInputRef = useRef(null);
  
  // Filter states
  const [activeFilters, setActiveFilters] = useState([]);
  const [filters, setFilters] = useState({
    variable: null,
    quiverVariable: null,
    hasDepth: null,
    date: null,
  });

  // Depth options
  const depthOptions = [
    { value: "yes", label: "Yes (variables with depth dimensions)" },
    { value: "no", label: "No (surface variables only)" },
  ];

  useEffect(() => {
    if (show) {
      loadInitialData();
    }
  }, [show]);

  const loadInitialData = async () => {
    setInitialLoading(true);
    setLoading(true);
    setError(null);
    setLoadingMessage("Loading search options and datasets...");

    try {
      console.log("Loading initial data...");

      // Load all data in parallel
      const [variablesResult, quiverVarsResult, datasetsResult] =
        await Promise.all([
          GetAllVariablesPromise(),
          GetAllQuiverVariablesPromise(),
          GetAllDatasetsPromise(),
        ]);

      // Process variables
      const variables = [
        { value: "any", label: "Any" },
        ...variablesResult.data.data.map((v) => ({
          value: v.id,
          label: v.name || v.id,
        })),
      ];
      setAllVariables(variables);

      // Process quiver variables
      const quiverVars = [
        { value: "none", label: "None" },
        ...quiverVarsResult.data.data.map((v) => ({
          value: v.id,
          label: v.name || v.id,
        })),
      ];
      setAllQuiverVariables(quiverVars);

      // Show all datasets initially
      const datasets = datasetsResult.data.datasets || [];
      setAllDatasets(datasets);
      setCurrentDatasets(datasets);
    } catch (error) {
      console.error("Error loading initial data:", error);
      setError("Failed to load search options. Please try again.");
    } finally {
      setInitialLoading(false);
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const getCurrentDatasetIds = () => {
    return currentDatasets.map((d) => d.id);
  };

  const getFilterLabel = (filterType, filterValue, additionalParams = {}) => {
    switch (filterType) {
      case "variable":
        const varOption = allVariables.find((v) => v.value === filterValue);
        return `Variable: ${varOption ? varOption.label : filterValue}`;
      case "quiverVariable":
        const quiverOption = allQuiverVariables.find(
          (v) => v.value === filterValue
        );
        return `Vector: ${quiverOption ? quiverOption.label : filterValue}`;
      case "depth":
        return `Depth: ${
          filterValue === "yes" ? "With depth" : "Surface only"
        }`;
      case "date":
        return `Date: ${new Date(filterValue).toLocaleDateString()}`;
      case "location":
        return `Location: ${additionalParams.latitude}, ${additionalParams.longitude}`;
      default:
        return `${filterType}: ${filterValue}`;
    }
  };

  const removeFilter = async (filterToRemove) => {
    setLoading(true);
    setLoadingMessage("Rebuilding filter chain...");

    try {
      // Remove the filter from active filters
      const remainingFilters = activeFilters.filter(
        (f) =>
          !(f.type === filterToRemove.type && f.value === filterToRemove.value)
      );
      setActiveFilters(remainingFilters);

      // Clear the filter from the form
      const newFilters = { ...filters };
      if (filterToRemove.type === "variable") {
        newFilters.variable = null;
      } else if (filterToRemove.type === "quiverVariable") {
        newFilters.quiverVariable = null;
      } else if (filterToRemove.type === "depth") {
        newFilters.hasDepth = null;
      } else if (filterToRemove.type === "date") {
        newFilters.date = null;
      } else if (filterToRemove.type === "location") {
        // Clear the input values directly
        if (latitudeInputRef.current) latitudeInputRef.current.value = "";
        if (longitudeInputRef.current) longitudeInputRef.current.value = "";
      }
      setFilters(newFilters);

      // Rebuild from scratch
      await rebuildFilters(remainingFilters);
    } catch (error) {
      console.error("Error removing filter:", error);
      setError("Failed to remove filter. Please try again.");
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const rebuildFilters = async (filtersToApply) => {
    setLoading(true);
    setLoadingMessage("Applying filters...");

    try {
      let datasets = [...allDatasets];

      // Apply filters in sequence
      for (const filter of filtersToApply) {
        const datasetIds = datasets.map((d) => d.id);
        let result;

        switch (filter.type) {
          case "variable":
            result = await FilterDatasetsByVariablePromise(
              datasetIds,
              filter.value
            );
            break;
          case "quiverVariable":
            result = await FilterDatasetsByQuiverVariablePromise(
              datasetIds,
              filter.value
            );
            break;
          case "depth":
            result = await FilterDatasetsByDepthPromise(
              datasetIds,
              filter.value,
              filter.variable
            );
            break;
          case "date":
            result = await FilterDatasetsByDatePromise(
              datasetIds,
              filter.value
            );
            break;
          case "location":
            result = await FilterDatasetsByLocationPromise(
              datasetIds,
              filter.latitude,
              filter.longitude
            );
            break;
        }

        datasets = result.data.datasets || [];
      }

      setCurrentDatasets(datasets);
    } catch (error) {
      console.error("Error rebuilding filters:", error);
      setError("Failed to apply filters. Please try again.");
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const clearAllFilters = () => {
    setFilters({
      variable: null,
      quiverVariable: null,
      hasDepth: null,
      date: null,
    });
    setActiveFilters([]);
    setCurrentDatasets(allDatasets);
    // Clear the input values directly
    if (latitudeInputRef.current) latitudeInputRef.current.value = "";
    if (longitudeInputRef.current) longitudeInputRef.current.value = "";
  };

  const handleFilterChange = async (filterName, value) => {
    console.log(`Filter changed: ${filterName} =`, value);

    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);

    // Map form field names to filter types
    const getFilterType = (fieldName) => {
      const mapping = {
        variable: "variable",
        quiverVariable: "quiverVariable",
        hasDepth: "depth",
        date: "date",
      };
      return mapping[fieldName] || fieldName;
    };

    const filterType = getFilterType(filterName);

    // Create new active filters list
    let newActiveFilters = activeFilters.filter((f) => f.type !== filterType);

    // Check if we should add a new filter
    const shouldAddFilter =
      value &&
      !(filterName === "variable" && value.value === "any") &&
      !(
        filterName === "quiverVariable" &&
        (value.value === "any" || value.value === "none")
      );

    if (shouldAddFilter) {
      let filterValue,
        additionalParams = {};

      if (filterName === "variable") {
        filterValue = value.value;
      } else if (filterName === "quiverVariable") {
        filterValue = value.value;
      } else if (filterName === "hasDepth") {
        filterValue = value.value;
        // For depth, also pass the current variable if selected
        const currentVariable =
          newFilters.variable?.value && newFilters.variable.value !== "any"
            ? newFilters.variable.value
            : null;
        additionalParams.variable = currentVariable;
      } else if (filterName === "date") {
        filterValue = value.toISOString();
      }

      // Add the new filter
      newActiveFilters.push({
        type: filterType,
        value: filterValue,
        label: getFilterLabel(filterType, filterValue, additionalParams),
        ...additionalParams,
      });
    }

    // Update active filters and rebuild
    setActiveFilters(newActiveFilters);
    await rebuildFilters(newActiveFilters);
  };

  // Simple input handlers that do ZERO state updates
  const handleLocationInput = (e) => {
    const value = e.target.value;
    
    // Only allow numbers, decimal points, and minus sign at the beginning
    let cleanValue = value.replace(/[^0-9.-]/g, "");

    // Ensure minus sign only appears at the beginning
    if (cleanValue.indexOf("-") > 0) {
      cleanValue = cleanValue.replace(/-/g, "");
      if (value.startsWith("-")) {
        cleanValue = "-" + cleanValue;
      }
    }

    // Limit to one decimal point
    const parts = cleanValue.split(".");
    if (parts.length > 2) {
      cleanValue = parts[0] + "." + parts.slice(1).join("");
    }

    // Update the input value directly (no state updates)
    if (cleanValue !== value) {
      e.target.value = cleanValue;
    }
  };

  const handleLocationKeyPress = (e) => {
    // Allow numbers, decimal point, minus sign, and navigation keys
    if (!/[0-9.-]/.test(e.key) && 
        !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
  };

  // Check if location search should be enabled (only called when button is clicked)
  const isLocationSearchEnabled = () => {
    if (!latitudeInputRef.current || !longitudeInputRef.current) return false;
    
    const lat = latitudeInputRef.current.value.trim();
    const lon = longitudeInputRef.current.value.trim();
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    
    return lat && lon && !isNaN(latNum) && !isNaN(lonNum) && 
           latNum >= -90 && latNum <= 90 && lonNum >= -180 && lonNum <= 180 && !loading;
  };

  const handleLocationSearch = async () => {
    if (!isLocationSearchEnabled()) {
      alert("Please enter valid latitude (-90 to 90) and longitude (-180 to 180) coordinates.");
      return;
    }
    
    const latitude = latitudeInputRef.current.value.trim();
    const longitude = longitudeInputRef.current.value.trim();

    // Create new active filters list without location filter
    let newActiveFilters = activeFilters.filter((f) => f.type !== "location");

    const additionalParams = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
    };

    // Add the location filter
    newActiveFilters.push({
      type: "location",
      value: "location",
      label: getFilterLabel("location", "location", additionalParams),
      ...additionalParams,
    });

    // Update active filters and rebuild
    setActiveFilters(newActiveFilters);
    await rebuildFilters(newActiveFilters);
  };

  const handleApply = (datasetId) => {
    console.log("Applying dataset:", datasetId);
    onApply(datasetId);
    if (!standalone) {
      onClose();
    }
  };

  const handleClose = () => {
    clearAllFilters();
    onClose();
  };

  // Loading screen
  if (initialLoading) {
    return (
      <div className="text-center p-4">
        <Spinner animation="border" role="status">
          <span className="sr-only">Loading...</span>
        </Spinner>
        <div className="mt-2">
          {loadingMessage || "Loading search options..."}
        </div>
      </div>
    );
  }

  // Main content
  const SearchContent = () => (
    <>
      {error && (
        <Alert variant="warning" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Active Filters Display */}
      {activeFilters.length > 0 && (
        <div className="mb-3">
          <h6>Active Filters:</h6>
          <div className="d-flex flex-wrap gap-2">
            {activeFilters.map((filter, index) => (
              <Badge
                key={index}
                bg="primary"
                className="d-flex align-items-center"
                style={{ fontSize: "0.9em" }}
              >
                {filter.label}
                <button
                  type="button"
                  className="btn-close btn-close-white ms-2"
                  style={{ fontSize: "0.7em" }}
                  onClick={() => removeFilter(filter)}
                  disabled={loading}
                />
              </Badge>
            ))}
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={clearAllFilters}
              disabled={loading}
            >
              Clear All
            </Button>
          </div>
        </div>
      )}

      <Row>
        <Col md={4}>
          <h5>Filters</h5>

          {/* Variable Selector */}
          <Form.Group className="mb-3">
            <Form.Label>Variable</Form.Label>
            <Select
              value={filters.variable}
              onChange={(value) => handleFilterChange("variable", value)}
              options={allVariables}
              placeholder="Select variable..."
              isClearable
              isDisabled={loading}
            />
          </Form.Group>

          {/* Quiver Variable Selector */}
          <Form.Group className="mb-3">
            <Form.Label>Vector Variable</Form.Label>
            <Select
              value={filters.quiverVariable}
              onChange={(value) => handleFilterChange("quiverVariable", value)}
              options={allQuiverVariables}
              placeholder="Select vector variable..."
              isClearable
              isDisabled={loading}
            />
          </Form.Group>

          {/* Depth Selector */}
          <Form.Group className="mb-3">
            <Form.Label>Variables with Depth Dimensions</Form.Label>
            <Select
              value={filters.hasDepth}
              onChange={(value) => handleFilterChange("hasDepth", value)}
              options={depthOptions}
              placeholder="Select depth requirement..."
              isClearable
              isDisabled={loading}
            />
            <Form.Text className="text-muted">
              Filter datasets by whether their variables have depth dimensions
            </Form.Text>
          </Form.Group>

          {/* Date Selector */}
          <Form.Group className="mb-3">
            <Form.Label>Date</Form.Label>
            <DatePicker
              selected={filters.date}
              onChange={(date) => handleFilterChange("date", date)}
              className="form-control"
              placeholderText="Select date..."
              isClearable
              disabled={loading}
              dateFormat="yyyy-MM-dd"
              showYearDropdown
              showMonthDropdown
              dropdownMode="select"
            />
            <Form.Text className="text-muted">
              Find datasets available for this specific date
            </Form.Text>
          </Form.Group>

          {/* Location Selector - TRULY UNCONTROLLED */}
          <Form.Group className="mb-3">
            <Form.Label>Location (Optional)</Form.Label>
            <Row>
              <Col>
                <Form.Control
                  ref={latitudeInputRef}
                  type="text"
                  placeholder="Latitude (-90 to 90)"
                  disabled={loading}
                  onInput={handleLocationInput}
                  onKeyPress={handleLocationKeyPress}
                />
              </Col>
              <Col>
                <Form.Control
                  ref={longitudeInputRef}
                  type="text"
                  placeholder="Longitude (-180 to 180)"
                  disabled={loading}
                  onInput={handleLocationInput}
                  onKeyPress={handleLocationKeyPress}
                />
              </Col>
            </Row>
            <Row className="mt-2">
              <Col>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleLocationSearch}
                  disabled={loading}
                  className="w-100"
                >
                  {loading && activeFilters.some((f) => f.type === "location") ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Searching...
                    </>
                  ) : (
                    "Search Location"
                  )}
                </Button>
              </Col>
            </Row>
            <Form.Text className="text-muted">
              Enter coordinates and click "Search Location" to filter datasets
              by geographic coverage
            </Form.Text>
          </Form.Group>
        </Col>

        <Col md={8}>
          <h5>
            Available Datasets ({currentDatasets.length})
            {loading && <span className="text-muted"> - {loadingMessage}</span>}
          </h5>

          <div
            className="dataset-list"
            style={{ maxHeight: "500px", overflowY: "auto" }}
          >
            {activeFilters.length === 0 && (
              <div className="text-muted p-3 text-center">
                <div className="mb-3">
                  <h6>Welcome to Dataset Search</h6>
                  <p>
                    Showing all {allDatasets.length} available datasets. Use the
                    filters on the left to narrow down your search.
                  </p>
                </div>
                <div className="border rounded p-3 bg-light">
                  <strong>How it works:</strong>
                  <ul className="text-start mt-2 mb-0">
                    <li>
                      Start with any filter to begin narrowing down datasets
                    </li>
                    <li>
                      Each filter will be applied to the currently displayed
                      datasets
                    </li>
                    <li>
                      Active filters are shown above and can be removed
                      individually
                    </li>
                    <li>
                      Filters work together - add multiple filters for more
                      precise results
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {loading && (
              <div className="text-muted p-3 text-center">
                <Spinner animation="border" size="sm" className="me-2" />
                {loadingMessage}
              </div>
            )}

            {!loading &&
              activeFilters.length > 0 &&
              currentDatasets.length === 0 && (
                <div className="text-muted p-3 text-center">
                  <h6>No datasets match your filters</h6>
                  <p>Try removing some filters or adjusting your criteria.</p>
                </div>
              )}

            {currentDatasets.map((dataset) => (
              <div key={dataset.id} className="card mb-2">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <h6 className="card-title">{dataset.name}</h6>
                      <p className="card-text">
                        <small className="text-muted">
                          {dataset.group && `Group: ${dataset.group}`}
                          {dataset.subgroup && ` - ${dataset.subgroup}`}
                          <br />
                          {dataset.type && `Type: ${dataset.type}`} | Quantum:{" "}
                          {dataset.quantum}
                          {dataset.matchingVariables &&
                            dataset.matchingVariables.length > 0 && (
                              <>
                                <br />
                                Variables:{" "}
                                {dataset.matchingVariables.join(", ")}
                              </>
                            )}
                        </small>
                      </p>
                      {dataset.help && (
                        <small className="text-info">{dataset.help}</small>
                      )}
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleApply(dataset.id)}
                      disabled={loading}
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

  // Return based on standalone prop
  if (standalone) {
    return (
      <Modal show={show} onHide={handleClose} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Dataset Search</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <SearchContent />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }

  return <SearchContent />;
};

export default DatasetSearchWindow;