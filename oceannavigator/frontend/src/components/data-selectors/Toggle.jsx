import React from "react";
import PropTypes from "prop-types";
import Form from "react-bootstrap/Form";
import { withTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import Accordion from "react-bootstrap/Accordion";

const Toggle = ({ id, title, dataset, onChange }) => {

  const variables = Array.isArray(dataset?.variable)
    ? dataset.variable
    : dataset?.variable
      ? [dataset.variable]
      : [];
  const unitSelection = dataset?.unitSelection || {};
  const axisRange = dataset?.axisRange || {};

  const updateDataset = (key, value) => {
    onChange(key, value);
  };

    // Imperial Units Accordion
  const buildUnitSelection = (dataset) => {
    const variables = Array.isArray(dataset?.variable)
      ? dataset.variable
      : dataset?.variable
        ? [dataset.variable]
        : [];

      return {
        all: false,
        depth: false,
        ...Object.fromEntries(
          variables.map((variable) => [variable.id, false])
        ),
      };
  };

    // Imperial Units Accordion
  const updateUnitSelection = (varId, checked) => {
      let currentSelection = dataset.unitSelection;

      // Rebuild the selection when it does not match the current dataset
      if (
        !currentSelection ||
        !Object.prototype.hasOwnProperty.call(currentSelection, varId)
      ) {
        currentSelection = buildUnitSelection(dataset);
      }

      // Checking "all" updates every checkbox
      if (varId === "all") {
        const updatedSelection = Object.fromEntries(
          Object.keys(currentSelection).map((id) => [id, checked])
        );

        updateDataset("unitSelection", updatedSelection);
        return;
      }

      const updatedSelection = {
        ...currentSelection,
        [varId]: checked,
      };

      const variableIds = Object.keys(updatedSelection).filter(
        (id) => id !== "all"
      );

      // updateAxisRange(varId, checked);

      updatedSelection.all =
        variableIds.length > 0 &&
        variableIds.every((id) => updatedSelection[id]);

      updateDataset("unitSelection", updatedSelection);

      // Update is_imperial in dataset.variable for the specific variable
      if (
        varId !== "all" &&
        varId !== "depth" &&
        checked && 
        axisRange[varId] != null
      ) {
        updateDataset(
          "axisRange",
          [varId, dataset.variable.imperial_scale]
        );
      }
      else if (
        varId !== "all" &&
        varId !== "depth" &&
        !checked && 
        axisRange[varId] != null
      ) {
        updateDataset(
          "axisRange",
          [varId, dataset.variable.scale]
        );
      }
  };

  const checkboxOptions = [
    {
      id: "all",
      label: "All Variables",
    },
    {
      id: "depth",
      label: "Depth",
    },
    ...variables.map((variable) => ({
      id: variable.id,
      label: variable.value,
    })),
  ];

  const conversions = {
    metersToFeet: (x) => x * 3.281,
    feetToMeters: (x) => x / 3.281,

    celsiusToFahrenheit: (x) => x * 1.8 + 32,
    fahrenheitToCelsius: (x) => (x - 32) / 1.8,

    metersPerSecondToFeetPerSecond: (x) => x * 3.281,
    feetPerSecondToMetersPerSecond: (x) => x / 3.281,

    kgPerM3ToLbPerFt3: (x) => x * 0.06243,
    lbPerFt3ToKgPerM3: (x) => x / 0.06243,
  };

  // useEffect(() => {
  //   Object.entries(unitSelection).forEach(([variableId, checked]) => {
  //     if (
  //       variableId !== "all" &&
  //       variableId !== "depth" &&
  //       checked && 
  //       axisRange[variableId] != null
  //     ) {
  //       updateDataset(
  //         "axisRange",
  //         [variableId, [conversions.celsiusToFahrenheit(axisRange[variableId][0]),conversions.celsiusToFahrenheit(axisRange[variableId][1])]]
  //       );
  //     }
  //     if (
  //       variableId !== "all" &&
  //       variableId !== "depth" &&
  //       !checked && 
  //       axisRange[variableId] != null
  //     ) {
  //       updateDataset(
  //         "axisRange",
  //         [variableId, [conversions.fahrenheitToCelsius(axisRange[variableId][0]),conversions.fahrenheitToCelsius(axisRange[variableId][1])]]
  //       );
  //     }
  //   });
  // }, [unitSelection, axisRange]);

  useEffect(() => {
    // Rebuild the unit selection when the variables changes
    updateDataset("unitSelection", buildUnitSelection(dataset));
  }, [dataset.variable]);

  return (
    <div>
      <div>
        <Form.Label className="unit-toggle-label">{title}</Form.Label>
      </div>
      <div>
        <Accordion key="plot-options" className="imperial-units-accordion">
          <Accordion.Item eventKey={id}>
            <Accordion.Header>{"Imperial Units"} </Accordion.Header>
            <Accordion.Body>
              {checkboxOptions.map((option) => (
                <Form.Check
                  key={option.id}
                  type="checkbox"
                  id={`unit-selection-${id}-${option.id}`}
                  checked={Boolean(unitSelection?.[option.id])}
                  onChange={(event) =>
                    updateUnitSelection(option.id, event.target.checked)
                  }
                  label={option.label}
                />
              ))}
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </div>
    </div>
  );
};


Toggle.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  dataset: PropTypes.object.isRequired,
  // variables: PropTypes.arrayOf(PropTypes.objectOf(PropTypes.shape({
  //   id: PropTypes.string.isRequired,
  //   value: PropTypes.string.isRequired,
  // }))),
  // unitSelection: PropTypes.objectOf(PropTypes.shape({
  //   id: PropTypes.string.isRequired,
  //   value: PropTypes.string.isRequired,
  // })),
  onChange: PropTypes.func.isRequired,
};

export default withTranslation()(Toggle);