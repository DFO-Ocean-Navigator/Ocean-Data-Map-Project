import React, { useState, useRef, useEffect } from "react";
import Papa from "papaparse";

import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";

import { withTranslation } from "react-i18next";

import FeatureCard from "./FeatureCard.jsx";

function EnterCoordsWindow(props) {
  const [mapFeatures, setMapFeatures] = useState([]);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState([]);
  const [uploadType, setUploadType] = useState("Point");
  const fileForm = useRef(null);
  const fileInput = useRef(null);

  useEffect(() => {
    let features = props.mapRef.current.getFeatures();
    //TODO fix this and other filter/maps
    let selectedIds = features
      .filter((feature) => {
        return feature.selected;
      })
      .map((feature) => {
        return feature.id;
      });
    setMapFeatures(features);
    setSelectedFeatureIds(selectedIds);
  }, []);

  const addFeature = () => {
    let newFeature = {
      id: "id" + Math.random().toString(16).slice(2),
      type: "Point",
      selected: false,
      coords: [["", ""]],
    };
    setMapFeatures((prevFeatures) => [...prevFeatures, newFeature]);
    props.mapRef.current.addNewFeature(newFeature.id);
  };

  const splitFeature = () => {
    props.mapRef.current.splitPolyFeatures(selectedFeatureIds[0]);
    setMapFeatures(props.mapRef.current.getFeatures());
  };

  const combineFeatures = () => {
    props.mapRef.current.combinePointFeatures(selectedFeatureIds);
    setMapFeatures(props.mapRef.current.getFeatures());
  };

  const removeFeatures = (ids) => {
    props.mapRef.current.removeFeatures(ids);
    setMapFeatures((prevFeatures) =>
      prevFeatures.filter((feature) => {
        return !ids.includes(feature.id);
      })
    );
  };

  const selectFeatures = (featureId, featureType, selected) => {
    let nextSelected = [...selectedFeatureIds];
    if (featureType !== "Point") {
      nextSelected = [];
    } else {
      nextSelected = mapFeatures
        .filter((feature) => {
          return nextSelected.includes(feature.id) && feature.type === "Point";
        })
        .map((feature) => {
          return feature.id;
        });
    }
    if (selected) {
      nextSelected.push(featureId);
    } else {
      nextSelected = nextSelected.filter((id) => {
        return id != featureId;
      });
    }
    props.mapRef.current.selectFeatures(nextSelected);
    setSelectedFeatureIds(nextSelected);
    setMapFeatures(props.mapRef.current.getFeatures());
  };

  const uploadCSV = () => {
    fileInput.current.click();
  };

  const tableEntries = mapFeatures.map((feature) => {
    return (
      <FeatureCard
        key={feature.id}
        feature={feature}
        setSelected={selectFeatures}
        mapRef={props.mapRef}
        removeFeature={removeFeatures}
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
            return [point[lon], point[lat]];
          });

          if (uploadType === "Point") {
            for (let point of points) {
              let id = "id" + Math.random().toString(16).slice(2);
              props.mapRef.current.addNewFeature(id);
              props.mapRef.current.updateFeatureGeometry(id, uploadType, [
                point,
              ]);
            }
          } else {
            let id = "id" + Math.random().toString(16).slice(2);
            props.mapRef.current.addNewFeature(id);
            props.mapRef.current.updateFeatureGeometry(id, uploadType, points);
          }
          setMapFeatures(props.mapRef.current.getFeatures());
        },
      });
      fileForm.current.reset();
    }
  };

  let selectedFeatureType = mapFeatures.reduce(
    (result, feat) => {
      if (feat.id === selectedFeatureIds[0]) {
        result = feat.type;
      }
      return result;
    },
    ""
  );

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
            disabled={
              selectedFeatureType !== "LineString" &&
              selectedFeatureType !== "Polygon"
            }
            onClick={splitFeature}
          >
            Split Line/Area Feature Into Points
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
            <select
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value)}
            >
              <option value="Point">Point</option>
              <option value="LineString">Line</option>
              <option value="Polygon">Area</option>
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
