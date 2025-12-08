import React, { useState, useEffect } from "react";
import Accordion from "react-bootstrap/Accordion";
import { Card, Col, Row } from "react-bootstrap";

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
  const [starttime, setStarttime] = useState();
  const [endtime, setEndtime] = useState();
  const [plotSize, setPlotSize] = useState("10x7");
  const [plotDpi, setPlotDpi] = useState(144);
  const [depth, setDepth] = useState(0);
  const [trackQuantum, setTrackQuantum] = useState("month");
  const [minDate, setMinDate] = useState();
  const [maxDate, setMaxDate] = useState();

  useEffect(() => {
    if (props.obs_query) {
      let pairs = props.obs_query.split("&").map((x) => x.split("="));
      let dict = pairs.reduce(function (d, p) {
        d[p[0]] = p[1];
        return d;
      }, {});
      setStarttime(new Date(dict.start_date));
      setEndtime(new Date(dict.end_date));
      setTrackQuantum(dict.quantum);
    }

    GetDatasetsPromise().then((result) => {
      setAvailableDatasets(result.data);
    });

    getVariables(dataset.id);

    GetTrackTimeRangePromise(props.track).then((result) => {
      let newMindate = new Date(result.data.min);
      let newMaxdate = new Date(result.data.max);

      if (starttime < mindate) {
        setStarttime(mindate);
      }
      if (endtime > maxdate) {
        setEndtime(maxdate);
      }

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

  const onLocalUpdate = (key, value) => {
    // var newState = {};
    // if (key == "dataset") {
    //   let newDataset = availableDatasets.filter((d) => {
    //     return d.id === value;
    //   })[0];
    //   this.getVariables(newDataset.id);
    //   newState[key] = newDataset;
    // } else if (typeof key === "string") {
    //   newState[key] = value;
    // } else {
    //   for (var i = 0; i < key.length; i++) {
    //     newState[key[i]] = value[i];
    //   }
    // }

    // this.setState(newState);
  };

  var plot_query = {
    dataset: dataset.id,
    quantum: dataset.quantum,
    name: props.name,
    type: "track",
    track: props.track,
    showmap: showmap,
    variable: variable,
    latlon: latlon,
    trackvariable: trackvariable,
    size: plotSize,
    dpi: plotDpi,
    depth: depth,
    track_quantum: trackQuantum,
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

  return (
    <div className="TrackWindow">
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
                    onChange={onLocalUpdate}
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
                    onChange={onLocalUpdate}
                    selected={variable}
                  />
                )}
                <ComboBox
                  key="trackvariable"
                  id="trackvariable"
                  multiple
                  state={trackvariable}
                  def=""
                  onUpdate={onLocalUpdate}
                  url={`/api/v2.0/observation/variables/platform=${props.plotData.id}.json`}
                  title={_("Observed Variable")}
                >
                  <h1>Track Variable</h1>
                </ComboBox>
                <CheckBox
                  key="showmap"
                  id="showmap"
                  checked={showmap}
                  onUpdate={onLocalUpdate}
                  title={_("Show Map")}
                >
                  {_("showmap_help")}
                </CheckBox>
                ;
                <CheckBox
                  key="latlon"
                  id="latlon"
                  checked={latlon}
                  onUpdate={onLocalUpdate}
                  title={_("Show Latitude/Longitude Plots")}
                >
                  {_("latlon_help")}
                </CheckBox>
                ;
                <div key="starttime-div">
                  <h1 className="time-label">Start Date</h1>
                  <DatePicker
                    key="starttime"
                    id="starttime"
                    dateFormat="yyyy-MM-dd"
                    selected={starttime}
                    onChange={(newDate) =>
                      onLocalUpdate("starttime", newDate)
                    }
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
                    onChange={(newDate) =>
                      onLocalUpdate("endtime", newDate)
                    }
                    minDate={starttime}
                    maxDate={maxDate}
                  />
                </div>
                <ComboBox
                  key="track_quantum"
                  id="track_quantum"
                  state={trackQuantum}
                  data={[
                    { id: "minute", value: "Minute" },
                    { id: "hour", value: "Hour" },
                    { id: "day", value: "Day" },
                    { id: "week", value: "Week" },
                    { id: "month", value: "Month" },
                    { id: "year", value: "Year" },
                  ]}
                  title="Track Simplification"
                  onUpdate={onLocalUpdate}
                />
                <Accordion key="plot-options-accordion">
                  <Accordion.Header>Plot Options</Accordion.Header>
                  <Accordion.Body className="plot-accordion">
                    <ImageSize
                      key="size"
                      id="size"
                      onUpdate={onLocalUpdate}
                      title={_("Saved Image Size")}
                    />
                  </Accordion.Body>
                </Accordion>
                <ComboBox
                  key="depth"
                  id="depth"
                  state={depth}
                  def={""}
                  onUpdate={onLocalUpdate}
                  url={`/api/v2.0/dataset/${props.dataset.id}/${variable}/depths?include_all_key=true`}
                  title={_("Depth")}
                />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col className="plot-col" lg={8}>
          <PlotImage
            query={plot_query} // For image saving link.
            // permlink_subquery={this.state}
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
  obs_query: PropTypes.string,
};

export default withTranslation()(TrackWindow);
