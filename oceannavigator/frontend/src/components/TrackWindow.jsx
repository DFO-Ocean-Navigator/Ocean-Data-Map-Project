import React from "react";
import Accordion from "react-bootstrap/Accordion";
import { Card, Col, Row } from "react-bootstrap";

import PlotImage from "./PlotImage.jsx";
import ComboBox from "./ComboBox.jsx";
import CheckBox from "./lib/CheckBox.jsx";
import ImageSize from "./ImageSize.jsx";
import DatePicker from "react-datepicker";
import PropTypes from "prop-types";
import DatasetDropdown from "./DatasetDropdown.jsx";
import SelectBox from "./lib/SelectBox.jsx";

import {
  GetDatasetsPromise,
  GetVariablesPromise,
  GetTrackTimeRangePromise
} from "../remote/OceanNavigator.js";

import { withTranslation } from "react-i18next";

class TrackWindow extends React.Component {

  constructor(props) {
    super(props);
    console.log(props.dataset)

    this.state = {
      showmap: true,
      dataset: props.dataset,
      variable: props.dataset.variable,
      availableDatasets: [],
      availableVariables: [],
      latlon: false,
      trackvariable: [0],
      starttime: null,
      endtime: null,
      size: "10x7",
      dpi: 72,
      depth: 0,
      track_quantum: 'month'
    };

    if (this.props.obs_query) {
      let pairs = this.props.obs_query.split(';').map(x => x.split('='));
      let dict = pairs.reduce(function (d, p) { d[p[0]] = p[1]; return d }, {});
      this.state['starttime'] = new Date(dict.start_date);
      this.state['endtime'] = new Date(dict.end_date);
      this.state['track_quantum'] = dict.quantum;
    }

    if (props.init !== null) {
      this.state = { ...this.state, ...props.init };
    }

    // Function bindings
    this.onLocalUpdate = this.onLocalUpdate.bind(this);
  }

  componentDidMount() {
    GetDatasetsPromise().then((result) => {
      this.setState({ availableDatasets: result.data })
    });

    this.getVariables(this.state.dataset.id)

    GetTrackTimeRangePromise(this.props.track).then(
      (result) => {
        let starttime = this.state.starttime
        let endtime = this.state.endtime
        let mindate = new Date(result.data.min)
        let maxdate = new Date(result.data.max)

        if (starttime < mindate) {
          starttime = mindate
        }
        if (endtime > maxdate) {
          endtime = maxdate
        }

        this.setState({
          mindate: mindate,
          maxdate: maxdate,
          starttime: starttime,
          endtime: endtime,
        });
      }
    )
  }

  getVariables(dataset) {
    GetVariablesPromise(dataset).then(
      (variableResult) => {
        let variables = variableResult.data
        variables = variables.filter((v) => {
          return v.two_dimensional === false;
        });
        this.setState({ availableVariables: variables })
      }
    )
  }

  onLocalUpdate(key, value) {
    var newState = {};
    if (key == "dataset") {
      let newDataset = this.state.availableDatasets.filter((d) => {
        return d.id === value;
      })[0];
      this.getVariables(newDataset.id)
      newState[key] = newDataset
    } else 
    if (typeof (key) === "string") {
      newState[key] = value;
    } else {
      for (var i = 0; i < key.length; i++) {
        newState[key[i]] = value[i];
      }
    }

    this.setState(newState);

    var parentKeys = [];
    var parentValues = [];

    if (newState.hasOwnProperty("variable") && newState.variable.length == 1) {
      parentKeys.push("variable");
      parentValues.push(newState.variable[0]);
    }

    if (parentKeys.length > 0) {
      this.props.onUpdate(parentKeys, parentValues);
    }
  }

  render() {
    _("Dataset");
    _("Observed Variable");
    _("Variable");
    _("Show Map");
    _("Show Latitude/Longitude Plots");
    _("Start Time");
    _("End Time");
    _("Saved Image Size");

    let dataset = null;
    let variable = null;
    if (this.state.availableDatasets.length > 0) {
      dataset = <DatasetDropdown
        id={"dataset"}
        key={"dataset"}
        options={this.state.availableDatasets}
        label={_("Dataset")}
        placeholder={_("Dataset")}
        onChange={this.onLocalUpdate}
        selected={this.state.dataset.id}
      />
    }

    if (this.state.availableVariables.length > 0) {
      variable = <SelectBox
        id={"variable"}
        name={_("variable")}
        label={_("Variable")}
        placeholder={_("Variable")}
        options={this.state.availableVariables}
        onChange={this.onLocalUpdate}
        selected={this.state.variable}
      />
    }

    var trackvariable = <ComboBox
      key='trackvariable'
      id='trackvariable'
      multiple
      state={this.state.trackvariable}
      def=''
      onUpdate={this.onLocalUpdate}
      url={`/api/v2.0/observation/variables/platform=${this.props.track[0]}.json`}
      title={_("Observed Variable")}
    ><h1>Track Variable</h1></ComboBox>;


    var showmap = <CheckBox
      key='showmap'
      id='showmap'
      checked={this.state.showmap}
      onUpdate={this.onLocalUpdate}
      title={_("Show Map")}
    >{_("showmap_help")}</CheckBox>;

    var latlon = <CheckBox
      key='latlon'
      id='latlon'
      checked={this.state.latlon}
      onUpdate={this.onLocalUpdate}
      title={_("Show Latitude/Longitude Plots")}
    >{_("latlon_help")}</CheckBox>;

    var starttime = <div key="starttime-div">
      <h1 className="time-label">Start Date</h1>
      <DatePicker
        key='starttime'
        id="starttime"
        dateFormat="yyyy-MM-dd"
        selected={this.state.starttime}
        onChange={(newDate) => this.onLocalUpdate("starttime", newDate)}
        minDate={this.state.mindate}
        maxDate={this.state.endtime}
      />
    </div>

    var endtime = <div key="endtime-div">
      <h1 className="time-label">End Date</h1>
      <DatePicker
        key='endtime'
        id="endtime"
        dateFormat="yyyy-MM-dd"
        selected={this.state.endtime}
        onChange={(newDate) => this.onLocalUpdate("endtime", newDate)}
        minDate={this.state.starttime}
        maxDate={this.state.maxdate}
      />
    </div>

    var track_quantum = <ComboBox
      key='track_quantum'
      id='track_quantum'
      state={this.state.track_quantum}
      data={[
        { id: 'minute', value: 'Minute' },
        { id: 'hour', value: 'Hour' },
        { id: 'day', value: 'Day' },
        { id: 'week', value: 'Week' },
        { id: 'month', value: 'Month' },
        { id: 'year', value: 'Year' },
      ]}
      title='Track Simplification'
      onUpdate={this.onLocalUpdate}
    />;

    var size = <ImageSize
      key='size'
      id='size'
      state={this.state.size}
      onUpdate={this.onLocalUpdate}
      title={_("Saved Image Size")}
    />;

    var accordion = <Accordion key="plot-options-accordion">
      <Accordion.Header>Plot Options</Accordion.Header>
      <Accordion.Body className="plot-accordion">
        {size}
      </Accordion.Body>
    </Accordion>

    var depth = <ComboBox
      key='depth'
      id='depth'
      state={this.state.depth}
      def={""}
      onUpdate={this.onLocalUpdate}
      url={`/api/v2.0/dataset/${this.props.dataset.id}/${this.state.variable}/depths?include_all_key=true`}
      title={_("Depth")}
    />;

    var inputs = [];
    var plot_query = {
      dataset: this.state.dataset.id,
      quantum: this.state.dataset.quantum,
      name: this.props.name,
      type: "track",
      track: this.props.track,
      showmap: this.state.showmap,
      variable: this.state.variable,
      latlon: this.state.latlon,
      trackvariable: this.state.trackvariable,
      size: this.state.size,
      dpi: this.state.dpi,
      depth: this.state.depth,
      track_quantum: this.state.track_quantum,
    };

    if (this.state.starttime) {
      if (plot_query.starttime instanceof Date) {
        plot_query.starttime = this.state.starttime.toISOString();
        plot_query.endtime = this.state.endtime.toISOString();
      } else {
        plot_query.starttime = this.state.starttime;
        plot_query.endtime = this.state.endtime;
      }
    }

    inputs = [
      dataset, variable, showmap, latlon, starttime, endtime, track_quantum,
      trackvariable, depth, accordion
    ];

    return (
      <div className='TrackWindow'>
        <Row>
          <Col className="settings-col" lg={2}>
            <Card variant="primary" key="map_settings">
              <Card.Header>{_("Track Settings")}</Card.Header>
              <Card.Body className="global-settings-card">
                <div className="inputs-container">
                  {inputs}
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col className="plot-col" lg={8}>
            <PlotImage
              query={plot_query} // For image saving link.
              permlink_subquery={this.state}
              action={this.props.action}
            />
          </Col>
        </Row>
      </div>
    );
  }
}

//***********************************************************************
TrackWindow.propTypes = {
  track: PropTypes.array,
  dataset: PropTypes.object,
  onUpdate: PropTypes.func,
  init: PropTypes.object,
  action: PropTypes.func,
  obs_query: PropTypes.string
};

export default withTranslation()(TrackWindow);
