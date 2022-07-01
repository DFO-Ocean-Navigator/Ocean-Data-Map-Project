import React from "react";
import {Panel, Button, FormControl, FormGroup, ControlLabel, DropdownButton, MenuItem} from "react-bootstrap";
import ComboBox from "./ComboBox.jsx";
import SelectBox from "./SelectBox.jsx";
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
      output_timerange: false,
      output_variables: [],
      output_starttime: props.dataset.starttime,
      output_endtime: props.dataset.time,
      output_format: "NETCDF4", // Subset output format
      convertToUserGrid: false,
      zip: false, // Should subset file(s) be zipped
      subset_variables: [],
    };
  // Function bindings
  this.subsetArea = this.subsetArea.bind(this);
  this.saveScript = this.saveScript.bind(this);
  this.getSubsetVariables = this.getSubsetVariables.bind(this);
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
  if (typeof this.props.area[0] === 'string' || this.props.area[0] instanceof String) { 
    queryString = "&area=" + this.props.area[0];
  } else {
    const AABB = this.calculateAreaBoundingBox(this.props.area[0]);
    const min_range = [AABB[0], AABB[2]].join();
    const max_range = [AABB[1], AABB[3]].join(); 
    queryString = "&min_range=" + min_range +
                  "&max_range=" + max_range;
  }
  const output_endtime = this.state.output_timerange ? this.state.output_endtime : this.state.output_starttime;
  window.location.href = "/api/v1.0/subset/?" +
     "&output_format=" + this.state.output_format +
     "&dataset_name=" + this.props.dataset.dataset +
     "&variables=" + this.state.output_variables.join() +
      queryString +
     "&time=" + [this.state.output_starttime, output_endtime].join() +
     "&user_grid=" + (this.state.convertToUserGrid ? 1 : 0) +
     "&should_zip=" + (this.state.zip ? 1 : 0);
}

saveScript(key) {
  let query = {
    "output_format": this.state.output_format,
    "dataset_name": this.props.dataset.dataset,
    "variables": this.state.output_variables.join(),
    "time": [this.state.output_starttime, this.state.output_endtime].join(),
    "user_grid": (this.state.convertToUserGrid ? 1:0),
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
                        "/api/v1.0/generatescript/?query=" + 
                        stringify(query) + 
                        "&lang=" + key + 
                        "&scriptType=SUBSET";
}

getSubsetVariables() {
  GetVariablesPromise(this.props.dataset.dataset).then(variableResult => {
    this.setState({
      subset_variables: variableResult.data, 
    });
  });
  this.setState({
    output_starttime: this.props.dataset.starttime,
    output_endtime: this.props.dataset.time    
  });
}
render() {
  const subsetPanel = (
    <Panel
      key='subset'
      defaultExpanded
      bsStyle='primary'
    >
      <Panel.Heading>{_("Subset")}</Panel.Heading>
        <Panel.Collapse>
          <Panel.Body>
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
              <SelectBox
                id='time_range'
                key='time_range'
                state={this.state.output_timerange}
                onUpdate={(_, value) => {this.setState({output_timerange: value,});}}
                title={_("Select Time Range")}
              />
              <TimePicker
                id='starttime'
                key='starttime'
                state={this.state.output_starttime}
                def=''
                quantum={this.props.dataset.quantum}
                dataset={this.props.dataset.dataset}
                variable={this.props.dataset.variable}
                title={this.state.output_timerange ? _("Start Time (UTC)") : _("Time (UTC)")}
                onUpdate={ (key, value) => { this.setState({output_starttime: value}); }}
                max={this.props.dataset.time + 1}
              />
              <div style={{display: this.state.output_timerange ? "block" : "none",}}>
                <TimePicker
                  id='time'
                  key='time'
                  state={this.state.output_endtime}
                  def=''
                  quantum={this.props.dataset.quantum}
                  dataset={this.props.dataset.dataset}
                  variable={this.props.dataset.variable}         
                  title={this.state.output_timerange ? _("End Time (UTC)") : _("Time (UTC)")}
                  onUpdate={ (key, value) => { this.setState({output_endtime: value}); }}
                  min={this.props.dataset.time}               
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
              <SelectBox 
                id='zip'
                key='zip'
                state={this.state.zip} 
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
          </Panel.Body>
        </Panel.Collapse>
    </Panel>
    );

  return (
    <div>     
      {subsetPanel} 
    </div>
    );
  }   
}

//***********************************************************************
SubsetPanel.propTypes = {
  dataset: PropTypes.object.isRequired,
  area: PropTypes.array.isRequired,
};

export default withTranslation()(SubsetPanel);