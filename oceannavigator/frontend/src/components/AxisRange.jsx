import React, { useState, useEffect, useRef } from "react";
import { Button, Form } from "react-bootstrap";
import PropTypes from "prop-types";

import { faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { withTranslation } from "react-i18next";

function AxisRange(props) {
  const [auto, setAuto] = useState(true);
  const [min, setMin] = useState(props.range[0]);
  const [max, setMax] = useState(props.range[1]);
  const timerRef = useRef(null);

  useEffect(() => {
    let newMin = parseFloat(min);
    let newMax = parseFloat(max);

    if (!isNaN(newMin) && !isNaN(newMax)) {
      updateParent([newMin, newMax]);
    }
  }, [min, max]);

  const updateParent = (newRange) => {
    if (auto){
      props.onUpdate("variable_range", [props.variable, null]);
    }
    else{
      props.onUpdate("variable_range", [props.variable, newRange]);
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
      props.onUpdate("variable_range", [props.variable, null]);
    } else {
      updateParent([min, max]);
    }
  };

  const handleResetButton = () => {
    clearTimeout(timerRef.current);

    setMin(props.range[0]);
    setMax(props.range[1]);

    timerRef.current = setTimeout(
      updateParent([props.range[0], props.range[1]]),
      500
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
            <td>
              <Button name="default" onClick={handleResetButton}>
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
  variable: PropTypes.string,
  range: PropTypes.array,
  onUpdate: PropTypes.func,
};

export default withTranslation()(AxisRange);
