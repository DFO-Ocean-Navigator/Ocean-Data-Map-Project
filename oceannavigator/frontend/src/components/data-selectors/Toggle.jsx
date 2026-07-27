import React from "react";
import PropTypes from "prop-types";
import Form from "react-bootstrap/Form";
import { withTranslation } from "react-i18next";
import { useState } from "react";
import Accordion from "react-bootstrap/Accordion";

const Toggle = ({ id, title, variables, unitSelection, onChange }) => {

  const normalizedVariables = Array.isArray(variables)
    ? variables
    : variables
      ? [variables]
      : [];

  const checkboxOptions = [
    {
      id: "all",
      label: "All Variables",
    },
    {
      id: "depth",
      label: "Depth",
    },
    ...normalizedVariables.map((variable) => ({
      id: variable.id,
      label: variable.value,
    })),
  ];


  return (
    <Accordion>
      <Accordion.Item eventKey={id}>
        <Accordion.Header>
          <div className="d-flex align-items-center gap-2">
            <span>{title}</span>
          </div>
        </Accordion.Header>

        <Accordion.Body>
          {checkboxOptions.map((option) => (
            <Form.Check
              key={option.id}
              type="checkbox"
              id={`unit-selection-${option.id}`}
              checked={Boolean(unitSelection?.[option.id])}
              onChange={(event) =>
                onChange(option.id, event.target.checked)
              }
              label={option.label}
            />
          ))}
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
};


Toggle.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  variables: PropTypes.arrayOf(PropTypes.objectOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
  }))),
  unitSelection: PropTypes.objectOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
  })),
  onChange: PropTypes.func.isRequired,
};

export default withTranslation()(Toggle);