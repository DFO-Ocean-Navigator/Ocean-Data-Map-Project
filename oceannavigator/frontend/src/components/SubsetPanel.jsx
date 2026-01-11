import React, { useState, useEffect } from "react";
import { Button, Card, Dropdown, DropdownButton, Form } from "react-bootstrap";
import { withTranslation } from "react-i18next";
import PropTypes from "prop-types";

import CheckBox from "./lib/CheckBox.jsx";
import Icon from "./lib/Icon.jsx";
import VariableSelector from "./data-selectors/VariableSelector.jsx";
import TimeSelector from "./data-selectors/TimeSelector.jsx";
import DepthSelector from "./data-selectors/DepthSelector.jsx";

function SubsetPanel(props) {
  const [subsetDataset, setSubsetDataset] = useState({
    ...props.dataset,
    variable: [props.dataset.variable],
  });
  const [queryStatus, setQueryStatus] = useState({
    variables: "",
  });
  const [outputTimerange, setOutputTimerange] = useState(false);
  const [outputFormat, setOutputFormat] = useState("NETCDF4");
  const [zip, setZip] = useState(false);

  useEffect(() => {
    setSubsetDataset({
      ...props.dataset,
      variable: [props.dataset.variable],
    });
  }, [props.dataset]);
  
  const updateDataset = (key, value) => {
    setSubsetDataset((prevDataset) => ({
      ...prevDataset,
      [key]: value,
    }));
  };

  const updateQueryStatus = (key, status) => {
    setQueryStatus((prev) => ({ ...prev, [key]: status }));
  };

  const calculateAreaBoundingBox = (area) => {
    let lat_min = area[0][0];
    let long_min = area[0][1];
    let lat_max = area[0][0];
    let long_max = area[0][1];

    for (let i = 0; i < area.length; ++i) {
      lat_min = Math.min(lat_min, area[i][0]);
      long_min = Math.min(long_min, area[i][1]);

      lat_max = Math.max(lat_max, area[i][0]);
      long_max = Math.max(long_max, area[i][1]);
    }

    return [lat_min, lat_max, long_min, long_max];
  };

  const subsetArea = () => {
    var areaParams = {};
    // check if predefined area
    if (typeof props.area === "string" || props.area instanceof String) {
      areaParams["area"] = props.area;
    } else {
      const AABB = calculateAreaBoundingBox(props.area);
      const min_range = [AABB[0], AABB[2]].join();
      const max_range = [AABB[1], AABB[3]].join();
      areaParams["min_range"] = min_range;
      areaParams["max_range"] = max_range;
    }
    const variables = subsetDataset.variable.map((v) => v.id).join();
    const starttime = outputTimerange
      ? subsetDataset.starttime.id
      : subsetDataset.time.id;

    let query = {
      output_format: outputFormat,
      ...areaParams,
      time: [starttime, subsetDataset.time.id].join(),
      should_zip: zip ? 1 : 0,
    };
    showDepthSelector && (query["depth"] = subsetDataset.depth);

    window.location.href =
      `/api/v2.0/subset/${subsetDataset.id}/${variables}?` +
      JSON.stringify(query);
  };

  const saveScript = (key) => {
    const variables = subsetDataset.variable.map((v) => v.id).join();
    const starttime = outputTimerange
      ? subsetDataset.starttime.id
      : subsetDataset.time.id;
    let query = {
      output_format: outputFormat,
      dataset_name: subsetDataset.id,
      variables: variables,
      time: [starttime, subsetDataset.time.id].join(),
      should_zip: zip ? 1 : 0,
    };
    // check if predefined area
    if (typeof props.area === "string" || props.area instanceof String) {
      query["area"] = props.area;
    } else {
      const AABB = calculateAreaBoundingBox(props.area);
      query["min_range"] = [AABB[0], AABB[2]].join();
      query["max_range"] = [AABB[1], AABB[3]].join();
    }

    window.location.href =
      window.location.origin +
      "/api/v2.0/generate_script?query=" +
      JSON.stringify(query) +
      "&lang=" +
      key +
      "&script_type=subset";
  };

  const showDepthSelector = subsetDataset.variable.some(
    (v) => v.two_dimensional === false
  );

  return (
    <div>
      <Card key="subset" variant="primary">
        <Card.Header>{__("Subset")}</Card.Header>
        <Card.Body>
          <VariableSelector
            id="subset-panel-variable-selector"
            dataset={subsetDataset}
            updateDataset={updateDataset}
            updateQueryStatus={updateQueryStatus}
            multipleVariables={true}
          />
          {showDepthSelector ? (
            <DepthSelector
              id={"subset-panel-depth-selector"}
              dataset={subsetDataset}
              updateDataset={updateDataset}
              updateQueryStatus={updateQueryStatus}
              showAllDepths={true}
              enabled={queryStatus.variables !== "pending"}
            />
          ) : null}
          <CheckBox
            id="time_range"
            key="time_range"
            checked={outputTimerange}
            onUpdate={(_, value) => {
              setOutputTimerange(value);
            }}
            title={__("Select Time Range")}
          />
          <TimeSelector
            id={"subset-panel-time-selector"}
            dataset={subsetDataset}
            updateDataset={updateDataset}
            updateQueryStatus={updateQueryStatus}
            selectorType={outputTimerange ? "range" : null}
            enabled={queryStatus.variables !== "pending"}
          />
          <Form.Group controlId="outputFormat">
            <Form.Label>{__("Output Format")}</Form.Label>
            <Form.Select
              onChange={(e) => {
                setOutputFormat(e.target.value);
              }}
              value={outputFormat}
            >
              <option value="NETCDF4">{__("NetCDF-4")}</option>
              <option value="NETCDF3_CLASSIC">{__("NetCDF-3 Classic")}</option>
              <option value="NETCDF3_64BIT">{__("NetCDF-3 64-bit")}</option>
              <option
                value="NETCDF3_NC"
                disabled={
                  props.dataset.id.indexOf("giops") === -1 &&
                  props.dataset.id.indexOf("riops") === -1 // Disable if not a giops or riops dataset
                }
              >
                {"NetCDF-3 NC"}
              </option>
              <option value="NETCDF4_CLASSIC">{__("NetCDF-4 Classic")}</option>
            </Form.Select>
          </Form.Group>
          <CheckBox
            id="zip"
            key="zip"
            checked={zip}
            onUpdate={(_, checked) => {
              setZip(checked);
            }}
            title={__("Compress as *.zip")}
          />
          <Button
            variant="default"
            key="save"
            id="save"
            onClick={subsetArea}
            disabled={subsetDataset.variable.length === 0}
          >
            <Icon icon="save" /> {__("Save")}
          </Button>
          <DropdownButton
            id="script"
            title={
              <span>
                <Icon icon="file-code-o" /> {__("API Scripts")}
              </span>
            }
            variant={"default"}
            disabled={subsetDataset.variable.length === 0}
            onSelect={saveScript}
            drop={"up"}
          >
            <Dropdown.Item eventKey="python">
              <Icon icon="code" /> {__("Python 3")}
            </Dropdown.Item>
            <Dropdown.Item eventKey="r">
              <Icon icon="code" /> {__("R")}
            </Dropdown.Item>
          </DropdownButton>
        </Card.Body>
      </Card>
    </div>
  );
}

//***********************************************************************
SubsetPanel.propTypes = {
  id: PropTypes.string,
  key: PropTypes.string,
  dataset: PropTypes.object.isRequired,
  area: PropTypes.array.isRequired,
};

export default withTranslation()(SubsetPanel);
