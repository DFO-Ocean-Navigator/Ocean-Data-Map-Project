import React, { useState, useRef } from "react";
import Papa from "papaparse";

import { Button, Form } from "react-bootstrap";
import Table from "react-bootstrap/Table";
import { X } from "react-bootstrap-icons";

import { withTranslation } from "react-i18next";

function FeatureCard(props) {
  const [timer, setTimer] = useState(null);

  const updateCoordinate = (id, row, col, value) => {
    if (!isNaN(value)) {
      props.action("updateFeatureCoordinate", id, [row, col], value);
    }
  };

  const updateType = (e) => {
    props.action("updateFeatureType", props.feature.id, e.target.value);
  };

  const removeFeature = () => {
    props.action("removeFeature", props.feature.id);
  };

  const setSelected = () => {
    props.action("selectFeature", props.feature.id, !props.feature.selected);
  };

  const updateLat = (e) => {
    clearTimeout(timer);
    setTimer(
      setTimeout(
        updateCoordinate(
          props.feature.id,
          parseInt(e.target.id),
          0,
          parseFloat(e.target.value)
        ),
        1000
      )
    );
  };

  const updateLon = (e) => {
    clearTimeout(timer);
    setTimer(
      setTimeout(
        updateCoordinate(
          props.feature.id,
          parseInt(e.target.id),
          1,
          parseFloat(e.target.value)
        ),
        1000
      )
    );
  };

  const addRow = () => {
    updateCoordinate(props.feature.id, props.feature.coords.length, 0, 0);
  };

  const tableEntries = props.feature.coords.map((coord, index) => {
    return (
      <tr key={`row_${index}`}>
        <td>
          <input
            type="number"
            id={index}
            key={`row_${index}_lat`}
            className="cord-input"
            value={coord[0]}
            onChange={updateLat}
          />
        </td>
        <td>
          <input
            type="number"
            id={index}
            key={`row_${index}_lon`}
            className="cord-input"
            value={coord[1]}
            onChange={updateLon}
          />
        </td>
        <td>
          <button
            className="remove-button"
            onClick={() =>
              props.action("removeFeatureCoord", props.feature.id, index)
            }
          >
            <X />
          </button>
        </td>
      </tr>
    );
  });

  return (
    <div className="feature-card">
      <div className="card-header">
        <Form.Check onChange={setSelected} checked={props.feature.selected} />
        <select
          value={props.feature.type}
          onChange={updateType}
        >
          <option value="point">Point</option>
          <option value="line">Line</option>
          <option value="area">Area</option>
        </select>
        <div className="header-buttons">
          <Button disabled={props.feature.type === "point"} onClick={addRow}>
            +
          </Button>
          <Button onClick={removeFeature}>
            <X />
          </Button>
        </div>
      </div>
      <Table bordered size="sm">
        <thead>
          <tr>
            <th>{"Latitude"}</th>
            <th>{"Longitude"}</th>
            <th style={{ width: "5%" }}></th>
          </tr>
        </thead>
        <tbody>{tableEntries}</tbody>
      </Table>
    </div>
  );
}

export default withTranslation()(FeatureCard);
