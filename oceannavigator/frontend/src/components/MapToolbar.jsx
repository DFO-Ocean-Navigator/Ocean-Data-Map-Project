import React from "react";
import ReactDOM from "react-dom";
import {Button, MenuItem, Modal, Navbar, Nav, NavItem, NavDropdown, OverlayTrigger, Tooltip} from "react-bootstrap";
import Papa from "papaparse";

import Icon from "./Icon.jsx";
import DrifterSelector from "./DrifterSelector.jsx";
import ObservationSelector from "./ObservationSelector.jsx";
import EnterPoint from "./EnterPoint.jsx";
import EnterLine from "./EnterLine.jsx";
import EnterArea from "./EnterArea.jsx";
import ToggleLanguage from "./ToggleLanguage.jsx";
import PropTypes from "prop-types";

const currentLanguage = require("../currentLanguage.js");
const i18n = require("../i18n.js");

import "jquery-ui-css/base.css";
import "jquery-ui-css/datepicker.css";
import "jquery-ui-css/theme.css";
import "jquery-ui/datepicker";

export default class MapToolbar extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = {
      pointFiles: [],
      lineFiles: [],
      areaFiles: [],
      class4Files: {},
      parser: null,
      showDriftersSelect: false,
      showObservationSelect: false,
      showPointCoordModal: false,
      showLineCoordModal: false,
      showAreaCoordModal: false,
      observationSelection: {
        ship:[],
        trip:[]
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
    this.class4Select = this.class4Select.bind(this);
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
  }
  
  class4ButtonHandler() {
    const button = $(ReactDOM.findDOMNode(this.class4button));
    if (this.class4Picker && this.class4Picker.is(":visible")) {
      this.class4Picker.hide();
    } else if (!this.class4Picker) {
      if (this.class4Picker !== null) {
        this.class4Picker = null;
      }
      this.class4Picker = $(this.class4div).datepicker({
        dateFormat: "yy-mm-dd",
        beforeShowDay: this.beforeShowDay.bind(this),
        regional: currentLanguage.language,
        onSelect: function(text, picker) {
          this.props.action("show", "class4", this.state.class4Files[text]);
          this.class4Picker.hide();
        }.bind(this),
        defaultDate: this.state.class4Current,
      });

      $(this.class4div).css("left", button.offset().left + "px");
    } else {
      this.class4Picker.show();
    }
    this.forceUpdate();
  }

  beforeShowDay(d) {
    const formatted = $.datepicker.formatDate("yy-mm-dd", d);
    return [
      this.state.class4Files.hasOwnProperty(formatted),
      "",
      null
    ];
  }

  componentDidMount() {
    $.ajax({
      url: "/api/points/",
      dataType: "json",
      cache: true,
      success: function(data) {
        this.setState({
          pointFiles: data,
        });
      }.bind(this),
      error: function(r, status, err) {
        console.error(this.props.url, status, err.toString());
      }
    });
    $.ajax({
      url: "/api/lines/",
      dataType: "json",
      cache: true,
      success: function(data) {
        this.setState({
          lineFiles: data,
        });
      }.bind(this),
      error: function(r, status, err) {
        console.error(this.props.url, status, err.toString());
      }
    });
    $.ajax({
      url: "/api/areas/",
      dataType: "json",
      cache: true,
      success: function(data) {
        this.setState({
          areaFiles: data,
        });
      }.bind(this),
      error: function(r, status, err) {
        console.error(this.props.url, status, err.toString());
      }
    });
    $.ajax({
      url: "/api/class4/",
      dataType: "json",
      cache: true,
      success: function(data) {
        this.setState({
          class4Files: data.reduce(function(map, obj) {
            map[obj.name] = obj.id;
            return map;
          }, {}),
          class4Current: data[0].name,
        });
      }.bind(this),
      error: function(r, status, err) {
        console.error(this.props.url, status, err.toString());
      }
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
      case "observation":
        this.setState({showObservationSelect: true,});
        break;
      case "coordinates":
        this.props.updateState("plotEnabled", true);
        this.setState({showPointCoordModal: true,});
        break;
      default:
        this.props.action("show", "points", key);
        break;
    }
  }

  // Point -> Observation button
  observationSelect(selection) {
    let result = "";
    if (selection.ship.length > 0) {
      result += "ship:";
      result += selection.ship.join(",");
    }

    if (selection.trip.length > 0) {
      if (selection.ship.length > 0) {
        result += ";";
      }

      result += "trip:";
      result += selection.trip.join(",");
    }
    this.props.action("show", "observations", result);
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
        this.props.action("show", "lines", key);
        break;
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
        this.props.action("show", "areas", key);
        break;
    }
  }

  // Class4 selection
  class4Select(key) {
    this.props.action("show", "class4", key);
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
                eventKey='observation'
                key='observation'
              ><Icon icon='list'/> {_("Observations…")}</MenuItem>
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
              onClick={this.class4ButtonHandler}
              ref={(b) => this.class4button = b}
            >
              <MenuItem>
                <div ref={(d) => this.class4div = d}/>
              </MenuItem>
            </NavDropdown>

            <NavDropdown
              name="drifter"
              id="drifter"
              title={<span><Icon icon="tint" /> {_("Drifters")}</span>}
              onSelect={this.drifterSelect}
            >
              <MenuItem
                eventKey='all'
                key='all'
              >{_("All")}</MenuItem>
              <MenuItem
                eventKey='active'
                key='active'
              >{_("Active")}</MenuItem>
              <MenuItem
                eventKey='not responding'
                key='not responding'
              >{_("Not Responding")}</MenuItem>
              <MenuItem
                eventKey='inactive'
                key='inactive'
              >{_("Inactive")}</MenuItem>
              <MenuItem divider />
              <MenuItem
                eventKey='select'
                key='select'
              ><Icon icon='list'/> {_("Select…")}</MenuItem>
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
              updateLanguage={this.props.updateLanguage}   
            />

            <OverlayTrigger
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
            </OverlayTrigger>
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
          show={this.state.showObservationSelect}
          onHide={() => this.setState({showObservationSelect: false})}
          dialogClassName="observation-modal">
          <Modal.Header closeButton>
            <Modal.Title>{_("Select Observations")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <ObservationSelector
              select={this.observationSelection}
              state={this.state.observationSelection}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={() => this.setState({showObservationSelect: false})}
            ><Icon icon="close" /> {_("Close")}</Button>
            <Button
              bsStyle="primary"
              onClick={function() {
                this.observationSelect(this.state.observationSelection);
                this.setState({showObservationSelect: false});
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
  updateLanguage: PropTypes.func,
};

