import React, { useState, useEffect } from "react";
import { Button, Row, Col, Form, Badge, Spinner } from "react-bootstrap";
import DatePicker from "react-datepicker";
import { useTranslation } from "react-i18next";
import {
  GetAllVariablesPromise,
  FilterDatasetsByDatePromise,
  FilterDatasetsByLocationPromise,
} from "../remote/OceanNavigator.js";

const DatasetSearchWindow = ({
  datasets,
  filters,
  updateFilters,
  updateDataset,
  closeModal,
}) => {
  const { t } = useTranslation();
  const [filterLabels, setFilterLabels] = useState([]);
  const [filteredDatasetIds, setFilteredDatasetIds] = useState(
    datasets.map((ds) => ds.id)
  );
  const [variableDataMap, setVariableDataMap] = useState({});
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const loadData = async () => {
      const variablesResult = await GetAllVariablesPromise();
      setVariableDataMap(variablesResult.data);
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (Object.keys(variableDataMap).length > 0) {
      applyFilters();
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      let newLat = parseFloat(latitude);
      let newLon = parseFloat(longitude);

      newLat = !isNaN(newLat) && Math.abs(newLat) <= 90 ? newLat.toFixed(4) : "";
      newLon = !isNaN(newLon) && Math.abs(newLon) <= 360? newLon.toFixed(4) : "";

      updateFilters("location", [newLat, newLon]);
    }, 500);

    return () => clearTimeout(timer);
  }, [latitude, longitude]);

  const applyDataset = (id) => {
    let variableId,
      variableScale = null;
    let variable = variableDataMap[filters.variable]?.filter(
      (ds) => ds.dataset_id === id
    )[0];
    if (variable) {
      variableId = variable.variable_id;
      variableScale = variable.variable_scale;
    }
    let vectorVariable =
      variableDataMap[filters.vectorVariable]?.filter(
        (ds) => ds.dataset_id === id
      )[0].variable_id ?? "none";

    updateDataset(
      id,
      variableId,
      true,
      vectorVariable,
      variableScale,
      filters.date
    );
    closeModal();
  };

  const applyFilters = async () => {
    setLoading(true);
    let newFilteredIds = datasets.map((ds) => ds.id);
    let newFilterLabels = [];

    // Filter by variable
    if (filters.variable !== "any") {
      const variableData = variableDataMap[filters.variable];
      const datasetIds = variableData.map((entry) => entry.dataset_id);
      newFilteredIds = datasetIds.filter((id) => datasetIds.includes(id));
      newFilterLabels.push({
        key: "variable",
        label: `Variable: ${filters.variable}`,
      });
    }

    // Filter by vector variable
    if (filters.vectorVariable !== "none") {
      const variableData = variableDataMap[filters.vectorVariable];
      const datasetIds = variableData.reduce(
        (ids, ds) => (ds.vector_variables ? ids.concat([ds.dataset_id]) : ids),
        []
      );
      newFilteredIds = newFilteredIds.filter((id) => datasetIds.includes(id));
      newFilterLabels.push({
        key: "vectorVariable",
        label: `${t("Quiver")}: ${filters.vectorVariable}`,
      });
    }

    // Filter by depth
    if (filters.depth !== "all") {
      let datasetIds = Object.values(variableDataMap).reduce((ids, ds) => {
        ds.forEach((d) => {
          if (d.depth) {
            ids.push(d.dataset_id);
          }
        });
        return ids;
      }, []);
      datasetIds = [...new Set(datasetIds)];
      newFilteredIds = newFilteredIds.filter((id) =>
        filters.depth === "3d"
          ? datasetIds.includes(id)
          : !datasetIds.includes(id)
      );
      newFilterLabels.push({
        key: "depth",
        label: `Depth dimension: ${filters.depth}`,
      });
    }

    // Filter by date
    if (filters.date !== null) {
      newFilterLabels.push({
        key: "date",
        label: `Date: ${new Date(filters.date).toLocaleDateString()}`,
      });
      let dateFilter = await FilterDatasetsByDatePromise(
        newFilteredIds,
        filters.date.toISOString()
      );
      newFilteredIds = await dateFilter.data;
    }

    // Filter by Location
    if (filters.location[0] && filters.location[1]) {
      let locFiltered = await FilterDatasetsByLocationPromise(
        newFilteredIds,
        filters.location[0],
        (parseFloat(filters.location[1]) + 360) % 360
      );
      newFilteredIds = await locFiltered.data;
      newFilterLabels.push({
        key: "location",
        label: `Location: ${filters.location[0]}°, ${filters.location[1]}°`,
      });
    }

    newFilterLabels = newFilterLabels.map(({ key, label }) => (
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

    setFilterLabels(newFilterLabels);
    setFilteredDatasetIds(newFilteredIds);
    setLoading(false);
  };

  const depthOptions = [
    <option key="all" value="all">
      Any
    </option>,
    <option key="3d" value="3d">
      With depth dimension
    </option>,
    <option key="2d" value="2d">
      Without depth dimension
    </option>,
  ];

  let variableOptions = [
    <option key="any" value="any">
      Any
    </option>,
    ...Object.keys(variableDataMap).map((name) => (
      <option key={name} value={name}>
        {name}
      </option>
    )),
  ];

  let vectorVariableOptions = Object.keys(variableDataMap).reduce(
    (vars, name) => {
      if (variableDataMap[name].some((d) => d.vector_variables)) {
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

  let datasetCards = filteredDatasetIds.map((id) => {
    let dataset = datasets.filter((ds) => ds.id == id)[0];
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
      {loading && (
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
              selected={filters.date}
              onChange={(d) => updateFilters("date", d)}
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
              {datasetCards.length} / {datasets.length} {t("Datasets")}
            </h6>
          </div>
          <div className="dataset-list">{datasetCards}</div>
        </Col>
      </Row>
    </>
  );
};

export default DatasetSearchWindow;
