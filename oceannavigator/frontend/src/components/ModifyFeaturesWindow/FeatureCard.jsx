import React, { useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Table from "react-bootstrap/Table";
import { X } from "react-bootstrap-icons";

import { withTranslation } from "react-i18next";

function FeatureCard(props) {
  const [timer, setTimer] = useState(null);
  const [coordinates, setCoordinates] = useState(props.feature.coords);
  const [featureType, setFeatureType] = useState(props.feature.type);
  const [featureName, setFeatureName] = useState(props.feature.name);
  const [coordinateAlerts, setCoordinateAlerts] = useState([]);

  const updateCoordinate = (row, col, value) => {
    let newValue = value
      .replace(/[^0-9.-]/g, "")
      .replace(/^(-)|-+/g, "$1")
      .replace(/^([^.]*\.)|\.+/g, "$1");

    let newCoordinates = [...coordinates];
    if (newCoordinates.length < row) {
      newCoordinates.push(["", ""]);
    }
    newCoordinates[row][col] = newValue;
    setCoordinates(newCoordinates);

    updateFeatureGeometry(newCoordinates, featureType);
  };

  const updateType = (e) => {
    let newType = e.target.value;

    setFeatureType(newType);
    updateFeatureGeometry(coordinates, newType);
  };

  const removeCoord = (index) => {
    let nextCoords = [...coordinates];
    nextCoords.splice(index, 1);
    setCoordinates(nextCoords);
    updateFeatureGeometry(nextCoords, featureType);
  };

  const removeFeature = () => {
    props.removeFeature([props.feature.id]);
  };

  const updateLat = (e) => {
    clearTimeout(timer);
    setTimer(
      setTimeout(
        updateCoordinate(parseInt(e.target.id), 1, e.target.value),
        1000
      )
    );
  };

  const updateLon = (e) => {
    clearTimeout(timer);
    setTimer(
      setTimeout(
        updateCoordinate(parseInt(e.target.id), 0, e.target.value),
        1000
      )
    );
  };

  const updateFeatureName = (e) => {
    setFeatureName(e.target.value);
    props.mapRef.current.updateFeatureName(props.feature.id, e.target.value);
  };

  const addRow = () => {
    let nextCoords = [...coordinates, ["", ""]];
    setCoordinates(nextCoords);
    updateFeatureGeometry(nextCoords, featureType);
  };

  const updateFeatureGeometry = (newCoordinates, newType) => {
    let newCoordAlerts = [];
    for (let coord of newCoordinates) {
      if (
        isNaN(Number(coord[0])) |
        isNaN(Number(coord[1])) |
        (coord[0].length === 0) |
        (coord[1].length === 0)
      ) {
        newCoordAlerts.push(
          <Alert variant="warning" key="invCoordAlert">
            Invalid coordinate(s).
          </Alert>
        );
      }
      if ((coord[1] > 90) | (coord[1] < -90)) {
        newCoordAlerts.push(
          <Alert variant="warning" key="invLatAlert">
            Latitude outside of expected range (-90°, 90°).
          </Alert>
        );
      } else if ((coord[0] > 360) | (coord[0] < -360)) {
        newCoordAlerts.push(
          <Alert variant="warning" key="invLonAlert">
            Longitude outside of expected range (-360°, 360°).
          </Alert>
        );
      }
    }
    if (
      (newType === "Point" && newCoordinates.length < 1) |
      (newType === "LineString" && newCoordinates.length < 2) |
      (newType === "Polygon" && newCoordinates.length < 3)
    ) {
      newCoordAlerts.push(
        <Alert variant="warning" key="insufPtsAlert">
          Insufficient points for feature type.
        </Alert>
      );
    }
    if (newType === "Point" && newCoordinates.length > 1) {
      newCoordAlerts.push(
        <Alert variant="warning" key="tooManyPtsAlert">
          Too many points for feature type.
        </Alert>
      );
    }

    setCoordinateAlerts(newCoordAlerts);

    if (newCoordAlerts.length === 0) {
      props.mapRef.current.updateFeatureGeometry(
        props.feature.id,
        newType,
        newCoordinates
      );
    }
  };

  const tableEntries = coordinates.map((coord, index) => {
    return (
      <tr key={`row_${index}`}>
        <td>
          <Form.Control
            type="text"
            id={index.toString()}
            key={`row_${index}_lon`}
            className="cord-input"
            value={coord[0]}
            onChange={(e) => {
              updateLon(e);
            }}
          />
        </td>
        <td>
          <Form.Control
            type="text"
            id={index.toString()}
            key={`row_${index}_lat`}
            className="cord-input"
            value={coord[1]}
            onChange={(e) => {
              updateLat(e);
            }}
          />
        </td>
        <td>
          <button
            className="remove-button"
            onClick={() => {
              removeCoord(index);
            }}
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
        <Form.Check
          onChange={(e) => {
            props.setSelected(props.feature.id, featureType, e.target.checked);
          }}
          checked={props.feature.selected}
        />
        <Form.Control
          className="name-input"
          type="text"
          value={featureName?? ""}
          onChange={updateFeatureName}
        />
        <div className="header-buttons">
          <select value={featureType} onChange={updateType}>
            <option value="Point">Point</option>
            <option value="LineString">Line</option>
            <option value="Polygon">Area</option>
          </select>
          <Button
            disabled={featureType === "Point" && coordinates.length > 0}
            onClick={addRow}
          >
            +
          </Button>
          <Button onClick={removeFeature}>
            <X />
          </Button>
        </div>
      </div>
      <div className="card-body">
        <Table bordered size="sm">
          <thead>
            <tr>
              <th>{"Longitude"}</th>
              <th>{"Latitude"}</th>
              <th style={{ width: "5%" }}></th>
            </tr>
          </thead>
          <tbody>{tableEntries}</tbody>
        </Table>
        {new Set(coordinateAlerts)}
      </div>
    </div>
  );
}

export default withTranslation()(FeatureCard);
