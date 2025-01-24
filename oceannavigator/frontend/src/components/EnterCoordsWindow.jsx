import React, { useState, useRef, useEffect } from "react";
import Papa from "papaparse";

import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";

import { withTranslation } from "react-i18next";

import FeatureCard from "./FeatureCard.jsx";

function EnterCoordsWindow(props) {
  const [selectedFeatureIds, setSelectedFeatureIds] = useState([]);
  const fileForm = useRef(null);
  const fileInput = useRef(null);

  useEffect(() => {
    let selected = props.mapFeatures.reduce(
      (result, feat) => (feat.selected ? result.concat(feat.id) : result),
      []
    );
    setSelectedFeatureIds(selected);
  }, [props.mapFeatures]);

  const addFeature = () => {
    let newFeature = {
      id: "id" + Math.random().toString(16).slice(2),
      type: "point",
      selected: false,
      coords: [[0.0, 0.0]],
    };
    props.action("saveFeature", [newFeature]);
  };

  const combineFeatures = () => {
    let selectedIds = selectedFeatureIds.map((feature) => {
      return feature.id;
    });
    props.action("combinePointFeatures", selectedIds);
  };

  const selectFeatures = (featureId, selected) => {
    let prevSelected = [...selectedFeatureIds];
    let selectedType = props.mapFeatures.filter((feat) => {
      return feat.id === featureId;
    })[0].type;
    if (selectedType !== "point") {
      prevSelected = [];
    }
    if (selected) {
      prevSelected.push(featureId);
      props.action("selectFeatures", prevSelected);
    } else {
      prevSelected = prevSelected.filter((id) => {
        return id != featureId;
      });
      props.action("deselectFeatures", [featureId]);
    }
    setSelectedFeatureIds(selected);
  };

  const uploadCSV = () => {
    fileInput.current.click();
  };

  const updateVectorType = (e) => {
    props.action("vectorType", e.target.value);
  };

  const tableEntries = props.mapFeatures.map((feature) => {
    return (
      <FeatureCard
        key={feature.id}
        feature={feature}
        action={props.action}
        setSelected={selectFeatures}
      />
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

          let newFeatures = [];
          if (props.vectorType === "point") {
            newFeatures = points.map((point) => {
              return {
                id: "id" + Math.random().toString(16).slice(2),
                type: props.vectorType,
                selected: false,
                coords: [point],
              };
            });
          } else {
            newFeatures.push({
              id: "id" + Math.random().toString(16).slice(2),
              type: props.vectorType,
              selected: false,
              coords: points,
            });
          }

          props.action("saveFeature", newFeatures);
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
          <Button onClick={addFeature}>Add New Feature</Button>
          <Button
            disabled={selectedFeatureIds.length < 1}
            onClick={() => props.action("plot")}
          >
            Plot Selected Features
          </Button>
          <Button
            disabled={selectedFeatureIds.length < 2}
            onClick={combineFeatures}
          >
            Combine Selected Point Features
          </Button>
          <div className="upload-div">
            <Button className="upload-button" onClick={uploadCSV}>
              Upload CSV
            </Button>
            <select value={props.vectorType} onChange={updateVectorType}>
              <option value="point">Point</option>
              <option value="line">Line</option>
              <option value="area">Area</option>
            </select>
          </div>
        </Col>
      </Row>
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
