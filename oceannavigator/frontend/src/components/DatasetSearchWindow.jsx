import React, { useState, useEffect } from "react";
import { Button, Row, Col, Form, Badge, Spinner } from "react-bootstrap";
import DatePicker from "react-datepicker";
import { useTranslation } from "react-i18next";
import {
  useGetDatasets,
  useGetAllVariables,
  useDateFilter,
  useLocationFilter,
} from "../remote/queries.js";



function filterDatasets(datasets, variables, filters) {
  let filteredDatasetIds = datasets.data.map((ds) => ds.id);

  // Filter by variable
  if (filters.variable !== "any") {
    const variableData = variables.data[filters.variable];
    const datasetIds = variableData.map((entry) => entry.dataset_id);
    filteredDatasetIds = datasetIds.filter((id) => datasetIds.includes(id));
  }

  // Filter by vector variable
  if (filters.vectorVariable !== "none") {
    const variableData = variables.data[filters.vectorVariable];
    const datasetIds = variableData.reduce(
      (ids, ds) => (ds.vector_variables ? ids.concat([ds.dataset_id]) : ids),
      []
    );
    filteredDatasetIds = filteredDatasetIds.filter((id) =>
      datasetIds.includes(id)
    );
  }

  // Filter by depth
  if (filters.depth !== "all") {
    let datasetIds = Object.values(variables.data).reduce((ids, ds) => {
      ds.forEach((d) => {
        if (d.depth) {
          ids.push(d.dataset_id);
        }
      });
      return ids;
    }, []);
    datasetIds = [...new Set(datasetIds)];
    filteredDatasetIds = filteredDatasetIds.filter((id) =>
      filters.depth === "3D"
        ? datasetIds.includes(id)
        : !datasetIds.includes(id)
    );
  }

  // Filter by date
  const dateFilterEnabled = !!filters.date;
  const dateFiltered = useDateFilter(
    filteredDatasetIds,
    filters.date,
    dateFilterEnabled
  );
  dateFiltered.data && (filteredDatasetIds = dateFiltered.data);

  // Filter by location
  const locationFilterEnabled =
    filters.location[0] !== "" && filters.location[1] !== "";
  const locationFiltered = useLocationFilter(
    filteredDatasetIds,
    filters.location,
    locationFilterEnabled
  );
  locationFiltered.data && (filteredDatasetIds = locationFiltered.data);

  const isLoading =
    datasets.status === "pending" ||
    variables.status === "pending" ||
    (dateFilterEnabled && dateFiltered.status === "pending") ||
    (locationFilterEnabled && locationFiltered.status === "pending");

  return { ids: filteredDatasetIds, isLoading };
}

function generateFilterLabels(filters, updateFilters, t) {
  let filterLabels = [];

  if (filters.variable !== "any") {
    filterLabels.push({
      key: "variable",
      label: `Variable: ${filters.variable}`,
    });
  }

  if (filters.vectorVariable !== "none") {
    filterLabels.push({
      key: "vectorVariable",
      label: `${t("Quiver")}: ${filters.vectorVariable}`,
    });
  }

  if (filters.depth !== "all") {
    filterLabels.push({
      key: "depth",
      label: `Depth dimension: ${filters.depth}`,
    });
  }

  if (filters.date !== null) {
    filterLabels.push({
      key: "date",
      label: `Date: ${new Date(filters.date).toLocaleDateString()}`,
    });
  }

  if (filters.location[0] && filters.location[1]) {
    filterLabels.push({
      key: "location",
      label: `Location: ${filters.location[0]}°, ${filters.location[1]}°`,
    });
  }

  return filterLabels.map(({ key, label }) => (
    <Badge key={key} bg="primary" className="d-flex align-items-center">
      {label}
      <button
        type="button"
        className="btn-close btn-close-white ms-2"
        style={{ fontSize: "0.7em" }}
        onClick={() => updateFilters(key)}
      />
    </Badge>
  ));
}

function localToUTC(date) {
  // Adjusts local datetime so that displayed time is consistent with UTC
  if (date) {
    const offset = date.getTimezoneOffset() * 60000;

    return new Date(date.getTime() - offset);
  }
}

function UTCToLocal(date) {
  // Adjusts UTC datetime so that displayed time is consistent with local TZ
  if (date) {
    const currentLocalDate = new Date();
    const offset = currentLocalDate.getTimezoneOffset() * 60000;
    const newDate = new Date(date.getTime() + offset);

    return newDate;
  }
}

const DatasetSearchWindow = ({
  filters,
  updateFilters,
  applyFilters,
  closeModal,
}) => {
  const { t } = useTranslation();
  const [latitude, setLatitude] = useState(filters.location[0]);
  const [longitude, setLongitude] = useState(filters.location[1]);

  const datasets = useGetDatasets();
  const variables = useGetAllVariables();

  const filteredDatasets = filterDatasets(datasets, variables, filters);

  const updateFilterDate = (date) => {
    let utcDate = localToUTC(date, false)

    updateFilters("date", utcDate)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      let newLat = parseFloat(latitude);
      let newLon = parseFloat(longitude);

      newLat =
        !isNaN(newLat) && Math.abs(newLat) <= 90 ? newLat.toFixed(4) : "";
      newLon =
        !isNaN(newLon) && Math.abs(newLon) <= 360 ? newLon.toFixed(4) : "";

      updateFilters("location", [newLat, newLon]);
    }, 500);

    return () => clearTimeout(timer);
  }, [latitude, longitude]);

  const applyDataset = (datasetId) => {
    let dataset = datasets.data.filter((d) => d.id === datasetId)[0];
    dataset = {
      id: dataset.id,
      model_class: dataset.model_class,
      quantum: dataset.quantum,
      depth: 0,
      quiverVariable: "none",
      value: dataset.value,
    };

    let variable = variables.data[filters.variable]?.filter(
      (ds) => ds.dataset_id === datasetId
    )[0];

    let vectorVariable = variables.data[filters.vectorVariable]?.filter(
      (ds) => ds.dataset_id === datasetId
    )[0];

    variable &&
      (dataset.variable = {
        id: variable.variable_id,
        value: filters.variable,
        updateParent: true,
      });
    vectorVariable && (dataset.quiverVariable = vectorVariable.variable_id);

    filters.date &&
      (dataset.time = {
        id: -1,
        value: filters.date,
        updateParent: true,
      });

    applyFilters(dataset);
    closeModal();
  };

  const filterLabels = generateFilterLabels(filters, updateFilters, t);

  const depthOptions = [
    <option key="all" value="all">
      Any
    </option>,
    <option key="3D" value="3D">
      With depth dimension
    </option>,
    <option key="2D" value="2D">
      Without depth dimension
    </option>,
  ];

  let variableOptions = [
    <option key="any" value="any">
      Any
    </option>,
    ...Object.keys(variables.data).map((name) => (
      <option key={name} value={name}>
        {name}
      </option>
    )),
  ];

  let vectorVariableOptions = Object.keys(variables.data).reduce(
    (vars, name) => {
      if (variables.data[name].some((d) => d.vector_variables)) {
        vars.push(
          <option key={name} value={name}>
            {name}
          </option>
        );
      }
      return vars;
    },
    [
      <option key="none" value="none">
        None
      </option>,
    ]
  );

  let datasetCards = filteredDatasets.ids.map((id) => {
    let dataset = datasets.data.filter((ds) => ds.id == id)[0];
    return (
      <div key={id} className="card mb-2">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start">
            <div className="flex-grow-1">
              <h6 className="card-title">{dataset.value}</h6>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => applyDataset(id)}
              className="ms-2"
            >
              {t("Apply")}
            </Button>
          </div>
        </div>
      </div>
    );
  });

  return (
    <>
      {filteredDatasets.isLoading && (
        <div className="loading-overlay">
          <Spinner animation="border" variant="light">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      )}
      {/* Active Filters */}
      <div className="active-filters">
        <h6 className="container-label">{t("Active Filters")}</h6>
        <div className="d-flex flex-wrap gap-2 align-items-center">
          {filterLabels.length > 0 ? (
            filterLabels
          ) : (
            <div className="text-muted me-2">{t("No active filters")}</div>
          )}
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => updateFilters()}
          >
            {t("Clear All")}
          </Button>
        </div>
      </div>

      <Row>
        <Col md={4}>
          <h6 className="container-label">{t("Filters")}</h6>
          {/* Variable Filter */}
          <Form.Group className="mb-3">
            <Form.Label>{t("Variable")}</Form.Label>
            <Form.Select
              key="variable"
              value={filters.variable}
              onChange={(e) => updateFilters("variable", e.target.value)}
            >
              {variableOptions}
            </Form.Select>
          </Form.Group>

          {/* Vector Variable Filter */}
          <Form.Group className="mb-3">
            <Form.Label>{t("Quiver")}</Form.Label>
            <Form.Select
              key="vectorVariable"
              value={filters.vectorVariable}
              onChange={(e) => updateFilters("vectorVariable", e.target.value)}
            >
              {vectorVariableOptions}
            </Form.Select>
          </Form.Group>

          {/* Depth Filter */}
          <Form.Group className="mb-3">
            <Form.Label>{t("With Depth Dimension")}</Form.Label>
            <Form.Select
              key="depth"
              value={filters.depth}
              onChange={(e) => updateFilters("depth", e.target.value)}
            >
              {depthOptions}
            </Form.Select>
          </Form.Group>

          {/* Date Filter */}
          <Form.Group className="mb-3">
            <Form.Label className="d-block">Date</Form.Label>
            <DatePicker
              key="date"
              selected={UTCToLocal(filters.date)}
              onChange={(d) => updateFilterDate(d)}
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
            <Form.Label>{t("Location")}</Form.Label>
            <Row>
              <Col className="latlon-column">
                <Form.Control
                  id="latitude"
                  key="latitude"
                  type="number"
                  min={-90}
                  max={90}
                  placeholder="Latitude"
                  isInvalid={latitude < -90 || latitude > 90}
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                />
              </Col>
              <Col className="latlon-column">
                <Form.Control
                  id="longitude"
                  key="longitude"
                  type="number"
                  min={-360}
                  max={360}
                  placeholder="Longitude"
                  isInvalid={longitude < -360 || longitude > 360}
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                />
              </Col>
            </Row>
          </Form.Group>
        </Col>
        <Col md={8}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="container-label">
              {datasetCards.length} / {datasets.data.length} {t("Datasets")}
            </h6>
          </div>
          <div className="dataset-list">{datasetCards}</div>
        </Col>
      </Row>
    </>
  );
};

export default DatasetSearchWindow;
