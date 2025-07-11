import React from "react";
import PropTypes from "prop-types";
import Form from "react-bootstrap/Form";

const CheckBox = ({ id, title, checked, onUpdate, style }) => {
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
      style={style}
    />
  );
};

CheckBox.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  checked: PropTypes.bool,
  onUpdate: PropTypes.func.isRequired,
  style: PropTypes.object,
};

export default CheckBox;

