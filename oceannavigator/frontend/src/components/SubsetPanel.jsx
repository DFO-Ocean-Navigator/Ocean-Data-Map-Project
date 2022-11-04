import React from "react";
import {Panel, Button, FormControl, FormGroup, ControlLabel, DropdownButton, MenuItem} from "react-bootstrap";
import ComboBox from "./ComboBox.jsx";
import CheckBox from "./lib/CheckBox.jsx";
import TimePicker from "./TimePicker.jsx";
import PropTypes from "prop-types";
import Icon from "./lib/Icon.jsx";
import { withTranslation } from "react-i18next";
import {GetVariablesPromise} from "../remote/OceanNavigator.js";
const stringify = require("fast-stable-stringify");

class SubsetPanel extends React.Component {
  constructor(props) {
    super(props);
    this._mounted = false;
    this.state = {
      loading: false,
      output_timerange: false,
      output_variables: [],
      output_starttime: props.dataset.starttime,
      output_endtime: props.dataset.time,
      quantum: props.dataset.quantum,
      dataset: props.dataset.dataset,
      variable: props.dataset.variable,
      output_format: "NETCDF4", // Subset output format
      zip: false, // Should subset file(s) be zipped
      subset_variables: [],
    };
  // Function bindings
  this.subsetArea = this.subsetArea.bind(this);
  this.saveScript = this.saveScript.bind(this);
  this.getSubsetVariables = this.getSubsetVariables.bind(this);
  this.setNewState = this.setNewState.bind(this);
  }

componentDidMount() {
  this._mounted = true;
  this.getSubsetVariables();
}
  
componentWillUnmount() {
  this._mounted = false;
}
  
componentDidUpdate(prevProps) {
  if (this.props.dataset.dataset !== prevProps.dataset.dataset) {
    this.getSubsetVariables();
  }
}

// Find max extents of drawn area
calculateAreaBoundingBox(area) {
  let lat_min = area.polygons[0][0][0];
  let lat_max = area.polygons[0][0][1];
  let long_min = area.polygons[0][0][0];
  let long_max = area.polygons[0][0][1];

  for (let i = 0; i < area.polygons[0].length; ++i) {
    lat_min = Math.min(lat_min, area.polygons[0][i][0]);
    long_min = Math.min(long_min, area.polygons[0][i][1]);

    lat_max = Math.max(lat_max, area.polygons[0][i][0]);
    long_max = Math.max(long_max, area.polygons[0][i][1]);
  }

  return [lat_min, lat_max, long_min, long_max];
}

subsetArea() {
  var queryString = [];
  // check if predefined area
  if (typeof this.props.area[0] === 'string' || 
    this.props.area[0] instanceof String) { 
    queryString = "&area=" + this.props.area[0];
  } else {
    const AABB = this.calculateAreaBoundingBox(this.props.area[0]);
    const min_range = [AABB[0], AABB[2]].join();
    const max_range = [AABB[1], AABB[3]].join(); 
    queryString = "&min_range=" + min_range +
                  "&max_range=" + max_range;
  }
  const output_endtime = this.state.output_timerange ? 
    this.state.output_endtime : this.state.output_starttime;
  window.location.href = `/api/v2.0/subset/${this.props.dataset.dataset}/${this.state.output_variables.join() }?` +
     "&output_format=" + this.state.output_format +
      queryString +
     "&time=" + [this.state.output_starttime, output_endtime].join() +
     "&should_zip=" + (this.state.zip ? 1 : 0);
}

saveScript(key) {
  let query = {
    "output_format": this.state.output_format,
    "dataset_name": this.props.dataset.dataset,
    "variables": this.state.output_variables.join(),
    "time": [this.state.output_starttime, this.state.output_endtime].join(),
    "should_zip": (this.state.zip ? 1:0)
  };
  // check if predefined area
  if (typeof this.props.area[0] === 'string' || this.props.area[0] instanceof String) { 
    query['area'] = this.props.area[0];
  } else {
    const AABB = this.calculateAreaBoundingBox(this.props.area[0]);
    query['min_range'] = [AABB[0], AABB[2]].join();
    query['max_range'] = [AABB[1], AABB[3]].join() ;
  }

  window.location.href = window.location.origin + 
                        "/api/v2.0/generate_script/?query=" + 
                        stringify(query) + 
                        "&lang=" + key + 
                        "&scriptType=subset";
}

getSubsetVariables() {
  this.setState({loading: true,});
  GetVariablesPromise(this.props.dataset.dataset).then(variableResult => {
    this.setState({
      loading: false,
      subset_variables: variableResult.data,
    });
  });
  this.setNewState();
}

setNewState() {
  let newState = {};
  newState = {
    output_starttime: this.props.dataset.starttime,
    output_endtime: this.props.dataset.time,
    quantum: this.props.dataset.quantum,
    dataset: this.props.dataset.dataset,
    variable: this.props.dataset.variable,
  };
  this.setState(newState);
}

render() {
  const subsetPanel = this.state.loading ? null : (
      <form>   
        <ComboBox
          id='variable'
          key='variable'
          multiple={true}
          state={this.state.output_variables}
          def={"defaults.dataset"}
          onUpdate={(keys, values) => { this.setState({output_variables: values[0],}); }}
          data={this.state.subset_variables}            
          title={("Variables")}
        />
        <CheckBox
          id='time_range'
          key='time_range'
          checked={this.state.output_timerange}
          onUpdate={(_, value) => {this.setState({output_timerange: value,});}}
          title={_("Select Time Range")}
        />
        <TimePicker
          id='starttime'
          key='starttime'
          state={this.state.output_starttime}
          def=''
          quantum={this.state.quantum}
          dataset={this.state.dataset}
          variable={this.state.variable}
          title={
            this.state.output_timerange ? _("Start Time (UTC)") : _("Time (UTC)")
          }
          onUpdate={ (_, value) => { this.setState({output_starttime: value}); }}
          max={this.state.dataset.time + 1}
        />
        <div style={{display: this.state.output_timerange ? "block" : "none",}}>
          <TimePicker
            id='time'
            key='time'
            state={this.state.output_endtime}
            def=''
            quantum={this.state.quantum}
            dataset={this.state.dataset}
            variable={this.state.variable}         
            title={
              this.state.output_timerange ? _("End Time (UTC)") : _("Time (UTC)")
            }
            onUpdate={ (_, value) => { this.setState({output_endtime: value}); }}
            min={this.state.dataset.time}               
          />
        </div>
        <FormGroup controlId="output_format">
          <ControlLabel>{_("Output Format")}</ControlLabel>
          <FormControl componentClass="select" onChange={e => { this.setState({output_format: e.target.value}); }}>
            <option value="NETCDF4">{_("NetCDF-4")}</option>
            <option value="NETCDF3_CLASSIC">{_("NetCDF-3 Classic")}</option>
            <option value="NETCDF3_64BIT">{_("NetCDF-3 64-bit")}</option>
            <option value="NETCDF3_NC" disabled={
              this.props.dataset.dataset.indexOf("giops") === -1 &&
              this.props.dataset.dataset.indexOf("riops") === -1 // Disable if not a giops or riops dataset
            }>
              {("NetCDF-3 NC")}
            </option>
            <option value="NETCDF4_CLASSIC">{_("NetCDF-4 Classic")}</option>
          </FormControl>
        </FormGroup>
        <CheckBox 
          id='zip'
          key='zip'
          checked={this.state.zip} 
          onUpdate={ (_, checked) => { this.setState({zip: checked}); } }
          title={_("Compress as *.zip")}
        />
        <Button 
          bsStyle="default" 
          key='save'
          id='save'
          onClick={this.subsetArea}
          disabled={this.state.output_variables == ""}
        ><Icon icon="save" /> {_("Save")}</Button>             
        <DropdownButton
          id="script"
          title={<span><Icon icon="file-code-o" /> {_("API Scripts")}</span>}
          bsStyle={"default"}
          disabled={this.state.output_variables == ""}
          onSelect={this.saveScript}
          dropup
        >
          <MenuItem
            eventKey="python"
          ><Icon icon="code" /> {_("Python 3")}</MenuItem>
            <MenuItem
            eventKey="r"
          ><Icon icon="code" /> {_("R")}</MenuItem> 
        </DropdownButton> 
      </form> 
  );

  return (
    <div>
      <Panel
        key='subset'
        defaultExpanded
        bsStyle='primary'
      >
        <Panel.Heading>{_("Subset")}</Panel.Heading>
        <Panel.Collapse>
          <Panel.Body>    
            {subsetPanel} 
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    </div>
    );
  }   
}

//***********************************************************************
SubsetPanel.propTypes = {
  id: PropTypes.string,
  key: PropTypes.string,
  dataset: PropTypes.object.isRequired,
  area: PropTypes.array.isRequired,
};

export default withTranslation()(SubsetPanel);
