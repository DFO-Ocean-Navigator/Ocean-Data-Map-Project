import React, { useState, useEffect, useRef } from "react";
import { Accordion, Button, Form, InputGroup } from "react-bootstrap";
import PropTypes from "prop-types";

import { faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { withTranslation } from "react-i18next";

function AxisRange(props) {
  const [auto, setAuto] = useState(props.range?false:true)
  const [min, setMin] = useState(props.range?props.range[0]:props.variable.scale[0]);
  const [max, setMax] = useState(props.range?props.range[1]:props.variable.scale[1]);
  const timerRef = useRef(null);

  useEffect(() => {
    setMin(props.is_imperial?props.variable.imperial_scale[0]:props.variable.scale[0])
    setMax(props.is_imperial?props.variable.imperial_scale[1]:props.variable.scale[1])
  }, [props.is_imperial])

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
    } else {
      props.onUpdate("axisRange", [props.variable.id, [min, max]]);
    }
  };

  const handleResetButton = () => {
    clearTimeout(timerRef.current);

    let scale = props.variable.scale

    if (props.is_imperial){
      scale = props.variable.imperial_scale
    }

    setMin(scale[0]);
    setMax(scale[1]);

    timerRef.current = setTimeout(
      updateParent([scale[0], scale[1]]),
      500,
    );
  };

  return (
    <div className="axis-range">
      <div className="axis-range-header">
        <span className="axis-range-title">{props.title}</span>

        <Form.Check
          type="checkbox"
          id={`${props.id}_auto`}
          label="Auto"
          checked={auto}
          onChange={autoChanged}
          className="axis-range-auto"
        />

        <Button
          size="sm"
          variant="outline-secondary"
          onClick={handleResetButton}
          title="Reset to default"
          aria-label={`Reset ${props.title} range`}
        >
          <FontAwesomeIcon icon={faRotateLeft} />
        </Button>
      </div>

      <div className="axis-range-inputs">
        <div className="axis-range-inputs">
          <label className="axis-range-tag" htmlFor={`${props.id}_min`}>Min</label>
          <Form.Control
            id={`${props.id}_min`} type="number" size="sm"
            value={min} step={0.1} disabled={auto}
            onChange={(n, s) => changed("min", n)}
          />

          <label className="axis-range-tag" htmlFor={`${props.id}_max`}>Max</label>
          <Form.Control
            id={`${props.id}_max`} type="number" size="sm"
            value={max} step={0.1} disabled={auto}
            onChange={(n, s) => changed("max", n)}
          />
        </div>
      </div>
    </div>
  );
}

//***********************************************************************
AxisRange.propTypes = {
  id: PropTypes.string,
  title: PropTypes.string,
  variable: PropTypes.object,
  is_imperial: PropTypes.bool,
  range: PropTypes.array,
  onUpdate: PropTypes.func,
};

export default withTranslation()(AxisRange);
