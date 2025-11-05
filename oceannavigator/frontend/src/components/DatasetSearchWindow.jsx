import React, { useState, useEffect, useMemo } from "react";
import { Button, Row, Col, Form, Badge } from "react-bootstrap";
import DatePicker from "react-datepicker";
import { useTranslation } from "react-i18next";
import { DATASET_FILTER_DEFAULTS } from "./Defaults.js";
import {
  GetAllVariablesPromise,
  FilterDatasetsByDatePromise,
  FilterDatasetsByLocationPromise,
} from "../remote/OceanNavigator.js";

const LOADING_IMAGE = require("../images/spinner.gif").default;

const DatasetSearchWindow = ({
  datasets,
  filters,
  updateFilters,
  updateDataset,
  closeModal,
}) => {
  const { t } = useTranslation();
  const [datasetDisplayed, setDatasetDisplayed] = useState(datasets);
  const [variableDataMap, setVariableDataMap] = useState({});
  const [locationInput, setLocationInput] = useState({
    latitude: "",
    longitude: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const variablesResult = await GetAllVariablesPromise();
      setVariableDataMap(variablesResult.data);
      setLoading(false);
    };

    loadData();
  }, []);

  const depthOptions = [
    { value: null, label: "Both 2D and 3D" },
    { value: true, label: "Variables with depth dimension" },
    { value: false, label: "Surface variables only" },
  ];

  const variables = useMemo(() => {
    if (Object.keys(variableDataMap).length === 0) return [{ value: "Any", key: "any" }];

    return [
      { value: "Any", key: "any" },
      ...Object.entries(variableDataMap).map(([variableName, datasets]) => ({
        value: variableName,
        id: datasets[0].variable_id,
        key: `${variableName}-${datasets[0]?.variable_id}`,
      })),
    ];
  }, [variableDataMap]);

  const vectorVariables = useMemo(() => {
    if (Object.keys(variableDataMap).length === 0) return [{ value: "None", key: "none" }];

    const vectorVariableMap = {};

    Object.entries(variableDataMap).forEach(
      ([variableName, datasetEntries]) => {
        datasetEntries.forEach((entry) => {
          if (entry.vector_variables === true) {
            vectorVariableMap[variableName] = entry.variable_id;
          }
        });
      }
    );

    return [
      { value: "None", key: "none" },
      ...Object.entries(vectorVariableMap).map(([name, id]) => ({
        value: name,
        id,
      })),
    ];
  }, [variableDataMap]);

  console.log(filters);

  // const getActiveFilters = () => {
  //   const active = [];
  //   if (filters.latitude !== "" && filters.longitude !== "") {
  //     active.push({
  //       key: "location",
  //       label: `Location: ${filters.latitude}°, ${filters.longitude}°`,
  //     });
  //   }

  //   Object.entries(filters).forEach(([key, value]) => {
  //     if (
  //       key === "latitude" ||
  //       key === "longitude" ||
  //       value === FILTER_DEFAULTS[key]
  //     ) {
  //       return;
  //     }

  //     let label = "";
  //     switch (key) {
  //       case "vectorVariable":
  //         label = `${t("Quiver")}: ${value}`;

  //         break;
  //       case "date":
  //         label = `Date: ${new Date(value).toLocaleDateString()}`;

  //         break;
  //       default:
  //         label = `${key}: ${String(value)}`;
  //     }

  //     active.push({ key, label });
  //   });

  //   return active;
  // };

  // // Client-side filtering logic
  // const applyFilters = async (newFilters) => {
  //   let temp_dataset = [...datasets];
  //   setLoading(true);

  //   // Filter by variable
  //   if (newFilters.variable !== "any") {
  //     const variableData = variableDataMap[newFilters.variable] || [];
  //     const datasetIdsWithVariable = variableData.map(
  //       (entry) => entry.dataset_id
  //     );
  //     temp_dataset = temp_dataset.filter((obj) =>
  //       datasetIdsWithVariable.includes(obj.id)
  //     );
  //   }

  //   // Filter by vector variable
  //   if (newFilters.vectorVariable !== "none") {
  //     const variableData = variableDataMap[newFilters.vectorVariable] || [];
  //     const datasetsWithVector = variableData
  //       .map((entry) => {
  //           const ds = datasets.find((d) => d.id === entry.dataset_id);
  //         return entry.vector_variables === true && ds && ds.model_class !== "Nemo" ? ds.id : null;
  //       })
  //       .filter(Boolean);
  //     temp_dataset = temp_dataset.filter((obj) =>
  //       datasetsWithVector.includes(obj.id)
  //     );
  //   }

  //   // Filter by depth
  //   if (newFilters.depth !== null) {
  //     const datasetsWithDepthRequirement = [];
  //     Object.values(variableDataMap).forEach((variableEntries) => {
  //       variableEntries.forEach((entry) => {
  //         if (entry.depth === newFilters.depth) {
  //           datasetsWithDepthRequirement.push(entry.dataset_id);
  //         }
  //       });
  //     });
  //     temp_dataset = temp_dataset.filter((obj) =>
  //       datasetsWithDepthRequirement.includes(obj.id)
  //     );
  //   }

  //   // Filter by date
  //   if (newFilters.date !== null) {
  //     const result = await FilterDatasetsByDatePromise(
  //       temp_dataset.map((obj) => obj.id),
  //       newFilters.date.toISOString()
  //     );
  //     if (Array.isArray(result.data)) {
  //       temp_dataset = temp_dataset.filter((obj) =>
  //         result.data.includes(obj.id)
  //       );
  //     }
  //   }

  //   // Filter by Location
  //   if (newFilters.latitude !== "" && newFilters.longitude !== "") {
  //     let longitude = (newFilters.longitude + 360) % 360;
  //     const result = await FilterDatasetsByLocationPromise(
  //       temp_dataset.map((obj) => obj.id),
  //       newFilters.latitude,
  //       longitude
  //     );
  //     if (Array.isArray(result.data)) {
  //       temp_dataset = temp_dataset.filter((obj) =>
  //         result.data.includes(obj.id)
  //       );
  //     }
  //   }

  //   setDatasetDisplayed(temp_dataset);
  //   setFilters(newFilters);
  //   setLoading(false);
  // };

  // const handleFilterChange = (filterName, value) => {
  //   const newFilters = { ...filters, [filterName]: value };
  //   applyFilters(newFilters);
  // };

  // const removeFilter = (filterToRemove) => {
  //   const newFilters = { ...filters };

  //   switch (filterToRemove) {
  //     case "variable":
  //       newFilters.variable = FILTER_DEFAULTS.variable;
  //       break;
  //     case "vectorVariable":
  //       newFilters.vectorVariable = FILTER_DEFAULTS.vectorVariable;
  //       break;
  //     case "depth":
  //       newFilters.depth = FILTER_DEFAULTS.depth;
  //       break;
  //     case "date":
  //       newFilters.date = FILTER_DEFAULTS.date;
  //       break;
  //     case "location":
  //       newFilters.latitude = FILTER_DEFAULTS.latitude;
  //       newFilters.longitude = FILTER_DEFAULTS.longitude;
  //       setLocationInput({ latitude: "", longitude: "" });
  //       break;
  //   }

  //   setFilters(newFilters);
  //   applyFilters(newFilters);
  // };

  const clearAllFilters = () => {
    // setFilters({ ...FILTER_DEFAULTS });
    // setLocationInput({
    //   latitude: "",
    //   longitude: "",
    // });
    // setDatasetDisplayed(datasets);
  };

  // const activeFilters = getActiveFilters();

  return (
    <>
      {/* Active Filters */}
      <div className="mb-3">
        <h6>{t("Active Filters")}</h6>
        <div className="d-flex flex-wrap gap-2 align-items-center">
          {/* {activeFilters.length > 0 ? (
            activeFilters.map(({ key, label }) => (
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
            ))
          ) : (
            <div className="text-muted me-2">{t("No active filters")}</div>
          )} */}
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={clearAllFilters}
          >
            {t("Clear All")}
          </Button>
        </div>
      </div>

      <Row>
        <Col md={4}>
          <h5>{t("Filters")}</h5>

          {/* Variable Filter */}
          <Form.Group className="mb-3">
            <Form.Label>{t("Variable")}</Form.Label>
            <Form.Select
              key="variable"
              value={filters.variable}
              onChange={updateFilters}
            >
              {variables.map((opt) => (
                <option key={opt.key || opt.value} value={opt.value}>
                  {opt.value}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          {/* Vector Variable Filter */}
          <Form.Group className="mb-3">
            <Form.Label>{t("Quiver")}</Form.Label>
            <Form.Select
              key="vectorVariable"
              value={filters.vectorVariable}
              onChange={updateFilters}
            >
              {vectorVariables.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.value}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          {/* Depth Filter */}
          <Form.Group className="mb-3">
            <Form.Label>{t("With Depth Dimension")}</Form.Label>
            <Form.Select
              ley="depth"
              value={filters.depth}
              onChange={updateFilters}
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
              key="date"
              selected={filters.date}
              onChange={updateFilters}
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
              <Col>
                <Form.Control
                  key="latitude"
                  type="number"
                  min={-90}
                  max={+90}
                  placeholder="Latitude"
                  value={locationInput.latitude || ""}
                  onChange={updateFilters}
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
                  key="longitude"
                  type="number"
                  min={-360}
                  max={360}
                  placeholder="Longitude"
                  value={locationInput.longitude || ""}
                  onChange={updateFilters}
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
              disabled={
                !locationInput.latitude ||
                !locationInput.longitude ||
                parseFloat(locationInput.latitude) < -90 ||
                parseFloat(locationInput.latitude) > 90 ||
                parseFloat(locationInput.longitude) < -360 ||
                parseFloat(locationInput.longitude) > 360
              }
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
              {t("Search Location")}
            </Button>
          </Form.Group>
        </Col>

        <Col md={8}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5>
              ({datasetDisplayed.length}) / ({datasets.length}) {t("Datasets")}
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
                        const selectedVariableobj = variables.find(
                          (v) => v.value === filters.variable
                        );
                        const selectedVariable = selectedVariableobj.id;

                        const selectedVectorVariableObj = vectorVariables.find(
                          (v) => v.value === filters.vectorVariable
                        );
                        const selectedVectorVariable =
                          selectedVectorVariableObj.id;

                        let selectedVariableScale = null;
                        if (filters.variable != "any") {
                          selectedVariableScale =
                            variableDataMap[filters.variable][0].variable_scale;
                        }

                        updateDataset(
                          dataset.id,
                          selectedVariable || null,
                          true,
                          selectedVectorVariable || "none",
                          selectedVariableScale || null
                        );
                        closeModal();
                      }}
                      className="ms-2"
                    >
                      {t("Apply")}
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
