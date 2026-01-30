import React, { useState, useEffect } from "react";
import ComboBox from "./lib/ComboBox.jsx";
import PropTypes from "prop-types";
import DatePicker from "react-datepicker";
import Slider from "rc-slider";
import { Card, Button, Form } from "react-bootstrap";
import Autocomplete from "./lib/Autocomplete.jsx";

import "rc-slider/assets/index.css";
import "react-datepicker/dist/react-datepicker.css";

import { withTranslation } from "react-i18next";
import axios from "axios";

const STD_DEPTHS = {
  0: "0m",
  1: "10m",
  2: "20m",
  3: "30m",
  4: "40m",
  5: "50m",
  6: "75m",
  7: "100m",
  8: "125m",
  9: "150m",
  10: "200m",
  11: "250m",
  12: "500m",
  13: "1,000m",
  14: "1,500m",
  15: "2,000m",
  16: "3,000m",
  17: "4,000m",
  18: "5,000m",
  19: "7,500m",
  20: "10,000m",
};

const PLATFORMS = [
  { id: "argo", value: "Argo Float" },
  { id: "drifter", value: "Drifting Buoy" },
  { id: "animal", value: "Instrumented Animal" },
  { id: "mission", value: "Oceanographic Mission" },
  { id: "glider", value: "Glider" },
];

function ObservationSelector(props) {
  const [metaKeys, setMetaKeys] = useState([]);
  const [metaValues, setMetaValues] = useState([]);
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)),
  );
  const [endDate, setEndDate] = useState(new Date());
  const [metaKey, setMetaKey] = useState("");
  const [metaValue, setMetaValue] = useState("");
  const [platformType, setPlatformType] = useState(PLATFORMS.map((x) => x.id));
  const [platformActive, setPlatformActive] = useState(false);
  const [depthActive, setDepthActive] = useState(false);
  const [dataTypes, setDataTypes] = useState([]);
  const [dataType, setDataType] = useState("sea_water_temperature");
  const [depthRange, setDepthRange] = useState([0, 5]);
  const [points, setPoints] = useState(true);
  const [quantum, setQuantum] = useState("day");
  const [radius, setRadius] = useState(50);

  useEffect(() => {
    fetchDataTypes();
    fetchMetaKeys();
  }, []);

  useEffect(() => {
    fetchMetaValues();
  }, [metaKey]);

  const fetchDataTypes = () => {
    const url = `/api/v2.0/observation/datatypes.json`;
    axios
      .get(url)
      .then(function (response) {
        setDataTypes(response.data);
      })
      .catch(function (error) {
        console.error(url, error.message, error.response);
      });
  };

  const fetchMetaKeys = () => {
    const url = `/api/v2.0/observation/meta_keys/${platformType}.json`;
    axios
      .get(url)
      .then(function (response) {
        let data = response.data;
        data.unshift("Any");
        if (response.data.length > 0) {
          setMetaKey(data[0]);
        } else {
          setMetaKey("");
        }
        setMetaKeys(data);
      })
      .catch(function (error) {
        console.error(url, error.message, error.response);
      });
  };

  const fetchMetaValues = () => {
    if (metaKey) {
      const url = `/api/v2.0/observation/meta_values/${platformType.join(
        ",",
      )}/${metaKey}.json`;
      axios
        .get(url)
        .then(function (response) {
          setMetaValues(response.data);
          setMetaValue("");
        })
        .catch(function (error) {
          console.error(url, error.message, error.response);
        });
    }
  };

  const keys = metaKeys.map(function (o) {
    return { id: o, value: o };
  });

  const getSelection = () => {
    const newSelection = {
      start_date: startDate.toISOString().slice(0, 10),
      end_date: new Date(new Date(endDate).setDate(endDate.getDate() + 1))
        .toISOString()
        .slice(0, 10),
      type: points ? "points" : "track",
    };

    if (props.area.length > 0) {
      newSelection["area"] = JSON.stringify(props.area);
    }
    if (props.area.length == 1) {
      newSelection["radius"] = radius;
    }

    if (points) {
      newSelection["datatype"] = dataType;
    } else {
      newSelection["quantum"] = quantum;
    }

    if (platformActive) {
      Object.assign(newSelection, {
        platform_type: platformType,
        meta_key: metaKey,
        meta_value: metaValue,
      });
    }

    if (depthActive) {
      Object.assign(newSelection, {
        mindepth: parseFloat(STD_DEPTHS[depthRange[0]]),
        maxdepth: parseFloat(STD_DEPTHS[depthRange[1]]),
      });
    }

    return newSelection;
  };

  const observationSelect = () => {
    let selection = getSelection();
    let type = selection["type"];
    delete selection["type"];
    let result = Object.keys(selection)
      .map(function (key) {
        return `${key}=${selection[key]}`;
      })
      .join("&");
    if (type == "track") {
      props.action("setObsQuery", {
        startDate,
        endDate,
        quantum,
      });
      props.action("loadFeatures", "observation_tracks", result);
    } else {
      props.action("loadFeatures", "observation_points", result);
    }
  };

  return (
    <div className="observation-selector">
      <Card className="obs-card">
        <Card.Header className="obs-card-header">
          <Card.Title>Observation Type</Card.Title>
        </Card.Header>
        <Card.Body className="obs-card-body">
          <Form.Group>
            <Form.Check
              type="radio"
              inline
              name="type"
              id="point-check"
              label="Points"
              defaultChecked={true}
              onChange={(e) => setPoints(e.target.value == "on")}
            />
            <Form.Check
              type="radio"
              inline
              name="type"
              id="line-check"
              label="Tracks"
              onChange={(e) => setPoints(e.target.value != "on")}
            />
          </Form.Group>
        </Card.Body>
      </Card>

      <Card className="obs-card">
        <Card.Header className="obs-card-header">
          <Card.Title>Date &amp; Variable Filters</Card.Title>
        </Card.Header>
        <Card.Body className="obs-card-body">
          <div>
            <h1 className="obs-input-label">Start Date</h1>
            <DatePicker
              id="startDate"
              dateFormat="yyyy-MM-dd"
              selected={startDate}
              popperPlacement="top"
              onChange={(newDate) => setStartDate(newDate)}
              maxDate={endDate}
            />
          </div>
          <div>
            <h1 className="obs-input-label">End Date</h1>
            <DatePicker
              id="endDate"
              dateFormat="yyyy-MM-dd"
              selected={endDate}
              popperPlacement="top"
              onChange={(newDate) => setEndDate(newDate)}
              maxDate={new Date()}
              minDate={startDate}
            />
          </div>

          {points && (
            <ComboBox
              key="dataType"
              id="dataType"
              selected={dataType}
              label="Data Type"
              onChange={(key, value) => setDataType(value)}
              options={dataTypes}
            />
          )}

          {!points && (
            <ComboBox
              key="quantum"
              id="quantum"
              selected={quantum}
              label="Track Simplification"
              onChange={(key, value) => setQuantum(value)}
              options={[
                { id: "minute", value: "Minute" },
                { id: "hour", value: "Hour" },
                { id: "day", value: "Day" },
                { id: "week", value: "Week" },
                { id: "month", value: "Month" },
                { id: "year", value: "Year" },
              ]}
            />
          )}
        </Card.Body>
      </Card>

      {props.area.length == 1 && (
        <Card className="obs-card">
          <Card.Header className="obs-card-header">
            <Card.Title>Search Radius</Card.Title>
          </Card.Header>
          <Card.Body className="obs-card-body slider-container">
            <h1 className="obs-input-label">
              Search Radius (km) around ({props.area[0][0].toFixed(4)}
              ,&nbsp;
              {props.area[0][1].toFixed(4)})
            </h1>
              <Slider
                range
                allowCross={false}
                min={0}
                max={250}
                marks={{
                  0: "0km",
                  50: "50km",
                  100: "100km",
                  150: "150km",
                  200: "200km",
                  250: "250km",
                }}
                defaultValue={radius}
                onChange={(x) => setRadius(x)}
              />
          </Card.Body>
        </Card>
      )}

      <Card className="obs-card">
        <Card.Header className="obs-card-header">
          <Card.Title>Platform Filters</Card.Title>
          <Form.Check
            type="switch"
            id="platform-toggle"
            onClick={() => {
              setPlatformActive(!platformActive);
            }}
          />
        </Card.Header>
        <Card.Body className="obs-card-body">
          <ComboBox
            key="platformType"
            id="platformType"
            selected={platformType}
            label={__("Platform Type")}
            onChange={(key, value) => setPlatformType(value)}
            options={PLATFORMS}
            multiple
          />
          <ComboBox
            key="metaKey"
            id="metaKey"
            selected={metaKey}
            label="Metadata Key"
            onChange={(key, value) => setMetaKey(value)}
            options={keys}
          />
          <div>
            <h1 className="obs-input-label">Metadata Value</h1>
            <Autocomplete
              className="obs-autocomplete"
              suggestions={metaValues}
              onChange={(newValue) => setMetaValue(newValue)}
            />
          </div>
        </Card.Body>
      </Card>

      <Card className="obs-card">
        <Card.Header className="obs-card-header">
          <Card.Title>Depth Filter</Card.Title>
          <Form.Check
            type="switch"
            id="depth-toggle"
            onClick={() => {
              setDepthActive(!depthActive);
            }}
          />
        </Card.Header>
        <Card.Body className="obs-card slider-container">
          <Slider
            range
            allowCross={false}
            min={parseInt(Object.keys(STD_DEPTHS).slice(0)[0])}
            max={parseInt(Object.keys(STD_DEPTHS).slice(-1)[0])}
            marks={STD_DEPTHS}
            defaultValue={depthRange}
            onChange={(x) => setDepthRange(x)}
          />
        </Card.Body>
      </Card>
      <Button
        variant="primary"
        onClick={function () {
          observationSelect();
        }}
      >
        {"Apply"}
      </Button>
    </div>
  );
}

//***********************************************************************
ObservationSelector.propTypes = {
  area: PropTypes.array,
  action: PropTypes.func,
};

export default withTranslation()(ObservationSelector);
