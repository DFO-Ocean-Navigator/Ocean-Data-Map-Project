import React from "react";
import ReactDOM from "react-dom";
import {Button, MenuItem, Modal, Navbar, Nav, NavItem, NavDropdown, OverlayTrigger, Tooltip} from "react-bootstrap";
import Papa from "papaparse";

import Icon from "./lib/Icon.jsx";
import DrifterSelector from "./DrifterSelector.jsx";
import ObservationSelector from "./ObservationSelector.jsx";
import EnterPoint from "./EnterPoint.jsx";
import EnterLine from "./EnterLine.jsx";
import EnterArea from "./EnterArea.jsx";
import ToggleLanguage from "./ToggleLanguage.jsx";
import PropTypes from "prop-types";

import { 
  GetPresetPointsPromise,
  GetPresetLinesPromise,
  GetPresetAreasPromise,
  GetClass4Promise
} from "../remote/OceanNavigator.js";

import { withTranslation } from "react-i18next";

import "jquery-ui-css/base.css";
import "jquery-ui-css/datepicker.css";
import "jquery-ui-css/theme.css";
import "jquery-ui/datepicker";

class MapToolbar extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = {
      pointFiles: [],
      lineFiles: [],
      areaFiles: [],
      class4OPFiles: {},
      class4RAOFiles: {},
      parser: null,
      showDriftersSelect: false,
      showPointCoordModal: false,
      showLineCoordModal: false,
      showAreaCoordModal: false,
      observationSelection: {
      },
      drifterList: [],
    };

    // Function bindings
    this.buttonHandler = this.buttonHandler.bind(this);
    this.pointSelect = this.pointSelect.bind(this);
    this.observationSelect = this.observationSelect.bind(this);
    this.lineSelect = this.lineSelect.bind(this);
    this.areaSelect = this.areaSelect.bind(this);
    this.class4ButtonHandler = this.class4ButtonHandler.bind(this);
    this.beforeShowDay = this.beforeShowDay.bind(this);
    this.observationSelectMenu = this.observationSelectMenu.bind(this);
    this.drifterSelect = this.drifterSelect.bind(this);
    this.setDrifterSelection = this.setDrifterSelection.bind(this);
    this.observationSelection = this.observationSelection.bind(this);
    this.setCoordData = this.setCoordData.bind(this);
    this.applyPointCoords = this.applyPointCoords.bind(this);
    this.applyLineCoords = this.applyLineCoords.bind(this);
    this.applyAreaCoords = this.applyAreaCoords.bind(this);
    this.parseCSV = this.parseCSV.bind(this);
    this.parseODV = this.parseODV.bind(this);
  }

  buttonHandler(e) {
    let elem = e.target;
    let name = elem.name;
    while (name === undefined) {
      elem = elem.parentElement;
      name = elem.name;
    }
    this.props.action(name);
    this.props.disablePlotInteraction();
  }

  class4ButtonHandler(type)  {
    let button = null;
    let div = null;
    let class4Files = null;
    let minDate = null;
    let maxDate = null;
    switch (type){
      case "ocean_predict":
        button = $(ReactDOM.findDOMNode(this.class4OPButton));
        div = this.class4OpDiv;
        class4Files = this.state.class4OPFiles;
        minDate = new Date(2019, 1, 1); 
        maxDate = new Date(2022, 1, 27);
        break;
      case "riops_obs":
        button = $(ReactDOM.findDOMNode(this.class4RAOButton));
        div = this.class4RAODiv;
        class4Files = this.state.class4RAOFiles;
        minDate = new Date(2022, 1, 1);
        maxDate = new Date(2022, 4, 30);
        break;
    }
    this.class4Picker = $(div).datepicker({
      dateFormat: "yy-mm-dd",
      beforeShowDay: (d) => this.beforeShowDay(d,type),
      regional: this.props.i18n.language,
      onSelect: function(text, picker) {
        this.props.action("show", "class4", class4Files[text], type);
      }.bind(this),
      minDate: minDate,
      maxDate: maxDate
    }); 
    $(div).css("left", button.offset() + "px");
    this.forceUpdate();
    this.class4Picker = null;
  }

  beforeShowDay(d, type) {
    const formatted = $.datepicker.formatDate("yy-mm-dd", d);
    var date = null;
    if (type == 'ocean_predict') {
      date = this.state.class4OPFiles.hasOwnProperty(formatted);
    } else {
      date = this.state.class4RAOFiles.hasOwnProperty(formatted);
    }
    return [date, "", null];
  }
  
  componentDidMount() {
    GetPresetPointsPromise().then(result => {
      this.setState({
        pointFiles: result.data,
      });
    },
    error => {
      console.error(error);
    });

    GetPresetLinesPromise().then(result => {
      this.setState({
        lineFiles: result.data,
      });
    },
    error => {
      console.error(error);
    });

    GetPresetAreasPromise().then(result => {
      this.setState({
        areaFiles: result.data,
      });
    },
    error => {
      console.error(error);
    });

    GetClass4Promise().then(result => {
      this.setState({
        class4OPFiles: result.data.ocean_predict.reduce(function(map, obj) {
          map[obj.name] = obj.id;
          return map;
        }, {}),

        class4RAOFiles: result.data.riops_obs.reduce(function(map, obj) {
          map[obj.name] = obj.id;
          return map;
        }, {}),
      });
    },
    error => {
      console.error(error);
    });
  }

  // Handles when an option is clicked in the Point dropdown button
  pointSelect(key) {
    switch (key) {
      case "csv":
        this.props.updateState("plotEnabled", true);
        this.setState({parser: "point",});
        this.fileinput.click();
        break;
      case "odv":
        this.odvinput.click();
        break;
      case "draw":
        this.props.action("point");
        break;
      case "coordinates":
        this.props.updateState("plotEnabled", true);
        this.setState({showPointCoordModal: true,});
        break;
      default:
        this.props.updateState("plotEnabled", false);
        this.props.action("show", "points", key);
        break;
    }
  }

  observationSelect(selection) {
    let type = selection['type'];
    delete selection['type'];
    let result = Object.keys(selection).map(function(key) {
      return `${key}=${selection[key]}`;
    }).join(';');
    if (type == "track") {
      this.props.action("show", "observation_tracks", result);
    } else {
      this.props.action("show", "observation_points", result);
    }
  }

  // When an option is clicked in the Line dropdown button
  lineSelect(key) { 
    switch(key) {
      case "csv":
        this.setState({parser: "line",});
        this.props.updateState("plotEnabled", true);
        this.fileinput.click();
        break;
      case "draw":
        this.props.action("line");
        break;
      case "coordinates":
        this.props.updateState("plotEnabled", true);
        this.setState({showLineCoordModal: true,});
        break;
      default:
        this.props.updateState("plotEnabled", false);
        this.props.action("show", "lines", key);
        break;
    }
  }

  observationSelectMenu(key) {
    switch(key) {
      case 'drifters':
        let today = new Date();
        let start = new Date(new Date().setDate(today.getDate() - 30));
        this.observationSelect({
          start_date: start.toISOString().slice(0, 10),
          end_date: new Date().toISOString().slice(0, 10),
          type: "track",
          quantum: "day",
          platform_type: ["drifter"],
        });

        return;
      case 'point':
        this.props.action("obs_point");
        break;
      case 'area':
        this.props.action("obs_area");
        break;
      case 'all':
        this.props.updateState('showObservationSelect', true);
        break;
      default:
        console.log("ObservationSelect: Unknown key: ", key);
    }
  }

  // When an option is clicked in the Area dropdown button
  areaSelect(key) {
    switch (key) {
      case "csv":
        this.props.updateState("plotEnabled", true);
        this.setState({parser: "area"});
        this.fileinput.click();
        break;
      case "draw":
        this.props.action("area");
        break;
      case "coordinates":
        this.props.updateState("plotEnabled", true);
        this.setState({showAreaCoordModal: true,});
        break;
      default:
        this.props.updateState("plotEnabled", false);
        this.props.action("show", "areas", key);
        break;
    }
  }

  // When an option is clicked from the drifter button
  drifterSelect(key) {
    if (key == "select") {
      this.setState({showDriftersSelect: true,});
    } 
    else {
      this.props.action("show", "drifters", key);
    }
  }

  setDrifterSelection(list) {
    this.setState({drifterList: list});
  }

  observationSelection(list) {
    this.setState({observationSelection: list});
  }

  // Updates coordinate data:
  // Point: coordinate = [lat,lon]
  // Line:  line: {
  //               startCoord = [lat,lon] 
  //               endCoord = [lat,lon]
  //            }
  // Area: areaCoords: [coord[], coord[], coord[], coord[]]
  setCoordData(data) {
    this.setState(data);
  }

  // Instructs the OceanNavigator to fetch point data
  applyPointCoords() {
    // Draw points on map(s)
    this.props.action("add", "point", [this.state.coordinate]);
    // We send "enterPoint" too so that the coordinates do not get
    // negated or reversed.
    this.props.action("point", this.state.coordinate, "enterPoint");
  }

  // Fetch line data
  applyLineCoords() {
    // Draw line on map(s)
    this.props.action("add", "line", [this.state.line.startCoord, this.state.line.endCoord]);
    // Needs to be a nested array so multiple lines can be parsed
    this.props.action("line", [[this.state.line.startCoord, this.state.line.endCoord]]);
  }

  // Fetch area data
  applyAreaCoords() {
    const points = this.state.areaCoords.slice();
    const area = {
      polygons: [points],
      innerrings: [],
      name: "",
    };
    // Draw area on map(s)
    this.props.action("add", "area", points);
    // Send area to AreaWindow
    this.props.action("area", [area]);
  }

  // http://papaparse.com/docs
  parseCSV(e) {
    if (e.target.files.length == 1) {
      const file = e.target.files[0];
      this.setState({
        parsedFile: file.name,
      });
      Papa.parse(file, {
        dynamicTyping: true,
        skipEmptyLines: true,
        header: true,
        complete: function(results) {
          
          // Convert everything to lowercase
          const fields_lowered = results.meta.fields.map(function(f) {
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
            alert(_("Error: Could not find latitude or longitude column in file: ") + file.name);
            return;
          }

          const points = results.data.map(function(point) {
            return [point[lat], point[lon]];
          });

          this.props.action(
            "add",
            this.state.parser,
            points,
            this.state.parsedFile
          );
        }.bind(this),
      });

      this.fileform.reset();
    }
  }

  // http://papaparse.com/docs
  parseODV(e) {
    if (e.target.files.length == 1) {
      const file = e.target.files[0];
      this.setState({
        parsedFile: file.name,
      });
      Papa.parse(file, {
        delimiter: "\t",
        comments: "//",
        dynamicTyping: true,
        skipEmptyLines: true,
        header: false,
        encoding: "ascii",
        error: function(err, file, inputElem, reason) {
          console.error(err, reason);
        },
        complete: function(results) {
          const headerLine = results.data[0];
          function findColumn(prefix) {
            for (let i = 0; i < headerLine.length; i++) {
              if (headerLine[i].toLowerCase().startsWith(prefix.toLowerCase() )) {
                return i;
              }
            }
            return -1;
          }

          const latCol = jQuery.inArray("Latitude [degrees_north]", headerLine);
          const lonCol = jQuery.inArray("Longitude [degrees_east]", headerLine);
          const staCol = jQuery.inArray("Station", headerLine);

          var dateCol = findColumn("yyyy-mm-dd");
          if (dateCol == -1) {
            dateCol = headerLine.length;
            var col;
            var split;
            var d;
            if ((col = findColumn("mon/day/yr")) != -1 ||
                            (col = findColumn("mm/dd/yyyy")) != -1) {

              for (let i = 1; i < results.data.length; i++) {
                split = results.data[i][col].split("/");
                results.data[i][dateCol] = split[2] + "-" +
                  split[0] + "-" +
                  split[1] + " ";
              }
            } else if ((col = findColumn("dd/mm/yyyy")) != -1) {
              for (let i = 1; i < results.data.length; i++) {
                split = results.data[i][col].split("/");
                results.data[i][dateCol] = split[2] + "-" +
                  split[1] + "-" +
                  split[0] + " ";
              }
            } else if ((col = findColumn("yyyy/mm/dd")) != -1) {
              for (let i = 1; i < results.data.length; i++) {
                split = results.data[i][col].split("/");
                results.data[i][dateCol] = split[0] + "-" +
                  split[1] + "-" +
                  split[2] + " ";
              }
            } else if ((col = findColumn("mmddyyyy")) != -1) {
              for (let i = 1; i < results.data.length; i++) {
                d = results.data[i][col];
                results.data[i][dateCol] = d.substring(4, 4) + "-" +
                  d.substring(0, 2) + "-" +
                  d.substring(2, 2) + " ";
              }
            } else if ((col = findColumn("ddmmyyyy")) != -1) {
              for (let i = 1; i < results.data.length; i++) {
                d = results.data[i][col];
                results.data[i][dateCol] = d.substring(4, 4) + "-" +
                  d.substring(2, 2) + "-" +
                  d.substring(0, 2) + " ";
              }
            } else if ((col = findColumn("yyyymmdd")) != -1) {
              for (let i = 1; i < results.data.length; i++) {
                d = results.data[i][col];
                results.data[i][dateCol] = d.substring(0, 4) + "-" +
                  d.substring(4, 2) + "-" +
                  d.substring(6, 2) + " ";
              }
            } else if ((col = findColumn("year")) != -1) {
              const yearcol = col;
              const monthcol = findColumn("month");
              const daycol = findColumn("day");
              for (let i = 1; i < results.data.length; i++) {
                results.data[i][dateCol] = results.data[i][yearcol] + "-" +
                  results.data[i][monthcol] + "-" +
                  results.data[i][daycol] + " ";
              }
            } else {
              alert(_("Error: Unknown Date/Time format in file: " + file.name));
              return;
            }

            if ((col = findColumn("hh:mm")) != -1) {
              for (let i = 1; i < results.data.length; i++) {
                results.data[i][dateCol] += results.data[i][col];
              }
            } else if ((col = findColumn("hhmm")) != -1) {
              for (let i = 1; i < results.data.length; i++) {
                results.data[i][dateCol] +=
                  results.data[i][col].substring(0, 2) + ":" +
                  results.data[i][col].substring(2, 2);
              }
            } else if ((col = findColumn("hour")) != -1) {
              const minutecol = findColumn("minute");
              for (let i = 1; i < results.data.length; i++) {
                results.data[i][dateCol] += results.data[i][col] + ":" +
                  results.data[i][minutecol];
              }
            }
          }

          var depthCol = findColumn("Depth");
          var depthunit = new RegExp(/\[(.*)\]/).exec(headerLine[depthCol])[1];
          var datacols = [];
          var dataheaders = [];
          for (let i = depthCol + 1; i < headerLine.length; i++) {
            if (headerLine[i] != "QF") {
              datacols.push(i);
              dataheaders.push(headerLine[i]);
            }
          }

          var cruiseCol = findColumn("Cruise");
          var points = [];

          var station = "";
          var cruise = "";
          var point = {};
          for (let i = 1; i < results.data.length; i++) {
            if (results.data[i][cruiseCol] != "") {
              cruise = results.data[i][cruiseCol];
            }
            if (String(results.data[i][staCol]) != "" && results.data[i][staCol] != station) {
              station = results.data[i][staCol];
              point = {
                station: cruise + " - " + station,
                latitude: results.data[i][latCol],
                longitude: results.data[i][lonCol],
                time: new Date(results.data[i][dateCol]),
                datatypes: dataheaders,
                depth: [],
                data: [],
                depthunit: depthunit,
              };
              points.push(point);
            }

            points[points.length - 1].depth.push(results.data[i][depthCol]);
            var data = [];
            for (let j of datacols) {
              data.push(results.data[i][j]);
            }
            points[points.length - 1].data.push(data);
          }

          this.props.action("add", "observation", points);
        }.bind(this),
      });

      this.odvform.reset();
    }
  }

  render() {
    const pointFiles = this.state.pointFiles.map(function(d) {
      return <MenuItem eventKey={d.id} key={d.id}>{d.name}</MenuItem>;
    });
    const lineFiles = this.state.lineFiles.map(function(d) {
      return <MenuItem eventKey={d.id} key={d.id}>{d.name}</MenuItem>;
    });
    const areaFiles = this.state.areaFiles.map(function(d) {
      return <MenuItem eventKey={d.id} key={d.id}>{d.name}</MenuItem>;
    });

    _("Drifters");
    _("Reset Map");
    _("Link");

    return (
      <Navbar inverse>
        <Navbar.Header>
          <Navbar.Brand>
            <a href="#" onClick={this.props.toggleSidebar} >
              <Icon icon="bars" /> {_("Toggle Sidebar")}
            </a>
          </Navbar.Brand>
          <Navbar.Toggle />
        </Navbar.Header>
          
        <Navbar.Collapse>
          <Nav>
            <NavDropdown
              name="point"
              id="point"
              title={<span><Icon icon="bullseye" /> {_("Point")}</span>}
              onSelect={this.pointSelect}
            >
              <MenuItem
                eventKey='draw'
                key='draw'
              ><Icon icon="pencil" /> {_("Draw on Map")}</MenuItem>
              <MenuItem divider />
              {pointFiles}
              <MenuItem divider />
              <MenuItem
                eventKey='coordinates'
                key='coordinates'
              ><Icon icon="keyboard-o" /> {_("Enter Coordinate(s)")}</MenuItem>
              <MenuItem
                eventKey='csv'
                key='csv'
              ><Icon icon="upload" /> {_("Upload CSV…")}</MenuItem>
              <MenuItem
                eventKey='odv'
                key='odv'
              ><Icon icon="upload" /> {_("Upload ODV…")}</MenuItem>
            </NavDropdown>
        
            <NavDropdown 
              name="line"
              id="line"
              title={<span><Icon icon="pencil" /> {_("Line")}</span>} 
              onSelect={this.lineSelect}
            >
              <MenuItem
                eventKey='draw'
                key='draw'
              ><Icon icon="pencil" /> {_("Draw on Map")}</MenuItem>
              <MenuItem divider />
              {lineFiles}
              <MenuItem divider />
              <MenuItem
                eventKey='coordinates'
                key='coordinates'
              ><Icon icon="keyboard-o" /> {_("Enter Coordinate(s)")}</MenuItem>
              <MenuItem
                eventKey='csv'
                key='csv'
              ><Icon icon="upload" /> {_("Upload CSV…")}</MenuItem>
            </NavDropdown>
        
            <NavDropdown
              name="area"
              id="area"
              title={<span><Icon icon="square-o" /> {_("Area")}</span>}
              onSelect={this.areaSelect}
            >
              <MenuItem
                eventKey='draw'
                key='draw'
              ><Icon icon="pencil" /> {_("Draw on Map")}</MenuItem>
              <MenuItem divider />
              {areaFiles}
              <MenuItem divider />
              <MenuItem
                eventKey='coordinates'
                key='coordinates'
              ><Icon icon="keyboard-o" /> {_("Enter Coordinate(s)")}</MenuItem>
              <MenuItem
                eventKey='csv'
                key='csv'
              ><Icon icon="upload" /> {_("Upload CSV…")}</MenuItem>
            </NavDropdown>

            <NavDropdown
              id="class4"
              name="class4"
              title={<span><Icon icon="calculator" /> {_("Class4")}</span>}
            >
              <NavDropdown
                id="ocean_predict"
                name="ocean_predict"
                title={"OceanPredict"}
                onClick={() => this.class4ButtonHandler('ocean_predict')}
                ref={(b) => this.class4OPButton = b}
              >
                <MenuItem>
                  <div ref={(d) => this.class4OpDiv = d}/>
                </MenuItem>
              </NavDropdown>
              <NavDropdown
                id="riops_obs"
                name="riops_obs"
                title={"RIOPS Assimilated Observations"}
                onClick={() => this.class4ButtonHandler('riops_obs')}
                ref={(b) => this.class4RAOButton = b}
              >
                <MenuItem>
                  <div ref={(d) => this.class4RAODiv = d}/>
                </MenuItem>
              </NavDropdown> 
            </NavDropdown>
            <NavDropdown
              id="observation"
              name="observation"
              title={<span><Icon icon="eye" /> {_("Observations")}</span>}
              onSelect={this.observationSelectMenu}
            >
              <MenuItem
                key="drifters"
                eventKey="drifters"
              >{_("Show Active Drifters")}</MenuItem>
              <MenuItem divider />
              <MenuItem
                key="all"
                eventKey="all"
              >{_("All")}</MenuItem>
              <MenuItem
                key="area"
                eventKey="area"
              >{_("Select Area")}</MenuItem>
              <MenuItem
                key="point"
                eventKey="point"
              >{_("Select Point")}</MenuItem>
            </NavDropdown>

            <NavItem 
              name="plot"
              onClick={this.buttonHandler}
              disabled={!this.props.plotEnabled}
            >
              <Icon icon='line-chart' /> {_("Plot")}
            </NavItem>
          
            <OverlayTrigger
              placement="bottom"
              overlay={<Tooltip id="tooltip">{_("Reset Map")}</Tooltip>}
            >
              <NavItem
                name="reset"
                onClick={(e) => {
                  this.buttonHandler(e); 
                  this.props.updateState("plotEnabled", false);
                }
                }
              >
                <Icon icon='undo' alt={_("Reset Map")} />
              </NavItem>
            </OverlayTrigger>
          </Nav>

          {/* Right-hand menu items*/}
          <Nav pullRight>
            <OverlayTrigger
              placement="bottom"
              overlay={<Tooltip id="tooltip">{_("Permalink")}</Tooltip>}
            >
              <NavItem
                name="permalink"
                onClick={this.buttonHandler}
              >
                <Icon icon='link' alt={_("Permalink")}/>
              </NavItem>
            </OverlayTrigger>

            <ToggleLanguage
              className="languageButton"
            />

            {/* <OverlayTrigger
              placement="bottom"
              overlay={<Tooltip id="tooltip">{_("API Documentation")}</Tooltip>}
            >
              <NavItem
                name='api'
                target="_blank"
                href="/documentation/"
              >
                API
              </NavItem>
            </OverlayTrigger> */}
            <OverlayTrigger
              placement="bottom"
              overlay={<Tooltip id="tooltip">{_("Help")}</Tooltip>}
            >
              <NavItem
                name="help"
                onClick={this.buttonHandler}
              >
                <Icon icon='question' alt={_("Help")}/>
              </NavItem>
            </OverlayTrigger>
          </Nav>
        </Navbar.Collapse>

        <form ref={(f) => this.fileform = f}>
          <input
            type='file'
            style={{"display": "none"}}
            onChange={this.parseCSV}
            ref={(f) => this.fileinput = f}
            accept=".csv,.CSV"
          />
        </form>

        <form ref={(f) => this.odvform = f}>
          <input
            type='file'
            style={{"display": "none"}}
            onChange={this.parseODV}
            ref={(f) => this.odvinput = f}
            accept=".txt,.TXT"
          />
        </form>

        <Modal
          show={this.state.showPointCoordModal}
          onHide={() => this.setState({showPointCoordModal: false})}
          dialogClassName="pointCoord-modal">
          <Modal.Header closeButton>
            <Modal.Title>{_("Enter Point Coordinate(s)")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <EnterPoint
              setCoordData={this.setCoordData}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={() => this.setState({showPointCoordModal: false})}
            ><Icon icon="close" /> {_("Close")}</Button>
            <Button
              bsStyle="primary"
              onClick={function() {
                this.setState({showPointCoordModal: false});
                this.applyPointCoords();
              }.bind(this)}
            ><Icon icon="check" /> {_("Apply")}</Button>
          </Modal.Footer>
        </Modal>

        <Modal
          show={this.state.showLineCoordModal}
          onHide={() => this.setState({showLineCoordModal: false})}
          dialogClassName="lineCoord-modal">
          <Modal.Header closeButton>
            <Modal.Title>{_("Enter Line Coordinate(s)")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <EnterLine
              setCoordData={this.setCoordData}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={() => this.setState({showLineCoordModal: false})}
            ><Icon icon="close" /> {_("Close")}</Button>
            <Button
              bsStyle="primary"
              onClick={function() {
                this.setState({showLineCoordModal: false});
                this.applyLineCoords();
              }.bind(this)}
            ><Icon icon="check" /> {_("Apply")}</Button>
          </Modal.Footer>
        </Modal>

        <Modal
          show={this.state.showAreaCoordModal}
          onHide={() => this.setState({showAreaCoordModal: false})}
          dialogClassName="areaCoord-modal">
          <Modal.Header closeButton>
            <Modal.Title>{_("Enter Area Coordinate(s)")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <EnterArea
              setCoordData={this.setCoordData}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={() => this.setState({showAreaCoordModal: false})}
            ><Icon icon="close" /> {_("Close")}</Button>
            <Button
              bsStyle="primary"
              onClick={function() {
                this.setState({showAreaCoordModal: false});
                this.applyAreaCoords();
              }.bind(this)}
            ><Icon icon="check" /> {_("Apply")}</Button>
          </Modal.Footer>
        </Modal>

        <Modal
          show={this.state.showDriftersSelect}
          onHide={() => this.setState({showDriftersSelect: false})}
          dialogClassName="drifter-modal">
          <Modal.Header closeButton>
            <Modal.Title>{_("Select Drifters")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <DrifterSelector
              select={this.setDrifterSelection}
              state={this.state.drifterList}/>
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={() => this.setState({showDriftersSelect: false})}
            ><Icon icon="close" /> {_("Close")}</Button>
            <Button
              bsStyle="primary"
              onClick={function() {
                this.drifterSelect(this.state.drifterList.join(","));
                this.setState({showDriftersSelect: false});
              }.bind(this)}
            ><Icon icon="check" /> {_("Apply")}</Button>
          </Modal.Footer>
        </Modal>

        <Modal
          show={this.props.showObservationSelect}
          onHide={() => this.props.updateState('showObservationSelect', false)}
          dialogClassName="observation-modal">
          <Modal.Header closeButton>
            <Modal.Title>{_("Select Observations")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <ObservationSelector
              select={this.observationSelection}
              state={this.state.observationSelection}
              area={this.props.observationArea}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={() => this.props.updateState('showObservationSelect', false)}
            ><Icon icon="close" /> {_("Close")}</Button>
            <Button
              bsStyle="primary"
              onClick={function() {
                this.observationSelect(this.state.observationSelection);
                this.props.updateState('showObservationSelect', false);
              }.bind(this)}
            ><Icon icon="check" /> {_("Apply")}</Button>
          </Modal.Footer>
        </Modal>
      </Navbar>
    );
  }
}

//***********************************************************************
MapToolbar.propTypes = {
  plotEnabled: PropTypes.bool,
  updateState: PropTypes.func,
  toggleSidebar: PropTypes.func,
  action: PropTypes.func,
  toggleOptionsSidebar: PropTypes.func,
  showObservationSelect: PropTypes.bool,
  observationArea: PropTypes.array,
  disablePlotInteraction: PropTypes.func,
};

export default withTranslation()(MapToolbar);
