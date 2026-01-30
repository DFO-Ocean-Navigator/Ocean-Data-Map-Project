import React, { useState, useEffect, useRef } from "react";
import { Button, Form } from "react-bootstrap";
import PropTypes from "prop-types";

import { faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { withTranslation } from "react-i18next";

function AxisRange(props) {
  const [auto, setAuto] = useState(props.variable_range ? false : true);
  const [min, setMin] = useState(props.variable_range?.[0] ?? props.range[0]);
  const [max, setMax] = useState(props.variable_range?.[1] ?? props.range[1]);
  const timerRef = useRef(null);

  useEffect(() => {
    let newMin = parseFloat(min);
    let newMax = parseFloat(max);

    if (!isNaN(newMin) && !isNaN(newMax)) {
      updateParent([newMin, newMax]);
    }
  }, [min, max]);

  const updateParent = (newRange) => {
    if (auto) {
      props.onUpdate("axisRange", [props.variable.id, null]);
    } else {
      props.onUpdate("axisRange", [props.variable.id, newRange]);
    }
  };

  const changed = (key, e) => {
    let value = e.target.value;
    if (key === "min") {
      setMin(value);
    } else if (key === "max") {
      setMax(value);
    }
  };

  const autoChanged = (e) => {
    setAuto(e.target.checked);
    if (e.target.checked) {
      props.onUpdate("axisRange", [props.variable.id, null]);
      setMin(props.range[0]);
      setMax(props.range[1]);
    } else {
      props.onUpdate("axisRange", [props.variable.id, [min, max]]);
    }
  };

  const handleResetButton = () => {
    clearTimeout(timerRef.current);

    setMin(props.variable.scale[0]);
    setMax(props.variable.scale[1]);

    timerRef.current = setTimeout(
      updateParent([props.variable.scale[0], props.variable.scale[1]]),
      500,
    );
  };

  return (
    <div className="axis-range">
      <Form.Label className="range-label">{props.title}</Form.Label>
      <Form.Check
        type="checkbox"
        id={props.id + "_auto"}
        checked={auto}
        onChange={autoChanged}
        label={"Auto"}
      />
      <table className="range-table">
        <tbody>
          <tr>
            <td>
              <input
                className="range-input"
                type="number"
                value={min}
                onChange={(n, s) => changed("min", n)}
                step={0.1}
                disabled={auto}
              />
            </td>
            <td>
              <input
                className="range-input"
                type="number"
                value={max}
                onChange={(n, s) => changed("max", n)}
                step={0.1}
                disabled={auto}
              />
            </td>
            <td className="default-button-container">
              <Button name="default" size="sm" onClick={handleResetButton}>
                <FontAwesomeIcon icon={faRotateLeft} />
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

//***********************************************************************
AxisRange.propTypes = {
  id: PropTypes.string,
  title: PropTypes.string,
  variable: PropTypes.object,
  range: PropTypes.array,
  onUpdate: PropTypes.func,
};

export default withTranslation()(AxisRange);
