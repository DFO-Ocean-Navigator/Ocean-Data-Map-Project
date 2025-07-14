import React, { useState } from "react";
import { Form, Row, Col } from "react-bootstrap";
import PropTypes from "prop-types";
import { withTranslation } from "react-i18next";
import fastEqual from "fast-deep-equal/es6/react";

function SelectBox({
  id,
  name,
  label,
  placeholder,
  options,
  selected,
  onChange,
  loading = false,
  multiple = false,
  horizontalLayout = false,
  helpContent = null,
}) {
  const [showHelp, setShowHelp] = useState(false);
  const toggleShowHelp = () => setShowHelp((h) => !h);

  const opts = Array.isArray(options)
    ? options.map((opt) => (
        <option key={`option-${opt.id}`} value={opt.id}>
          {opt.value}
        </option>
      ))
    : null;

  const disabled =
    loading || !Array.isArray(options) || options.length === 0;

  // choose layout element
  const FormGroup = horizontalLayout ? Row : Col;

  return (
    <Form.Group controlId={`formgroup-${id}-selectbox`} as={FormGroup}>
      <Form.Label column>{label}</Form.Label>
      <Form.Select
        name={name}
        placeholder={disabled ? "Loading..." : placeholder}
        onChange={(e) =>
          multiple
            ? onChange(e.target.name, e.target.selectedOptions)
            : onChange(e.target.name, e.target.value)
        }
        disabled={disabled}
        value={selected}
        multiple={multiple}
        className={
          horizontalLayout ? "form-select-horizontal" : "form-select"
        }
      >
        {opts}
      </Form.Select>

    </Form.Group>
  );
}

SelectBox.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.object).isRequired,
  selected: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.arrayOf(PropTypes.string),
  ]).isRequired,
  loading: PropTypes.bool,
  multiple: PropTypes.bool,
  horizontalLayout: PropTypes.bool,
  helpContent: PropTypes.arrayOf(PropTypes.object),
};

export default withTranslation()(
  React.memo(SelectBox, (prev, next) => fastEqual(prev, next))
);
