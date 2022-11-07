import React from "react";
import ComboBox from "./ComboBox.jsx";
import PropTypes from "prop-types";
import DatePicker from "react-datepicker";
import Slider, { Range } from 'rc-slider';
import {Panel, FormGroup, Radio} from "react-bootstrap";
import Toggle from 'react-bootstrap-toggle';
import deepEqual from 'deep-equal';
import Autosuggest from 'react-autosuggest';
const stringify = require("fast-stable-stringify");

import 'rc-slider/assets/index.css';
import "react-datepicker/dist/react-datepicker.css";
import "react-bootstrap-toggle/dist/bootstrap2-toggle.css";

import { withTranslation } from "react-i18next";

const STD_DEPTHS = {
  0: '0m',
  1: '10m',
  2: '20m',
  3: '30m',
  4: '40m',
  5: '50m',
  6: '75m',
  7: '100m',
  8: '125m',
  9: '150m',
  10: '200m',
  11: '250m',
  12: '500m',
  13: '1,000m',
  14: '1,500m',
  15: '2,000m',
  16: '3,000m',
  17: '4,000m',
  18: '5,000m',
  19: '7,500m',
  20: '10,000m',
};

class ObservationSelector extends React.Component {
  constructor(props) {
    super(props);

    this.platforms = [
      {id: 'argo', value: 'Argo Float'},
      {id: 'drifter', value: 'Drifting Buoy'},
      {id: 'animal', value: 'Instrumented Animal'},
      {id: 'mission', value: 'Oceanographic Mission'},
      {id: 'glider', value: 'Glider'},
    ];

    this.state = {
      meta_keys: [],
      meta_values: [],
      startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
      endDate: new Date(),
      meta_key: '',
      meta_value: '',
      platform_type: this.platforms.map(x => x.id),
      platformActive: false,
      depthActive: false,
      datatypes: [],
      datatype: 'sea_water_temperature',
      depthrange: [0, 5],
      points: true,
      quantum: 'day',
      radius: 50,
    };

    // Function bindings
    this.onUpdate = this.onUpdate.bind(this);

    this.suggestions = [];
  }

  // Load data
  componentDidMount() {
    this.fetchDataTypes();
  }

  componentDidUpdate(prevprops, prevstate) {
    if (prevstate.platform_type != this.state.platform_type) {
      this.fetchMetaKeys();
    }
    if (prevstate.meta_key != this.state.meta_key) {
      this.fetchMetaValues();
    }
    if (!this.state.points && (
      (prevstate.startDate != this.state.startDate)
      ||
      (prevstate.endDate != this.state.endDate)
    )) {
      // Auto set quantum
      let end = this.state.endDate.getTime() / (1000 * 60 * 60 * 24);
      let start = this.state.startDate.getTime() / (1000 * 60 * 60 * 24);
      let quantum;
      if (end - start <= 31) {
        quantum = 'day';
      } else if (end - start <= 200) {
        quantum = 'week';
      } else if (end - start <= 1000) {
        quantum = 'month';
      } else {
        quantum = 'year';
      }
      this.setState({quantum: quantum});

    }
    this.updateParent();
  }

  fetchDataTypes() {
    const url = `/api/v2.0/observation/datatypes.json`;
    $.ajax({
      url: url,
      dataType: "json",
      success: function(data) {
        let state = {
          datatypes: data
        }
        this.setState(state);
      }.bind(this),
      error: function(r, status, err) {
        console.error(url, status, err.toString());
      },
    });
  }

  fetchMetaKeys() {
    const url = `/api/v2.0/observation/meta_keys/${this.state.platform_type}.json`;
    $.ajax({
      url: url,
      dataType: "json",
      success: function(data) {
        data.unshift("Any");
        let state = {
          meta_keys: data
        }
        if (data.length > 0) {
          state['meta_key'] = data[0];
        } else {
          state['meta_key'] = '';
        }
        this.setState(state);
      }.bind(this),
      error: function(r, status, err) {
        console.error(url, status, err.toString());
      },
    });
  }

  fetchMetaValues() {
    const url = `/api/v2.0/observation/meta_values/${this.state.platform_type}/${this.state.meta_key}.json`;
    $.ajax({
      url: url,
      dataType: "json",
      success: function(data) {
        let state = {
          meta_values: data
        }
        state['meta_value'] = '';
        this.setState(state);
      }.bind(this),
      error: function(r, status, err) {
        console.error(url, status, err.toString());
      },
    });
  }

  onUpdate(keys, values) {
    let newState = {};
    if (typeof keys !== "undefined") {
      for (let i = 0; i < keys.length; i++) {
        newState[keys[i]] = values[i];
      }
    }

    this.setState(newState);
  }
  
  updateParent() {
    const newState = {
      start_date: this.state.startDate.toISOString().slice(0, 10),
      end_date: new Date(new Date(this.state.endDate).setDate(this.state.endDate.getDate() + 1)).toISOString().slice(0, 10),
      type: (this.state.points) ? "points" : "track",
    };

    if (this.props.area.length > 0) {
      newState['area'] = stringify(this.props.area);
    }
    if (this.props.area.length == 1) {
      newState['radius'] = this.state.radius;
    }

    if (this.state.points) {
      newState['datatype'] = this.state.datatype;
    } else {
      newState['quantum'] = this.state.quantum;
    }

    if (this.state.platformActive) {
      Object.assign(newState, {
        platform_type: this.state.platform_type,
        meta_key: this.state.meta_key,
        meta_value: this.state.meta_value,
      });
    }

    if (this.state.depthActive) {
      Object.assign(newState, {
        mindepth: parseFloat(STD_DEPTHS[this.state.depthrange[0]]),
        maxdepth: parseFloat(STD_DEPTHS[this.state.depthrange[1]]),
      });
    }

    if (!deepEqual(this.props.state, newState)) {
      this.props.select(newState);
    }
  }

  render() {
    const keys = this.state.meta_keys.map(function(o) {
      return { id: o, value: o, };
    });
    function onSuggestionsFetchRequested(evt) {
      this.suggestions = this.state.meta_values.filter((v) => v.toLowerCase().indexOf(evt.value.toLowerCase()) > -1);
    }
    onSuggestionsFetchRequested = onSuggestionsFetchRequested.bind(this);
    function onSuggestionsClearRequested() {
      this.suggestions = [];
    }
    onSuggestionsClearRequested = onSuggestionsClearRequested.bind(this);
    function getSuggestionValue(suggestion) {
      return suggestion;
    }
    function renderSuggestion(suggestion) {
      return <span>{suggestion}</span>;
    }


    return (
      <div className='ObservationSelector'>
        <Panel>
          <Panel.Heading>
            <Panel.Title>Observation Type</Panel.Title>
          </Panel.Heading>
          <Panel.Body>
            <div className='input'>
              <h1>Observation Type</h1>
              <FormGroup>
                <Radio
                  inline
                  name='type'
                  checked={this.state.points}
                  onChange={e => this.setState({ points: e.target.value == "on" })}
                >Points</Radio>
                <Radio
                  inline
                  name='type'
                  checked={!this.state.points}
                  onChange={e => this.setState({ points: e.target.value != "on" })}
                >Tracks</Radio>
              </FormGroup>
            </div>
          </Panel.Body>
        </Panel>
        <Panel>
          <Panel.Heading>
            <Panel.Title>Date &amp; Variable Filters</Panel.Title>
          </Panel.Heading>
          <Panel.Body>
            <div className='inputs'>
              <div className="datepicker input">
                <h1>Start Date</h1>
                <DatePicker
                  id="startDate"
                  dateFormat="yyyy-MM-dd"
                  selected={this.state.startDate}
                  popperPlacement="top"
                  onChange={(newDate) => this.setState({startDate: newDate})}
                  maxDate={this.state.endDate}
                />
              </div>
              <div className="datepicker input">
                <h1>End Date</h1>
                <DatePicker
                  id="endDate"
                  dateFormat="yyyy-MM-dd"
                  selected={this.state.endDate}
                  popperPlacement="top"
                  onChange={(newDate) => this.setState({endDate: newDate})}
                  maxDate={new Date()}
                  minDate={this.state.startDate}
                />
              </div>

              { this.state.points &&
                  <ComboBox
                    key='datatype'
                    id='datatype'
                    state={this.state.datatype}
                    title='Data Type'
                    onUpdate={this.onUpdate}
                    data={this.state.datatypes}
                    alwaysShow
                  />
              }

              { !this.state.points &&
                  <ComboBox
                    key='quantum'
                    id='quantum'
                    state={this.state.quantum}
                    title='Track Simplification'
                    onUpdate={this.onUpdate}
                    data={[
                      {id: 'minute', value: 'Minute'},
                      {id: 'hour', value: 'Hour'},
                      {id: 'day', value: 'Day'},
                      {id: 'week', value: 'Week'},
                      {id: 'month', value: 'Month'},
                      {id: 'year', value: 'Year'},
                    ]}
                    alwaysShow
                  />
              }
            </div>
          </Panel.Body>
        </Panel>

        { this.props.area.length == 1 &&
        <Panel>
          <Panel.Heading>
            <Panel.Title>Search Radius</Panel.Title>
          </Panel.Heading>
          <Panel.Body>
            <div className='inputs'>
              <div className='input' style={{width: '100%'}}>
                <h1>Search Radius (km) around
                  ({this.props.area[0][0].toFixed(4)},&nbsp;
                  {this.props.area[0][1].toFixed(4)})
                </h1>
                <div style={{width: '95%', margin: '0 auto'}}>
                  <Slider
                    allowCross={false}
                    min={0}
                    max={250}
                    marks={{
                      0: '0km', 
                      50: '50km',
                      100: '100km',
                      150: '150km',
                      200: '200km',
                      250: '250km',
                    }}
                    defaultValue={this.state.radius}
                    onAfterChange={(x) => this.setState({radius: x})}
                  />
                </div>
              </div>
            </div>
          </Panel.Body>
        </Panel>
        }

        <Panel>
          <Panel.Heading>
            <Panel.Title toggle>Platform Filters</Panel.Title>
            <Toggle size='sm' height='100%'
              active={this.state.platformActive}
              onClick={(act) => this.setState({platformActive: act})}
            />
          </Panel.Heading>
          <Panel.Collapse
            onEnter={() => {
              this.fetchMetaKeys();
              this.setState({platformActive: true});
            }}
          >
            <Panel.Body>
              <div className='inputs'>
                <ComboBox
                  key='platform_type'
                  id='platform_type'
                  state={this.state.platform_type}
                  title={_("Platform Type")}
                  onUpdate={this.onUpdate}
                  data={this.platforms}
                  multiple
                />
                <ComboBox
                  key='meta_key'
                  id='meta_key'
                  state={this.state.meta_key}
                  title='Metadata Key'
                  onUpdate={this.onUpdate}
                  data={keys}
                  alwaysShow
                />
                <div className='input' style={{width: '30em'}}>
                  <h1>Metadata Value</h1>
                  <Autosuggest
                    suggestions={this.suggestions}
                    onSuggestionsFetchRequested={onSuggestionsFetchRequested}
                    onSuggestionsClearRequested={onSuggestionsClearRequested}
                    getSuggestionValue={getSuggestionValue}
                    renderSuggestion={renderSuggestion}
                    inputProps={{value: this.state.meta_value, onChange: (evt, v) => this.setState({meta_value: v.newValue})}}
                  />
                </div>
              </div>
            </Panel.Body>
          </Panel.Collapse>
        </Panel>

        <Panel>
          <Panel.Heading>
            <Panel.Title toggle>Depth Filter</Panel.Title>
            <Toggle size='sm' height='100%'
              active={this.state.depthActive}
              onClick={(act) => this.setState({depthActive: act})}
            />
          </Panel.Heading>
          <Panel.Collapse onEnter={() => this.setState({depthActive: true})}>
            <Panel.Body>
              <div className='inputs'>
                <div style={{width: '95%', margin: '0 auto'}}>
                  <Range
                    allowCross={false}
                    min={parseInt(Object.keys(STD_DEPTHS).slice(0)[0])}
                    max={parseInt(Object.keys(STD_DEPTHS).slice(-1)[0])}
                    marks={STD_DEPTHS}
                    defaultValue={this.state.depthrange}
                    onAfterChange={(x) => this.setState({depthrange: x})}
                  />
                </div>
              </div>
            </Panel.Body>
          </Panel.Collapse>
        </Panel>
      </div>
    );
  }
}

//***********************************************************************
ObservationSelector.propTypes = {
  select: PropTypes.func,
  state: PropTypes.object,
  area: PropTypes.array,
};


export default withTranslation()(ObservationSelector);
