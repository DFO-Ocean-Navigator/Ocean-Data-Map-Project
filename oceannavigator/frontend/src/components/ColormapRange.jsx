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
    setMin(parseFloat(props.state[0]).toFixed(4));
    setMax(parseFloat(props.state[1]).toFixed(4));
  }, [props]);

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

  const handleDefaultButton = () => {
    setMin(props.default_scale[0]);
    setMax(props.default_scale[1]);
  };

  const getAutoScale = () => {
    const mapViewInfo = props.mapRef.current?.getViewInfo();

    const autourl =
      "/api/v2.0/range/" +
      props.dataset.id +
      "/" +
      props.dataset.variable.id +
      "/" +
      props.mapSettings.interpType +
      "/" +
      props.mapSettings.interpRadius +
      "/" +
      props.mapSettings.interpNeighbours +
      "/" +
      props.mapSettings.projection +
      "/" +
      mapViewInfo.extent.join(",") +
      "/" +
      props.dataset.depth +
      "/" +
      props.dataset.time.id;

    axios
      .get(autourl)
      .then(function (data) {
        setMin(parseFloat(data.data.min).toFixed(4));
        setMax(parseFloat(data.data.max).toFixed(4));
      })
      .catch(function (r, status, err) {
        console.error(autourl, status, err.toString());
      });
  };

  let autobuttons = null;
  if (props.showAuto) {
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
    <div
      className="ColormapRange"
      style={{ margin: props.auto ? "0px 0px" : "0px 5px" }}
    >
      <h1>{props.title}</h1>
      <table style={{ display: useAuto ? "none" : "table" }}>
        <tbody>
          <tr>
            <td>
              <label key={props.id + "_min"}>{"Min:"}</label>
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
              <label key={props.id + "_max"}>{"Max:"}</label>
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
ColormapRange.propTypes = {
  id: PropTypes.string,
  auto: PropTypes.bool,
  title: PropTypes.string,
  onUpdate: PropTypes.func,
  state: PropTypes.oneOfType([PropTypes.string, PropTypes.array]).isRequired,
  showAuto: PropTypes.bool,
  dataset: PropTypes.object,
  mapSettings: PropTypes.object,
  mapRef: PropTypes.object
};

export default withTranslation()(ColormapRange);
