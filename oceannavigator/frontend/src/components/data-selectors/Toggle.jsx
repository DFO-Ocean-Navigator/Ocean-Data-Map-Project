import React from "react";
import PropTypes from "prop-types";
import Form from "react-bootstrap/Form";
import { withTranslation } from "react-i18next";
import { useState } from "react";
import Accordion from "react-bootstrap/Accordion";

const Toggle = ({ id, title, checked, checked_variables, onUpdate }) => {

  const handleChange = (e, var_id) => {
    const isChecked = e.target.checked;

    onUpdate(var_id, isChecked);

  };

  return (
    <Accordion>
      <Accordion.Item eventKey={id}>
        <Accordion.Header>
          <div
            className="d-flex align-items-center gap-2"
            //onClick={(e) => e.stopPropagation()}
          >
            {/* <Form.Check
              type="checkbox"
              id={id}
              checked={checked}
              onChange={handleChange}
            /> */}
            <span>{title}</span>
          </div>
        </Accordion.Header>

        <Accordion.Body>
          {checked_variables.map((item) => (
            <Form.Check
              key={item.id}
              id={item.id}
              type="checkbox"
              checked={item.checked}
              onChange={(e) => handleChange(e, item.id)}
              label={item.label}
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
  checked: PropTypes.bool,
  checked_variables: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    checked: PropTypes.bool,
    label: PropTypes.string.isRequired,
  })).isRequired,
  onUpdate: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
};

export default withTranslation()(Toggle);