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
    <div>
      <div>
        <select value={props.feature.type} onChange={updateType}>
          <option value="point">Point</option>
          <option value="line">Line</option>
          <option value="area">Area</option>
        </select>
        <Button disabled={props.feature.type === "point"} onClick={addRow}>
          +
        </Button>
        <Form.Check onChange={setSelected} checked={props.feature.selected} />
        <Button onClick={removeFeature}>
          <X />
        </Button>
      </div>
      <div>
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
    </div>
  );
}

function EnterCoordsWindow(props) {
  const fileForm = useRef(null);
  const fileInput = useRef(null);

  const tableEntries = props.mapFeatures.map((feature) => {
    return (
      <FeatureCard key={feature.id} feature={feature} action={props.action} />
    );
  });

  const parseCSV = (e) => {
    if (e.target.files.length == 1) {
      const file = e.target.files[0];

      Papa.parse(file, {
        dynamicTyping: true,
        skipEmptyLines: true,
        header: true,
        complete: function (results) {
          // Convert everything to lowercase
          const fields_lowered = results.meta.fields.map(function (f) {
            return f.toLowerCase().trim();
          });

          function findKey(names) {
            for (let i = 0; i < names.length; i++) {
              const index = fields_lowered.indexOf(names[i]);
              if (index > -1) {
                return results.meta.fields[index];
              }
            }
            return -1;
          }

          const lat = findKey(["latitude", "lat"]);
          const lon = findKey(["longitude", "lon"]);
          if (lat == -1 || lon == -1) {
            alert(
              __(
                "Error: Could not find latitude or longitude column in file: "
              ) + file.name
            );
            return;
          }

          const points = results.data.map(function (point) {
            point[lat] = point[lat] > 90 ? 90 : point[lat];
            point[lat] = point[lat] < -90 ? -90 : point[lat];
            point[lon] = point[lon] > 180 ? point[lon] - 360 : point[lon];
            point[lon] = point[lon] < -180 ? 360 + point[lon] : point[lon];
            return [point[lat], point[lon]];
          });

          props.action("addPoints", points);
        },
      });

      fileForm.current.reset();
    }
  };

  return <div className="EnterCoordsWindow">{tableEntries}</div>;
}

export default withTranslation()(EnterCoordsWindow);
