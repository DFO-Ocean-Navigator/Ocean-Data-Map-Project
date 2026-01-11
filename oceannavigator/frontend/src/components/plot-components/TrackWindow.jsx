import React, { useState } from "react";
import Accordion from "react-bootstrap/Accordion";
import { Card, Col, Row, Nav } from "react-bootstrap";
import DatePicker from "react-datepicker";

import PlotImage from "./PlotImage.jsx";
import ComboBox from "../ComboBox.jsx";
import CheckBox from "../lib/CheckBox.jsx";
import ImageSize from "../ImageSize.jsx";
import PropTypes from "prop-types";
import DatasetPanel from "../DatasetPanel.jsx";
import { useGetTrackTimeRange } from "../../remote/queries.js";

import { withTranslation } from "react-i18next";

const TrackWindow = (props) => {
  const [showmap, setShowMap] = useState(true);
  const [plotDataset, setPlotDataset] = useState(props.dataset);
  const [latlon, setLatlon] = useState(false);
  const [trackvariable, setTrackVariable] = useState([0]);
  const [quantum, setQuantum] = useState(props.observationQuery.quantum);
  const [starttime, setStarttime] = useState(props.observationQuery.startDate);
  const [endtime, setEndtime] = useState(props.observationQuery.endDate);
  const [plotSize, setPlotSize] = useState("10x7");
  const [plotDpi, setPlotDpi] = useState(144);

  const trackTimeRange = useGetTrackTimeRange(props.plotData.id);

  const handleDatasetUpdate = (key, value) => {
    setPlotDataset((prev) => ({ ...prev, ...value }));
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

  var plotQuery = {
    dataset: plotDataset.id,
    name: props.name,
    track: [props.plotData.id],
    showmap: showmap,
    variable: plotDataset.variable.id,
    latlon: latlon,
    trackvariable: trackvariable,
    depth: plotDataset.depth,
    track_quantum: quantum,
  };

  if (starttime) {
    if (plotQuery.starttime instanceof Date) {
      plotQuery.starttime = starttime.toISOString();
      plotQuery.endtime = endtime.toISOString();
    } else {
      plotQuery.starttime = starttime;
      plotQuery.endtime = endtime;
    }
  }

  const permlink_subquery = {
    showmap,
    plotDataset,
    latlon,
    trackvariable,
    starttime,
    endtime,
    plotSize,
    plotDpi,
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

                <div key="starttime-div">
                  <h1 className="time-label">Start Date</h1>
                  <DatePicker
                    key="starttime"
                    id="starttime"
                    dateFormat="yyyy-MM-dd"
                    selected={starttime}
                    onChange={(newDate) => setStarttime(newDate)}
                    minDate={trackTimeRange.data.min}
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
                    maxDate={trackTimeRange.data.max}
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
            plotType="track"
            query={plotQuery} // For image saving link.
            permlink_subquery={permlink_subquery}
            featureId={props.plotData.id}
            action={props.action}
            size={plotSize}
            dpi={plotDpi}
          />
        </Col>
        <Col lg={2} className="settings-col">
          <Card id="left_map" variant="primary">
            <Card.Header>{_("Main Map")}</Card.Header>
            <Card.Body className="global-settings-card">
              <DatasetPanel
                id="track-window-dataset-panel"
                onUpdate={handleDatasetUpdate}
                hasDepth={true}
                disableTimeSelector={true}
                showQuiverSelector={false}
                mountedDataset={plotDataset}
              />
            </Card.Body>
          </Card>
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
