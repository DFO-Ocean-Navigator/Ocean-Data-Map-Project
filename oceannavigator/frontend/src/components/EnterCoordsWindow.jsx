import React, { useState, useRef } from "react";
import Papa from "papaparse";

import { Button, ToggleButton } from "react-bootstrap";
import Table from "react-bootstrap/Table";
import { X } from "react-bootstrap-icons";

import { withTranslation } from "react-i18next";

function EnterCoordsWindow(props) {
  const [enteredLat, setEnteredLat] = useState("");
  const [enteredLon, setEnteredLon] = useState("");
  const [timer, setTimer] = useState(null);
  const fileForm = useRef(null);
  const fileInput = useRef(null);

  const radios = [
    { name: __("Point"), value: "point" },
    { name: __("Line"), value: "line" },
    { name: __("Area"), value: "area" },
  ];

  const handleRadio = (e) => {
    let type = e.currentTarget.value;
    props.action("vectorType", type);
  };

  const submitHandler = (e) => {
    e.preventDefault();
    if (enteredLat & enteredLon) {
      props.action("addPoints", [[enteredLat, enteredLon]]);
      setEnteredLat("");
      setEnteredLon("");
    }
  };

  const latChangeHandler = (e) => {
    setEnteredLat(parseFloat(e.target.value));
  };

  const lonChangeHandler = (e) => {
    setEnteredLon(parseFloat(e.target.value));
  };

  const updateLat = (e) => {
    clearTimeout(timer);
    setTimer(
      setTimeout(
        updateCoordinate(parseInt(e.target.id), 0, parseFloat(e.target.value)),
        1000
      )
    );
  };

  const updateLon = (e) => {
    clearTimeout(timer);
    setTimer(
      setTimeout(
        updateCoordinate(parseInt(e.target.id), 1, parseFloat(e.target.value)),
        1000
      )
    );
  };

  const updateCoordinate = (row, col, value) => {
    if (!isNaN(value)) {
      props.action("updatePoint", row, col, value)
    }
  }

  const handleClear = () => {
    props.action("clearPoints");
  };

  const handleUpload = () => {
    fileInput.current.click();
  };

  const handlePlot = () => {
    props.action("selectPoints");
    props.updateUI({ modalType: props.vectorType, showModal: true });
  };

  const tableEntries = props.vectorCoordinates.map((coord, index) => {
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
            onClick={() => props.action("removePoint", index)}
          >
            <X />
          </button>
        </td>
      </tr>
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

  const plotDisabled =
    (props.vectorType === "point" && props.vectorCoordinates.length < 1) ||
    (props.vectorType === "line" && props.vectorCoordinates.length < 2) ||
    (props.vectorType === "area" && props.vectorCoordinates.length < 3);

  return (
    <div className="EnterCoordsWindow">
      <div className="table-container">
        <Table bordered size="sm">
          <thead>
            <tr>
              <th>{__("Latitude")}</th>
              <th>{__("Longitude")}</th>
              <th style={{ width: "5%" }}></th>
            </tr>
          </thead>
          <tbody>{tableEntries}</tbody>
        </Table>

        <form onSubmit={submitHandler}>
          <div className="table-button-container">
            <label>{__("Latitude")}:</label>
            <input
              type="number"
              id="Latitude"
              min="-90"
              max="90"
              step="0.0001"
              value={enteredLat}
              onChange={latChangeHandler}
            />
            <label>{__("Longitude")}:</label>
            <input
              type="number"
              id="Longitude"
              min="-180"
              max="180"
              step="0.0001"
              value={enteredLon}
              onChange={lonChangeHandler}
            />
            <button type="submit" id="add">{__("Add")}</button>
            <button type="button" onClick={handleClear}>
              {__("Clear")}
            </button>
          </div>
        </form>
      </div>

      <div className="plot-button-container">
        <div className="toggle-button-container">
          {radios.map((radio, idx) => (
            <ToggleButton
              className="plot-toggle"
              key={idx}
              id={`radio-${idx}`}
              type="radio"
              name="radio"
              value={radio.value}
              checked={props.vectorType === radio.value}
              onChange={handleRadio}
            >
              {radio.name}
            </ToggleButton>
          ))}
        </div>
        <Button className="plot-button" id = "Upload-CSV" onClick={handleUpload}>
          {__("Upload CSV")}
        </Button>
        <Button
          className="plot-button"
          id="plot-button" // Add the id attribute here
          onClick={handlePlot}
          disabled={plotDisabled}
        >
          {__("Plot")}
        </Button>
      </div>
      <form ref={fileForm}>
        <input
          type="file"
          style={{ display: "none" }}
          onChange={parseCSV}
          ref={fileInput}
          accept=".csv,.CSV"
        />
      </form>
    </div>
  );
}

export default withTranslation()(EnterCoordsWindow);
