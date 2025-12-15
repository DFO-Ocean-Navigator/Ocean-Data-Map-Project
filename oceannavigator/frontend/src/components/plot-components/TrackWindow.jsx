import React, { useState, useEffect } from "react";
import Accordion from "react-bootstrap/Accordion";
import { Card, Col, Row, Nav} from "react-bootstrap";

import PlotImage from "./PlotImage.jsx";
import ComboBox from "../ComboBox.jsx";
import CheckBox from "../lib/CheckBox.jsx";
import ImageSize from "../ImageSize.jsx";
import DatePicker from "react-datepicker";
import PropTypes from "prop-types";
import DatasetDropdown from "../DatasetDropdown.jsx";
import SelectBox from "../lib/SelectBox.jsx";

import {
  GetDatasetsPromise,
  GetVariablesPromise,
  GetTrackTimeRangePromise,
} from "../../remote/OceanNavigator.js";

import { withTranslation } from "react-i18next";

const TrackWindow = (props) => {
  const [showmap, setShowMap] = useState(true);
  const [dataset, setDataset] = useState(props.dataset);
  const [variable, setVariable] = useState(props.dataset.variable);
  const [availableDatasets, setAvailableDatasets] = useState([]);
  const [availableVariables, setAvailableVariables] = useState([]);
  const [latlon, setLatlon] = useState(false);
  const [trackvariable, setTrackVariable] = useState([0]);
  const [starttime, setStarttime] = useState(props.observationQuery.startDate);
  const [endtime, setEndtime] = useState(props.observationQuery.endDate);
  const [plotSize, setPlotSize] = useState("10x7");
  const [plotDpi, setPlotDpi] = useState(144);
  const [depth, setDepth] = useState(0);
  const [quantum, setQuantum] = useState(props.observationQuery.quantum);
  const [minDate, setMinDate] = useState();
  const [maxDate, setMaxDate] = useState();

  useEffect(() => {
    GetDatasetsPromise().then((result) => {
      setAvailableDatasets(result.data);
    });

    getVariables(dataset.id);

    GetTrackTimeRangePromise(props.plotData.id).then((result) => {
      let newMindate = new Date(result.data.min);
      let newMaxdate = new Date(result.data.max);
      setMinDate(newMindate);
      setMaxDate(newMaxdate);
    });
  }, []);

  const getVariables = (dataset) => {
    GetVariablesPromise(dataset).then((variableResult) => {
      let variables = variableResult.data;

      setAvailableVariables(variables);

      let currentVariable = variables.filter((v) => {
        return v.id === variable;
      })[0];

      if (!currentVariable) {
        setVariable(variables[0].id);
      }
    });
  };

  const changeDataset = (key, value) => {
    console.log(availableDatasets);
    console.log(key, value);

    let nextDataset = availableDatasets.filter((d) => d.id === value);
    getVariables(nextDataset[0].id);
    setDataset(nextDataset[0]);
  };

  const updateQuantum = (key, value) => {
    value = Array.isArray(value) ? value[0] : value;
    setQuantum(value);
  };

  const updatePlotSize = (key, value) => {
    if (key === "size") {
      setPlotSize(value);
    } else if (key === "dpi") {
      setPlotDpi(value);
    }
  };

  var plot_query = {
    dataset: dataset.id,
    quantum: dataset.quantum,
    name: props.name,
    type: "track",
    track: [props.plotData.id],
    showmap: showmap,
    variable: variable,
    latlon: latlon,
    trackvariable: trackvariable,
    size: plotSize,
    dpi: plotDpi,
    depth: depth,
    track_quantum: quantum,
  };

  if (starttime) {
    if (plot_query.starttime instanceof Date) {
      plot_query.starttime = starttime.toISOString();
      plot_query.endtime = endtime.toISOString();
    } else {
      plot_query.starttime = starttime;
      plot_query.endtime = endtime;
    }
  }

  const permlink_subquery = {
    showmap,
    dataset,
    variable,
    availableDatasets,
    availableVariables,
    latlon,
    trackvariable,
    starttime,
    endtime,
    plotSize,
    plotDpi,
    depth,
    quantum,
    minDate,
    maxDate,
  };

  return (
    <div className="TrackWindow">
      <Nav variant="tabs" activeKey={1}>
        <Nav.Item>
          <Nav.Link eventKey={1} disabled>
            {_("Track")}
          </Nav.Link>
        </Nav.Item>
      </Nav>
      <Row>
        <Col className="settings-col" lg={2}>
          <Card variant="primary" key="map_settings">
            <Card.Header>{_("Track Settings")}</Card.Header>
            <Card.Body className="global-settings-card">
              <div className="inputs-container">
                {availableDatasets.length > 0 && (
                  <DatasetDropdown
                    id="dataset"
                    key="dataset"
                    options={availableDatasets}
                    label={_("Dataset")}
                    placeholder={_("Dataset")}
                    onChange={changeDataset}
                    selected={dataset.id}
                  />
                )}
                {availableVariables.length > 0 && (
                  <SelectBox
                    key="variable"
                    id="variable"
                    name={_("variable")}
                    label={_("Variable")}
                    placeholder={_("Variable")}
                    options={availableVariables}
                    onChange={(_, value) => setVariable(value)}
                    selected={variable}
                  />
                )}
                <ComboBox
                  key="trackvariable"
                  id="trackvariable"
                  multiple
                  state={trackvariable}
                  def=""
                  onUpdate={(_, value) => setTrackVariable(value.flat())}
                  url={`/api/v2.0/observation/variables/platform=${props.plotData.id}.json`}
                  title={_("Observed Variable")}
                >
                  <h1>Track Variable</h1>
                </ComboBox>
                <CheckBox
                  key="showmap"
                  id="showmap"
                  checked={showmap}
                  onUpdate={(_, value) => setShowMap(value)}
                  title={_("Show Map")}
                >
                  {_("showmap_help")}
                </CheckBox>
                <CheckBox
                  key="latlon"
                  id="latlon"
                  checked={latlon}
                  onUpdate={(_, value) => setLatlon(value)}
                  title={_("Show Latitude/Longitude Plots")}
                >
                  {_("latlon_help")}
                </CheckBox>
                <div key="starttime-div">
                  <h1 className="time-label">Start Date</h1>
                  <DatePicker
                    key="starttime"
                    id="starttime"
                    dateFormat="yyyy-MM-dd"
                    selected={starttime}
                    onChange={(newDate) => setStarttime(newDate)}
                    minDate={minDate}
                    maxDate={endtime}
                  />
                </div>
                <div key="endtime-div">
                  <h1 className="time-label">End Date</h1>
                  <DatePicker
                    key="endtime"
                    id="endtime"
                    dateFormat="yyyy-MM-dd"
                    selected={endtime}
                    onChange={(newDate) => setEndtime(newDate)}
                    minDate={starttime}
                    maxDate={maxDate}
                  />
                </div>
                <ComboBox
                  key="quantum"
                  id="quantum"
                  state={quantum}
                  title="Track Simplification"
                  onUpdate={updateQuantum}
                  data={[
                    { id: "minute", value: "Minute" },
                    { id: "hour", value: "Hour" },
                    { id: "day", value: "Day" },
                    { id: "week", value: "Week" },
                    { id: "month", value: "Month" },
                    { id: "year", value: "Year" },
                  ]}
                />
                <ComboBox
                  key="depth"
                  id="depth"
                  state={depth}
                  def={""}
                  onUpdate={(_, value) => {
                    value = Array.isArray(value) ? value[0] : value;
                    setDepth(value);
                  }}
                  url={`/api/v2.0/dataset/${props.dataset.id}/${variable}/depths?include_all_key=true`}
                  title={_("Depth")}
                />
                <Accordion key="plot-options-accordion">
                  <Accordion.Header>Plot Options</Accordion.Header>
                  <Accordion.Body className="plot-accordion">
                    <ImageSize
                      key="size"
                      id="size"
                      onUpdate={updatePlotSize}
                      title={_("Saved Image Size")}
                    />
                  </Accordion.Body>
                </Accordion>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="plot-col" lg={8}>
          <PlotImage
            query={plot_query} // For image saving link.
            permlink_subquery={permlink_subquery}
            featureId={props.plotData.id}
            action={props.action}
          />
        </Col>
      </Row>
    </div>
  );
};

//***********************************************************************
TrackWindow.propTypes = {
  track: PropTypes.array,
  dataset: PropTypes.object,
  onUpdate: PropTypes.func,
  init: PropTypes.object,
  action: PropTypes.func,
  observationQuery: PropTypes.object,
};

export default withTranslation()(TrackWindow);
