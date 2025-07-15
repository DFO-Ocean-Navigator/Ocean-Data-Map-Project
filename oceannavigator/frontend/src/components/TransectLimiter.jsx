import React, { useState, useEffect } from "react";
import { Form } from "react-bootstrap";
import NumberBox from "./NumberBox.jsx";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

const TransectLimiter = ({
  id,
  title,
  parameter,
  state: propState,
  onUpdate,
}) => {
  const { t: _ } = useTranslation();

  // Determine initial limit and value from propState
  const initialLimit = !(isNaN(propState) || propState === false);
  const initialValue = initialLimit ? parseInt(propState, 10) : 200;

  const [limit, setLimit] = useState(initialLimit);
  const [value, setValue] = useState(initialValue);

  // Sync local state when propState changes
  useEffect(() => {
    if (isNaN(propState) || propState === false) {
      setLimit(false);
      setValue(200);
    } else {
      setLimit(true);
      setValue(parseInt(propState, 10));
    }
  }, [propState]);

  const handleChecked = (e) => {
    const checked = e.target.checked;
    setLimit(checked);
    if (checked) {
      onUpdate(id, value);
    } else {
      onUpdate(id, false);
    }
  };

  const handleValueUpdate = (_key, newValue) => {
    setValue(newValue);
    onUpdate(id, newValue);
  };

  return (
    <div className="TransectLimiter">
      <Form.Check
        type="checkbox"
        checked={limit}
        onChange={handleChecked}
        label={title}
      />

      {limit && (
        <NumberBox
          id="depth"
          state={value}
          onUpdate={handleValueUpdate}
          title={parameter}
        />
      )}
    </div>
  );
};

TransectLimiter.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string,
  parameter: PropTypes.string,
  state: PropTypes.oneOfType([PropTypes.number, PropTypes.bool]),
  onUpdate: PropTypes.func,
};

export default TransectLimiter;
