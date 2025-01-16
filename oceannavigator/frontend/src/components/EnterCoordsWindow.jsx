import React, { useState, useRef } from "react";
import Papa from "papaparse";

import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { Button, Form } from "react-bootstrap";
import Table from "react-bootstrap/Table";
import { X } from "react-bootstrap-icons";

import { withTranslation } from "react-i18next";

import FeatureCard from "./FeatureCard.jsx";

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

  return (
    <div className="EnterCoordsWindow">
      <Row>
        <Col className="feature-col">{tableEntries}</Col>
        <Col className="button-col">
          <Button>Add New Feature</Button>
          <Button>Plot Selected Features</Button>
          <Button>Combine Point Features</Button>
          <div className="upload-div">
            <Button className="upload-button">Upload CSV</Button>
            <select
            // value={props.feature.type}
            // onChange={updateType}
            >
              <option value="point">Point</option>
              <option value="line">Line</option>
              <option value="area">Area</option>
            </select>
          </div>
        </Col>
      </Row>
    </div>
  );
}

export default withTranslation()(EnterCoordsWindow);
