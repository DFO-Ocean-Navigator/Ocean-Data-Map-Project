import React, { useState, useEffect } from "react";
import { Button, ButtonToolbar, Form } from "react-bootstrap";
import PropTypes from "prop-types";

import { withTranslation } from "react-i18next";

const axios = require("axios");

function ColormapRange(props) {
  const [useAuto, setUseAuto] = useState(props.auto);
  const [min, setMin] = useState(parseFloat(props.state[0]).toFixed(4));
  const [max, setMax] = useState(parseFloat(props.state[1]).toFixed(4));

  useEffect(() => {
    let newMin = parseFloat(min).toFixed(4);
    let newMax = parseFloat(max).toFixed(4);
    let prevMin = parseFloat(props.state[0]).toFixed(4);
    let prevMax = parseFloat(props.state[1]).toFixed(4);

    if (
      !isNaN(newMin) &&
      !isNaN(newMax) &&
      (newMin !== prevMin || newMax !== prevMax)
    ) {
      const timer = setTimeout(() => {
        props.onUpdate(props.id, [newMin, newMax]);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [min, max]);

  const changed = (key, e) => {
    switch (key) {
      case "min":
        setMin(e.target.value);
        break;
      case "max":
        setMax(e.target.value);
        break;
    }
  };

  const autoChanged = (e) => {
    setUseAuto(e.target.checked);

    var scale = props.state;
    if (typeof props.state === "string" || props.state instanceof String) {
      scale = props.state.split(",");
    }

    if (e.target.checked) {
      props.onUpdate(props.id, scale[0] + "," + scale[1] + ",auto");
    } else {
      props.onUpdate(props.id, scale[0] + "," + scale[1]);
    }
  };

  const handleDefaultButton = () => {
    setMin(props.default_scale[0]);
    setMax(props.default_scale[1]);
  };

  const getAutoScale = () => {
    axios
      .get(props.autourl)
      .then(function (data) {
        setMin(parseFloat(data.data.min).toFixed(4));
        setMax(parseFloat(data.data.max).toFixed(4));
      })
      .catch(function (r, status, err) {
        console.error(props.autourl, status, err.toString());
      });
  };

  const autoCheck = (
    <Form.Check
      type="checkbox"
      id={props.id + "_auto"}
      checked={useAuto}
      onChange={autoChanged}
      label={"Auto Range"}
    />
  );

  let autobuttons = null;
  if (props.autourl) {
    autobuttons = (
      <ButtonToolbar style={{ display: "inline-block", float: "right" }}>
        <Button name="default" onClick={handleDefaultButton}>
          {"Default"}
        </Button>
        <Button name="auto" variant="primary" onClick={getAutoScale}>
          {"Auto"}
        </Button>
      </ButtonToolbar>
    );
  }

  return (
    <div className="ColormapRange">
      <h1>{props.title}</h1>
      {props.auto ? autoCheck : null}
      <table style={{ display: useAuto ? "none" : "table" }}>
        <tbody>
          <tr>
            <td>
              <label htmlFor={props.id + "_min"}>{"Min:"}</label>
            </td>
            <td>
              <input
                type="number"
                className="range-input"
                value={min}
                onChange={(e) => changed("min", e)}
                step={0.1}
              />
            </td>
          </tr>
          <tr>
            <td>
              <label htmlFor={props.id + "_max"}>{"Max:"}</label>
            </td>
            <td>
              <input
                type="number"
                className="range-input"
                value={max}
                onChange={(e) => changed("max", e)}
                step={0.1}
              />
            </td>
          </tr>
        </tbody>
      </table>
      {autobuttons}
    </div>
  );
}

//***********************************************************************
Range.propTypes = {
  id: PropTypes.string,
  auto: PropTypes.bool,
  title: PropTypes.string,
  onUpdate: PropTypes.func,
  state: PropTypes.oneOfType([PropTypes.string, PropTypes.array]).isRequired,
  autourl: PropTypes.string,
};

export default withTranslation()(ColormapRange);
