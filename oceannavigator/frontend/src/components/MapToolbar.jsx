import React from "react";
import ReactDOM from "react-dom";
import {Button, SplitButton, DropdownButton, MenuItem, Modal} from "react-bootstrap";
import Papa from "papaparse";
import Icon from "./Icon.jsx";
import DrifterSelector from "./DrifterSelector.jsx";
import ObservationSelector from "./ObservationSelector.jsx";
var i18n = require("../i18n.js");

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
      class4Files: {},
      parser: null,
      showDriftersSelect: false,
      showObservationSelect: false,
      observationSelection: {ship:[],trip:[]},
      drifterList: [],
    };
  }

  buttonHandler(e) {
    var elem = e.target;
    var name = elem.name;
    while (name == undefined) {
      elem = elem.parentElement;
      name = elem.name;
    }
    this.props.action(name);
  }

  class4ButtonHandler() {
    var button = $(ReactDOM.findDOMNode(this.class4button));
    if (this.class4Picker && this.class4Picker.is(":visible")) {
      this.class4Picker.hide();
    } else if (!this.class4Picker) {
      this.class4Picker = $(this.class4div).datepicker({
        dateFormat: "yy-mm-dd",
        beforeShowDay: this.beforeShowDay.bind(this),
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
  }

  beforeShowDay(d) {
    var formatted = $.datepicker.formatDate("yy-mm-dd", d);
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

  pointSelect(key) {
    if (key == "custom") {
      this.setState({
        parser: "point",
      });
      this.fileinput.click();
    } else if (key == "odv") {
      this.odvinput.click();
    } else if (key == "draw") {
      this.props.action("point");
    } else if (key == "observation") {
      this.setState({
        showObservationSelect: true,
      });
    } else {
      this.props.action("show", "points", key);
    }
  }

  lineSelect(key) {
    if (key == "custom") {
      this.setState({
        parser: "line",
      });
      this.fileinput.click();
    } else if (key == "draw") {
      this.props.action("line");
    } else {
      this.props.action("show", "lines", key);
    }
  }

  areaSelect(key) {
    if (key == "custom") {
      this.setState({
        parser: "area",
      });
      this.fileinput.click();
    } else if (key == "draw") {
      this.props.action("area");
    } else {
      this.props.action("show", "areas", key);
    }
  }

  drifterSelect(key) {
    if (key == "select") {
      this.setState({
        showDriftersSelect: true,
      });
    } else {
      this.props.action("show", "drifters", key);
    }
  }

  drifterSelection(list) {
    this.setState({drifterList: list});
  }

  observationSelect(selection) {
    var result = "";
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

  observationSelection(list) {
    this.setState({observationSelection: list});
  }

  class4Select(key) {
    this.props.action("show", "class4", key);
  }

  parseCSV(e) {
    if (e.target.files.length == 1) {
      var file = e.target.files[0];
      this.setState({
        parsedFile: file.name,
      });
      Papa.parse(file, {
        dynamicTyping: true,
        skipEmptyLines: true,
        header: true,
        complete: function(results) {
          var fields_lowered = results.meta.fields.map(function(f) {
            return f.toLowerCase();
          });
          function findKey(names) {
            for (var i = 0; i < names.length; i++) {
              var index = fields_lowered.indexOf(names[i]);
              if (index > -1) {
                return results.meta.fields[index];
              }
            }
            return -1;
          }

          var lat = findKey(["latitude", "lat"]);
          var lon = findKey(["longitude", "lon"]);
          if (lat == -1 || lon == -1) {
            alert(_("Error: Could not find latitude or longitude column"));
            return;
          }

          var points = results.data.map(function(r) {
            return [r[lat], r[lon]];
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

  parseODV(e) {
    if (e.target.files.length == 1) {
      var file = e.target.files[0];
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
          var headerLine = results.data[0];
          function findColumn(prefix) {
            for (var i = 0; i < headerLine.length; i++) {
              if (headerLine[i].toLowerCase().startsWith(
                prefix.toLowerCase()
              )) {
                return i;
              }
            }
            return -1;
          }
          var latCol = jQuery.inArray("Latitude [degrees_north]", headerLine);
          var lonCol = jQuery.inArray("Longitude [degrees_east]", headerLine);
          var staCol = jQuery.inArray("Station", headerLine);

          var dateCol = findColumn("yyyy-mm-dd");
          var i;
          if (dateCol == -1) {
            dateCol = headerLine.length;
            var col;
            var split;
            var d;
            if ((col = findColumn("mon/day/yr")) != -1 ||
                            (col = findColumn("mm/dd/yyyy")) != -1) {

              for (i = 1; i < results.data.length; i++) {
                split = results.data[i][col].split("/");
                results.data[i][dateCol] = split[2] + "-" +
                  split[0] + "-" +
                  split[1] + " ";
              }
            } else if ((col = findColumn("dd/mm/yyyy")) != -1) {
              for (i = 1; i < results.data.length; i++) {
                split = results.data[i][col].split("/");
                results.data[i][dateCol] = split[2] + "-" +
                  split[1] + "-" +
                  split[0] + " ";
              }
            } else if ((col = findColumn("yyyy/mm/dd")) != -1) {
              for (i = 1; i < results.data.length; i++) {
                split = results.data[i][col].split("/");
                results.data[i][dateCol] = split[0] + "-" +
                  split[1] + "-" +
                  split[2] + " ";
              }
            } else if ((col = findColumn("mmddyyyy")) != -1) {
              for (i = 1; i < results.data.length; i++) {
                d = results.data[i][col];
                results.data[i][dateCol] = d.substring(4, 4) + "-" +
                  d.substring(0, 2) + "-" +
                  d.substring(2, 2) + " ";
              }
            } else if ((col = findColumn("ddmmyyyy")) != -1) {
              for (i = 1; i < results.data.length; i++) {
                d = results.data[i][col];
                results.data[i][dateCol] = d.substring(4, 4) + "-" +
                  d.substring(2, 2) + "-" +
                  d.substring(0, 2) + " ";
              }
            } else if ((col = findColumn("yyyymmdd")) != -1) {
              for (i = 1; i < results.data.length; i++) {
                d = results.data[i][col];
                results.data[i][dateCol] = d.substring(0, 4) + "-" +
                  d.substring(4, 2) + "-" +
                  d.substring(6, 2) + " ";
              }
            } else if ((col = findColumn("year")) != -1) {
              var yearcol = col;
              var monthcol = findColumn("month");
              var daycol = findColumn("day");
              for (i = 1; i < results.data.length; i++) {
                results.data[i][dateCol] = results.data[i][yearcol] + "-" +
                  results.data[i][monthcol] + "-" +
                  results.data[i][daycol] + " ";
              }
            } else {
              alert(_("Error: Unknown Date/Time format"));
              return;
            }

            if ((col = findColumn("hh:mm")) != -1) {
              for (i = 1; i < results.data.length; i++) {
                results.data[i][dateCol] += results.data[i][col];
              }
            } else if ((col = findColumn("hhmm")) != -1) {
              for (i = 1; i < results.data.length; i++) {
                results.data[i][dateCol] +=
                  results.data[i][col].substring(0, 2) + ":" +
                  results.data[i][col].substring(2, 2);
              }
            } else if ((col = findColumn("hour")) != -1) {
              var minutecol = findColumn("minute");
              for (i = 1; i < results.data.length; i++) {
                results.data[i][dateCol] += results.data[i][col] + ":" +
                  results.data[i][minutecol];
              }
            }
          }

          var depthCol = findColumn("Depth");
          var depthunit = new RegExp(/\[(.*)\]/).exec(headerLine[depthCol])[1];
          var datacols = [];
          var dataheaders = [];
          for (i = depthCol + 1; i < headerLine.length; i++) {
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
          for (i = 1; i < results.data.length; i++) {
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
            for (var j of datacols) {
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
    var pointFiles = this.state.pointFiles.map(function(d) {
      return <MenuItem eventKey={d.id} key={d.id}>{d.name}</MenuItem>;
    });
    var lineFiles = this.state.lineFiles.map(function(d) {
      return <MenuItem eventKey={d.id} key={d.id}>{d.name}</MenuItem>;
    });
    var areaFiles = this.state.areaFiles.map(function(d) {
      return <MenuItem eventKey={d.id} key={d.id}>{d.name}</MenuItem>;
    });

    _("Drifters");
    _("Reset Map");
    _("Link");

    return (
      <div className='MapToolbar'
>
        <SplitButton
          name="point"
          id="point"
          onClick={this.buttonHandler.bind(this)}
          title={<span><Icon icon="pencil" /> {_("Point")}</span>}
          onSelect={this.pointSelect.bind(this)}
        >
          {pointFiles}
          <MenuItem divider />
          <MenuItem
            eventKey='observation'
            key='observation'
          ><Icon icon='list'/> {_("Observations…")}</MenuItem>
          <MenuItem divider />
          <MenuItem
            eventKey='draw'
            key='draw'
          ><Icon icon="pencil" /> {_("Draw on Map")}</MenuItem>
          <MenuItem
            eventKey='custom'
            key='custom'
          ><Icon icon="upload" /> {_("Upload CSV…")}</MenuItem>
          <MenuItem
            eventKey='odv'
            key='odv'
          ><Icon icon="upload" /> {_("Upload ODV…")}</MenuItem>
        </SplitButton>
        <SplitButton name="line" id="line" onClick={this.buttonHandler.bind(this)} title={<span><Icon icon="pencil" /> {_("Line")}</span>} onSelect={this.lineSelect.bind(this)}>
          {lineFiles}
          <MenuItem divider />
          <MenuItem
            eventKey='draw'
            key='draw'
          ><Icon icon="pencil" /> {_("Draw on Map")}</MenuItem>
          <MenuItem
            eventKey='custom'
            key='custom'
          ><Icon icon="upload" /> {_("Upload CSV…")}</MenuItem>
        </SplitButton>
        <SplitButton
          name="area"
          id="area"
          onClick={this.buttonHandler.bind(this)}
          title={<span><Icon icon="pencil" /> {_("Area")}</span>}
          onSelect={this.areaSelect.bind(this)}
        >
          {areaFiles}
          <MenuItem divider />
          <MenuItem
            eventKey='draw'
            key='draw'
          ><Icon icon="pencil" /> {_("Draw on Map")}</MenuItem>
          <MenuItem
            eventKey='custom'
            key='custom'
          ><Icon icon="upload" /> {_("Upload CSV…")}</MenuItem>
        </SplitButton>
        <Button
          name="class4"
          onClick={this.class4ButtonHandler.bind(this)}
          ref={(b) => this.class4button = b}
        >{_("Class4")} <span className='caret'/></Button>
        <DropdownButton
          name="drifter"
          id="drifter"
          title={_("Drifters")}
          onSelect={this.drifterSelect.bind(this)}
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
          <MenuItem
            eventKey='select'
            key='select'
          ><Icon icon='list'/> {_("Select…")}</MenuItem>
        </DropdownButton>
        <Button
          name="plot"
          onClick={this.buttonHandler.bind(this)}
          disabled={!this.props.plotEnabled}
        ><Icon icon='line-chart' /> {_("Plot")}</Button>
        <Button
          name="reset"
          onClick={this.buttonHandler.bind(this)}
        ><Icon icon='undo' alt={_("Reset Map")} /></Button>

        <span style={{"float": "right"}} title={_("Permalink")}>
          <Button
            name="permalink"
            onClick={this.buttonHandler.bind(this)}
          ><Icon icon='link' alt={_("Link")} /></Button>
        </span>

        <form ref={(f) => this.fileform = f}>
          <input
            type='file'
            style={{"display": "none"}}
            onChange={this.parseCSV.bind(this)}
            ref={(f) => this.fileinput = f}
            accept=".csv,.CSV"
          />
        </form>

        <form ref={(f) => this.odvform = f}>
          <input
            type='file'
            style={{"display": "none"}}
            onChange={this.parseODV.bind(this)}
            ref={(f) => this.odvinput = f}
            accept=".txt,.TXT"
          />
        </form>

        <div
          ref={(d) => this.class4div = d}
          style={{"position": "fixed", "zIndex": 1}}
        />

        <Modal
          show={this.state.showDriftersSelect}
          onHide={() => this.setState({showDriftersSelect: false})}
          dialogClassName="drifter-modal">
          <Modal.Header closeButton>
            <Modal.Title>{_("Select Drifters")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <DrifterSelector
              select={this.drifterSelection.bind(this)}
              state={this.state.drifterList}/>
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={() => this.setState({showDriftersSelect: false})}
            ><Icon icon="close" /> {_("Close")}</Button>
            <Button
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
              select={this.observationSelection.bind(this)}
              state={this.state.observationSelection}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={() => this.setState({showObservationSelect: false})}
            ><Icon icon="close" /> {_("Close")}</Button>
            <Button
              onClick={function() {
                this.observationSelect(this.state.observationSelection);
                this.setState({showObservationSelect: false});
              }.bind(this)}
            ><Icon icon="check" /> {_("Apply")}</Button>
          </Modal.Footer>
        </Modal>
      </div>
    );
  }
}

export default MapToolbar;

