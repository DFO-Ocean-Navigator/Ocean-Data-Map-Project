import React from "react";
import PropTypes from "prop-types";
import Form from "react-bootstrap/Form";
import { useTranslation } from "react-i18next";

export default function CheckBox({ id, title, checked, onUpdate }) {
  const { t, i18n } = useTranslation();

  const handleChange = (e) => {
    onUpdate(id, e.target.checked);
  };

  return (
    <Form.Check
      type="checkbox"
      id={id}
      checked={checked}
      onChange={handleChange}
      label={title}
    />
  );
}

CheckBox.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  checked: PropTypes.bool,
  onUpdate: PropTypes.func.isRequired,
};
