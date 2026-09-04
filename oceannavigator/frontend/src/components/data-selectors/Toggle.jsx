import React from "react";
import PropTypes from "prop-types";
import Form from "react-bootstrap/Form";
import { withTranslation } from "react-i18next";
import { useEffect } from "react";
import Accordion from "react-bootstrap/Accordion";

const Toggle = ({ id, dataset, onChange }) => {

  const variables = Array.isArray(dataset?.variable)
    ? dataset.variable
    : dataset?.variable
      ? [dataset.variable]
      : [];
  const unitSelection = dataset?.unitSelection || {};
  const axisRange = dataset?.axisRange || {};

  //For radio display, unchecking/checking all if all variables are not the same value (true or false)
  const allSameBoolean = Object.keys(unitSelection).length > 0 && (Object.values(unitSelection).every((value) => value === true) || Object.values(unitSelection).every((value) => value === false));

  const updateDataset = (key, value) => {
    onChange(key, value);
  };

  // Build unit selection object 
  const buildUnitSelection = () => {
      return {
        all: false,
        depth: false,
        ...Object.fromEntries(
          variables.map((variable) => [variable.id, false])
        ),
      };
  };

  // Updates axis range scale with imperial scale if checked, otherwise with metric scale
  const setAxisRangeScale = (varId, checked) => {
    if (
      varId !== "all" &&
      varId !== "depth" &&
      axisRange[varId] != null
    ) {
      if (checked) {
        updateDataset("axisRange", [varId, dataset.variable.imperial_scale]);
      }
      else if (!checked) {
        updateDataset("axisRange",[varId, dataset.variable.scale]);
      }
    }
  }

  // updates unit selection object when values are selected on UI
  const updateUnitSelection = (varId, checked) => {
      let currentSelection = dataset.unitSelection;

      // If "all" is selected, update all variables to the same value 
      if (varId === "all") {
        const updatedSelection = Object.fromEntries(
          Object.keys(currentSelection).map((id) => [id, checked])
        );

        updateDataset("unitSelection", updatedSelection);

        Object.keys(unitSelection).forEach((variableId) => {
          setAxisRangeScale(variableId, checked);
        });
      } // Otherwise update single variable 
      else {
        const updatedSelection = {
          ...currentSelection,
          [varId]: checked,
        };

        // Update "all" selection based on whether all variables are selected or not
        const variableIds = Object.keys(updatedSelection).filter(
          (id) => id !== "all"
        );
        updatedSelection.all =
          variableIds.length > 0 &&
          variableIds.every((id) => updatedSelection[id]);

        updateDataset("unitSelection", updatedSelection);

        setAxisRangeScale(varId, checked);
      }
  };

  const radioOptions = [
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

  useEffect(() => {
    // Rebuild the unit selection when the variables changes
    updateDataset("unitSelection", buildUnitSelection(dataset));
  }, [dataset.variable]);

  return (
    <div className="units-options">
      <div>
        <Accordion className="imperial-units-accordion">
          <Accordion.Item eventKey={id}>
            <Accordion.Header>{"Unit Selection"} </Accordion.Header>
            <Accordion.Body>
              <div className="unit-table">
                <div className="unit-table-header">
                  <span className="unit-table-header-spacer" />
                  <span className="unit-table-header-col">Metric</span>
                  <span className="unit-table-header-col">Imperial</span>
                </div>

                {radioOptions.map((option) => (
                <div key={option.id} className="unit-table-row">
                  <Form.Label className="unit-option-label mb-0">
                    {option.label}:
                  </Form.Label>

                  <div className="unit-radio-cell">
                    <Form.Check
                      type="radio"
                      aria-label="Metric"
                      name={`units-${option.id}`}
                      id={`metric-${option.id}`}
                      value="metric"
                      checked={(option.id==="all" && !allSameBoolean)?Boolean(unitSelection?.[option.id]):Boolean(!unitSelection?.[option.id])}
                      onChange={() =>
                        updateUnitSelection(option.id, false)
                      }
                    />
                  </div>

                  <div className="unit-radio-cell">
                    <Form.Check
                      type="radio"
                      aria-label="Imperial"
                      name={`units-${option.id}`}
                      id={`imperial-${option.id}`}
                      value="imperial"
                      checked={Boolean(unitSelection?.[option.id])}
                      onChange={() =>
                        updateUnitSelection(option.id, true)
                      }
                    />
                  </div>
                </div>
                ))}
              </div>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </div>
    </div>
  );
};

Toggle.propTypes = {
  id: PropTypes.string.isRequired,
  dataset: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default withTranslation()(Toggle);