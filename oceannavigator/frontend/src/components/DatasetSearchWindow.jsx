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
  ProgressBar,
} from "react-bootstrap";
import Select from "react-select";
import DatePicker from "react-datepicker";
import {
  GetAllVariablesPromise,
  GetAllQuiverVariablesPromise,
  GetDatasetsPromise,
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
  const [locationSearchTime, setLocationSearchTime] = useState(null);

  // Controlled location inputs
  const [locationInputs, setLocationInputs] = useState({
    latitude: '',
    longitude: '',
    tolerance: '0.1'
  });
  
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
          GetDatasetsPromise(),
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
      const raw = datasetsResult.data || [];
      const datasets = raw.map(d=>({
        ...d,
        name: d.name ?? d.value ?? d.id,
      }))

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
        const tolerance = additionalParams.tolerance || 0.1;
        return `Location: ${additionalParams.latitude}°, ${additionalParams.longitude}° (±${tolerance}°)`;
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
        // Clear location inputs
        setLocationInputs({
          latitude: '',
          longitude: '',
          tolerance: '0.1'
        });
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
      setLocationSearchTime(null);
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
            const startTime = performance.now();
            result = await FilterDatasetsByLocationPromise(
              datasetIds,
              filter.latitude,
              filter.longitude
            );
            const endTime = performance.now();
            setLocationSearchTime(Math.round(endTime - startTime));
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
    setLocationSearchTime(null);
    // Clear location inputs
    setLocationInputs({
      latitude: '',
      longitude: '',
      tolerance: '0.1'
    });
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

  // Location input validation
  const validateCoordinate = (value, type) => {
    if (value === '') return true;
    const num = parseFloat(value);
    if (isNaN(num)) return false;
    
    if (type === 'latitude') {
      return num >= -90 && num <= 90;
    } else if (type === 'longitude') {
      return num >= -180 && num <= 180;
    } else if (type === 'tolerance') {
      return num >= 0 && num <= 5;
    }
    return false;
  };

  // Handle location input changes
  const handleLocationInputChange = (field, value) => {
    setLocationInputs(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Trigger auto-search with debouncing
    handleAutoLocationSearch();
  };

  // Check if location search is enabled
  const isLocationSearchEnabled = () => {
    const { latitude, longitude, tolerance } = locationInputs;
    
    return validateCoordinate(latitude, 'latitude') && 
           validateCoordinate(longitude, 'longitude') && 
           validateCoordinate(tolerance, 'tolerance') &&
           latitude !== '' && longitude !== '' &&
           !loading;
  };

  // Handle location search
  const handleLocationSearch = async () => {
    if (!isLocationSearchEnabled()) {
      setError("Please enter valid coordinates: latitude (-90 to 90), longitude (-180 to 180), and tolerance (0 to 5).");
      return;
    }
    
    const latitude = parseFloat(locationInputs.latitude);
    const longitude = parseFloat(locationInputs.longitude);
    const tolerance = parseFloat(locationInputs.tolerance || "0.1");

    // Create new active filters list without location filter
    let newActiveFilters = activeFilters.filter((f) => f.type !== "location");

    const additionalParams = {
      latitude: latitude,
      longitude: longitude,
      tolerance: tolerance,
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
    
    try {
      await rebuildFilters(newActiveFilters);
    } catch (error) {
      setLocationSearchTime(null);
      setError("Location search failed. Please try again.");
    }
  };

  // Auto-search with debouncing
  const [searchTimeout, setSearchTimeout] = useState(null);
  
  const handleAutoLocationSearch = () => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeout = setTimeout(() => {
      if (isLocationSearchEnabled()) {
        handleLocationSearch();
      }
    }, 1500); // 1.5 second delay
    
    setSearchTimeout(timeout);
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

      {/* Performance indicator for location search */}
      {locationSearchTime !== null && (
        <Alert variant="info" className="mb-3">
          <strong>⚡ Fast location search:</strong> Found {currentDatasets.length} datasets in {locationSearchTime}ms
          {locationSearchTime < 100 && " (using optimized perimeter cache)"}
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

          {/* Fixed Location Selector */}
          <Form.Group className="mb-3">
            <Form.Label>Geographic Location</Form.Label>
            <Row>
              <Col>
                <Form.Control
                  type="text"
                  placeholder="Latitude (-90 to 90)"
                  value={locationInputs.latitude}
                  disabled={loading}
                  onChange={(e) => handleLocationInputChange('latitude', e.target.value)}
                  className={
                    locationInputs.latitude && !validateCoordinate(locationInputs.latitude, 'latitude') 
                      ? 'is-invalid' 
                      : locationInputs.latitude ? 'is-valid' : ''
                  }
                />
              </Col>
              <Col>
                <Form.Control
                  type="text"
                  placeholder="Longitude (-180 to 180)"
                  value={locationInputs.longitude}
                  disabled={loading}
                  onChange={(e) => handleLocationInputChange('longitude', e.target.value)}
                  className={
                    locationInputs.longitude && !validateCoordinate(locationInputs.longitude, 'longitude') 
                      ? 'is-invalid' 
                      : locationInputs.longitude ? 'is-valid' : ''
                  }
                />
              </Col>
            </Row>
            <Row className="mt-2">
              <Col>
                <Form.Control
                  type="text"
                  placeholder="Tolerance (degrees)"
                  value={locationInputs.tolerance}
                  disabled={loading}
                  onChange={(e) => handleLocationInputChange('tolerance', e.target.value)}
                  className={
                    locationInputs.tolerance && !validateCoordinate(locationInputs.tolerance, 'tolerance') 
                      ? 'is-invalid' 
                      : locationInputs.tolerance ? 'is-valid' : ''
                  }
                />
              </Col>
              <Col>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleLocationSearch}
                  disabled={!isLocationSearchEnabled()}
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
              Enter coordinates and tolerance. Search happens automatically after 1.5 seconds
              or click "Search Location" immediately. Tolerance controls the buffer zone
              around your point (e.g., 0.1° ≈ 11km).
            </Form.Text>
          </Form.Group>
        </Col>

        <Col md={8}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5>
              Available Datasets ({currentDatasets.length})
            </h5>
            {loading && (
              <div className="text-muted">
                <Spinner animation="border" size="sm" className="me-2" />
                {loadingMessage}
              </div>
            )}
          </div>

          {/* Progress indicator for location searches */}
          {loading && activeFilters.some((f) => f.type === "location") && (
            <ProgressBar animated now={100} className="mb-3" />
          )}

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