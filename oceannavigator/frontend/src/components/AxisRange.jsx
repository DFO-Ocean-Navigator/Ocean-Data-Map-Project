import React, { useState, useEffect, useRef } from "react";
import { Button, Form, InputGroup } from "react-bootstrap";
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
    <div className="axis-range-row">
      <span className="axis-range-name">{props.title}</span>

      <Form.Check
        checked={auto}
        onChange={autoChanged}
      />

      <span className="axis-range-label">Min</span>

      <Form.Control
        type="number"
        size="sm"
        value={min}
        className="axis-range-input"
        onChange={(n, s) => changed("min", n)}
        step={0.1}
        disabled={auto}
      />

      <span className="axis-range-label">Max</span>

      <Form.Control
        type="number"
        size="sm"
        value={max}
        className="axis-range-input"
        onChange={(n, s) => changed("max", n)}
        step={0.1}
        disabled={auto}
      />

      <Button
        size="sm"
        variant="info"
        className="axis-range-reset"
        onClick={handleResetButton}
      >
        ↶
      </Button>
    </div>
    // <InputGroup className="axis-range-row">
    //   <InputGroup.Text className="axis-label">
    //     {props.title}
    //   </InputGroup.Text>
    //   <InputGroup.Checkbox
    //     type="checkbox"
    //     id={props.id + "_auto"}
    //     checked={auto}
    //     onChange={autoChanged}
    //     label={"Auto"}
    //   />

    //   <InputGroup.Text className="axis-label">
    //     Min
    //   </InputGroup.Text>

    //   <Form.Control
    //     className="axis-input"
    //     type="number"
    //     value={min}
    //     onChange={(n, s) => changed("min", n)}
    //     step={0.1}
    //     disabled={auto}
    //   />

    //   <InputGroup.Text className="axis-label">
    //     Max
    //   </InputGroup.Text>

    //   <Form.Control
    //     className="axis-input"
    //     type="number"
    //     value={max}
    //     onChange={(n, s) => changed("max", n)}
    //     step={0.1}
    //     disabled={auto}
    //   />

    //   <Button name="default" size="sm" onClick={handleResetButton} className="axis-reset">
    //     <FontAwesomeIcon icon={faRotateLeft} />
    //   </Button>
    // </InputGroup>

    // <div className="axis-range">
    //   <tr className="range-label-row">
    //     <td>
    //       <Form.Label className="range-label">{props.title}</Form.Label>
    //     </td>
    //     <td className="range-auto-checkbox">
    //       <Form.Check
    //         type="checkbox"
    //         id={props.id + "_auto"}
    //         checked={auto}
    //         onChange={autoChanged}
    //         label={"Auto"}
    //       />
    //     </td>
    //     <td>
    //       <input
    //         className="range-input"
    //         type="number"
    //         value={min}
    //         onChange={(n, s) => changed("min", n)}
    //         step={0.1}
    //         disabled={auto}
    //       />
    //     </td>
    //     <td>
    //       <input
    //         className="range-input"
    //         type="number"
    //         value={max}
    //         onChange={(n, s) => changed("max", n)}
    //         step={0.1}
    //         disabled={auto}
    //       />
    //     </td>
    //     <td className="default-button-container">
    //       <Button name="default" size="sm" onClick={handleResetButton}>
    //         <FontAwesomeIcon icon={faRotateLeft} />
    //       </Button>
    //     </td>
    //   </tr>
    // </div>
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
