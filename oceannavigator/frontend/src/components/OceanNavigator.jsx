import React from "react";
import Map from "./Map.jsx";
import MapInputs from "./MapInputs.jsx";
import MapToolbar from "./MapToolbar.jsx";
import PointWindow from "./PointWindow.jsx";
import LineWindow from "./LineWindow.jsx";
import AreaWindow from "./AreaWindow.jsx";
import DrifterWindow from "./DrifterWindow.jsx";
import Class4Window from "./Class4Window.jsx";
import {Button, Modal} from "react-bootstrap";
import Icon from "./Icon.jsx";
var i18n = require("../i18n.js");

var LOADING_IMAGE = require("../images/bar_loader.gif");

function formatLatLon(latitude, longitude) {
  var formatted = "";
  formatted += Math.abs(latitude).toFixed(4) + " ";
  formatted += (latitude >= 0) ? "N" : "S";
  formatted += ", ";
  formatted += Math.abs(longitude).toFixed(4) + " ";
  formatted += (longitude >= 0) ? "E" : "W";
  return formatted;
}

class OceanNavigator extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      dataset: "giops_day",
      variable: "votemper",
      variable_scale: "-5,30",
      depth: 0,
      time: -1,
      scale: "-5,30",
      plotEnabled: false,
      projection: "EPSG:3857",
      showModal: false,
      vectortype: null,
      vectorid: null,
      busy: false,
      basemap: "topo",
      bathymetry: true,
      extent: [],
      dataset_compare: false,
      dataset_1: {
        dataset: "giops_day",
        variable: "votemper",
        depth: 0,
        time: -1,
      },
      sidebarOpen: true,
    };
    this.mapComponent = null;
    this.mapComponent2 = null;

    var preload = new Image();
    preload.src = LOADING_IMAGE;

    if (window.location.search.length > 0) {
      try {
        var querystate = JSON.parse(
                        decodeURIComponent(
                            window.location.search.replace("?query=", ""))
                        );
        $.extend(this.state, querystate);
      } catch(err) {
        console.error(err);
      }
      var url = window.location.origin;
      if (window.location.path != undefined) {
        url = url + window.location.path;
      }
      window.history.replaceState(null, null, url);
    }

    window.onpopstate = function(event) {
      if (event.state) {
        this.setState({
          showModal: false
        });
      }
    }.bind(this);
  }

  toggleSidebar() {
    this.setState({sidebarOpen: !this.state.sidebarOpen});
  }

  updateState(key, value) {
    var newState = {};
    var i;
    if (typeof(key) === "string") {
      if (this.state[key] == value) {
        return;
      }

      newState[key] = value;

      if (key == "time") {
        if (typeof(value) == "undefined") {
          return;
        }
      } else if (key == "variable_scale") {
        newState.scale = value;
      } else if (key == "dataset_0") {
        if (value.dataset != this.state.dataset) {
          this.changeDataset(value.dataset, value);
          return;
        } else {
          newState = value;
          if (value.variable_scale != this.state.scale) {
            newState.scale = value.variable_scale;
          }
        }
      }
    } else {
      for (i = 0; i < key.length; i++) {
        switch(key[i]) {
          case "variable_scale":
            newState.scale = value[i];
            break;
          case "time":
            if (value[i] != undefined) {
              newState.time = value[i];
            }
            break;
          default:
            newState[key[i]] = value[i];
        }
      }
    }

    if (key == "dataset" && this.state.dataset != value) {
      this.changeDataset(value);
      return;
    } else if ($.inArray("dataset", key) != -1) {
      var state = {};
      var dataset = "";
      for (i = 0; i < key.length; i++) {
        if (key[i] == "dataset") {
          dataset = value[i];
        } else {
          state[key[i]] = value[i];
        }
      }
      this.changeDataset(dataset, state);
      return;
    }
    this.setState(newState);
  }

  changeDataset(dataset, state) {
    this.setState({
      busy: true,
    });
    // When dataset changes, so does time & variable list
    var var_promise = $.ajax("/api/variables/?dataset=" + dataset).promise();
    var time_promise = $.ajax(
      "/api/timestamp/" +
      this.state.dataset + "/" +
      this.state.time + "/" +
      dataset
    ).promise();
    $.when(var_promise, time_promise).done(function(v, t) {
      var newvariable = this.state.variable;
      if ($.inArray(this.state.variable, v[0].map(function(e) {
        return e.id;
      })) == -1) {
        newvariable = v[0][0].id;
      }

      if (state === undefined) {
        state = {};
      }

      state.dataset = dataset;
      state.variable = newvariable;
      state.time = t[0];
      state.busy = false;

      this.setState(state);
    }.bind(this));
  }
  action(name, arg, arg2, arg3) {
    switch(name) {
      case "point":
        if (typeof(arg) === "object") {
          this.setState({
            point: [[arg[1], arg[0]]],
            modal: "point",
            names: [],
          });

          this.showModal();
        } else {
          this.mapComponent.point();
        }
        break;
      case "line":
        if (typeof(arg) === "object") {
          this.setState({
            line: arg,
            modal: "line",
            names: [],
          });

          this.showModal();
        } else {
          this.mapComponent.line();
        }
        break;
      case "area":
        if (typeof(arg) === "object") {
          this.setState({
            area: arg,
            modal: "area",
            names: [],
          });

          this.showModal();
        } else {
          this.mapComponent.area();
        }
        break;
      case "drifter":
        this.setState({
          drifter: arg,
          modal: "drifter",
          names: arg,
        });

        this.showModal();
        break;
      case "show":
        this.mapComponent.show(arg, arg2);
        if (this.mapComponent2) {
          this.mapComponent2.show(arg, arg2);
        }
        break;
      case "add":
        this.mapComponent.add(arg, arg2, arg3);
        if (this.mapComponent2) {
          this.mapComponent2.add(arg, arg2, arg3);
        }
        break;
      case "plot":
        this.showModal();
        break;
      case "reset":
        this.mapComponent.resetMap();
        if (this.mapComponent2) {
          this.mapComponent2.resetMap();
        }
        break;
      case "permalink":
        this.setState({
          showPermalink: true,
        });
        break;
      default:
        console.error("Undefined", name, arg);
        break;
    }
  }
  showModal() {
    this.setState({
      showModal: true
    });
  }
  closeModal() {
    if (this.state.subquery) {
      this.setState({
        subquery: null,
        showModal: false,
      });
    } else {
      window.history.back();
    }
  }
  componentDidUpdate(prevProps, prevState) {
    if (this.state.showModal && !prevState.showModal) {
      window.history.replaceState(prevState, null, null);
      window.history.pushState(null, null, null);
    }
  }
  generatePermLink(subquery) {
    var query = {
      center: this.state.center,
      zoom: this.state.zoom,
      dataset: this.state.dataset,
      projection: this.state.projection,
      time: this.state.time,
      variable: this.state.variable,
      scale: this.state.scale,
      vectortype: this.state.vectortype,
      vectorid: this.state.vectorid,
    };
    if (subquery != undefined) {
      query["subquery"] = subquery;
      query["showModal"] = true;
      query["modal"] = this.state.modal;
      query["names"] = this.state.names;
      query[this.state.modal] = this.state[this.state.modal];
    }

    return window.location.origin +
      window.location.pathname +
      `?query=${encodeURIComponent(JSON.stringify(query))}`;
  }
  render() {
    var action = this.action.bind(this);
    var modalContent = "";
    var modalTitle = "";
    switch (this.state.modal) {
      case "point":
        modalContent = (
          <PointWindow
            dataset={this.state.dataset}
            quantum={this.state.dataset_quantum}
            point={this.state.point}
            variable={this.state.variable}
            depth={this.state.depth}
            time={this.state.time}
            starttime={this.state.starttime}
            scale={this.state.scale}
            colormap={this.state.colormap}
            names={this.state.names}
            onUpdate={this.updateState.bind(this)}
            generatePermLink={this.generatePermLink.bind(this)}
            init={this.state.subquery}
            dataset_compare={this.state.dataset_compare}
            dataset_1={this.state.dataset_1}
          />
        );
        modalTitle = formatLatLon(
          this.state.point[0][0],
          this.state.point[0][1]
        );
        break;
      case "line":
        modalContent = (
          <LineWindow
            dataset_0={this.state}
            quantum={this.state.dataset_quantum}
            line={this.state.line}
            time={this.state.time}
            variable={this.state.variable}
            scale={this.state.scale}
            colormap={this.state.colormap}
            names={this.state.names}
            depth={this.state.depth}
            onUpdate={this.updateState.bind(this)}
            generatePermLink={this.generatePermLink.bind(this)}
            init={this.state.subquery}
            dataset_compare={this.state.dataset_compare}
            dataset_1={this.state.dataset_1}
          />
        );

        modalTitle = "(" + this.state.line[0].map(function(ll) {
          return formatLatLon(ll[0], ll[1]);
        }).join("), (") + ")";
        break;
      case "area":
        modalContent = (
          <AreaWindow
            dataset_0={this.state}
            quantum={this.state.dataset_quantum}
            area={this.state.area}
            time={this.state.time}
            variable={this.state.variable}
            scale={this.state.scale}
            colormap={this.state.colormap}
            names={this.state.names}
            depth={this.state.depth}
            projection={this.state.projection}
            onUpdate={this.updateState.bind(this)}
            generatePermLink={this.generatePermLink.bind(this)}
            init={this.state.subquery}
            dataset_compare={this.state.dataset_compare}
            dataset_1={this.state.dataset_1}
          />
        );

        modalTitle = "";
        break;
      case "drifter":
        modalContent = (
          <DrifterWindow
            dataset={this.state.dataset}
            quantum={this.state.dataset_quantum}
            drifter={this.state.drifter}
            variable={this.state.variable}
            scale={this.state.scale}
            names={this.state.names}
            depth={this.state.depth}
            onUpdate={this.updateState.bind(this)}
            generatePermLink={this.generatePermLink.bind(this)}
            init={this.state.subquery}
          />
        );

        modalTitle = "";
        break;
      case "class4":
        modalContent = (
          <Class4Window
            class4id={this.state.class4}
            generatePermLink={this.generatePermLink.bind(this)}
            init={this.state.subquery}
          />
        );
        modalTitle = "";
        break;
    }
    if (this.state.names && this.state.names.length > 0) {
      modalTitle = this.state.names.slice(0).sort().join(", ");
    }

    var permalinkModalEntered = function() {
      this.permalinkbox.style.height = this.permalinkbox.scrollHeight + 5 + "px";
      this.permalinkbox.select();
    }.bind(this);

    _("Loading");

    const contentClassName = this.state.sidebarOpen ? 'content open' : 'content';


    var map = <Map
      ref={(m) => this.mapComponent = m}
      state={this.state}
      action={action}
      updateState={this.updateState.bind(this)}
    />;
    var secondState = $.extend(true, {}, this.state);
    for (var i=0; i < Object.keys(this.state.dataset_1).length; i++) {
      var keys = Object.keys(this.state.dataset_1);
      secondState[keys[i]] = this.state.dataset_1[keys[i]];
    }
    var multimap = <div className='multimap'>
      <Map
        ref={(m) => this.mapComponent = m}
        state={this.state}
        action={action}
        updateState={this.updateState.bind(this)}
        partner={this.mapComponent2}
      />
      <Map
        ref={(m) => this.mapComponent2 = m}
        state={secondState}
        action={action}
        updateState={this.updateState.bind(this)}
        partner={this.mapComponent}
      />
    </div>;

    var theMap = map;
    if (this.state.dataset_compare) {
      theMap = multimap;
    }

          // <Map
          //   ref={(m) => this.mapComponent = m}
          //   state={this.state}
          //   action={action}
          //   updateState={this.updateState.bind(this)}
          // />

    return (
      <div className='OceanNavigator'>
        <MapInputs
          state={this.state}
          changeHandler={this.updateState.bind(this)}
        />
        <div className={contentClassName}>
          <MapToolbar
          action={action}
          plotEnabled={this.state.plotEnabled}
          toggleSidebar={this.toggleSidebar.bind(this)}
          />
          {theMap}
        </div>

        <Modal
          show={this.state.showModal}
          onHide={this.closeModal.bind(this)}
          dialogClassName='full-screen-modal'
          backdrop={true}
        >
          <Modal.Header closeButton closeLabel={_("Close")}>
            <Modal.Title>{modalTitle}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {modalContent}
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={this.closeModal.bind(this)}
            ><Icon icon="close" /> {_("Close")}</Button>
          </Modal.Footer>
        </Modal>

        <Modal
          show={this.state.showPermalink}
          onHide={() => this.setState({showPermalink: false})}
          dialogClassName='permalink-modal'
          onEntered={permalinkModalEntered}
          backdrop={true}
        >
          <Modal.Header closeButton closeLabel={_("Close")}>
            <Modal.Title>{_("Share Link")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <textarea
              ref={(t) => this.permalinkbox = t}
              type="text"
              id="permalink_area"
              readOnly
              value={this.generatePermLink()}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={function() {
                this.permalinkbox.select();
                if ($("html").hasClass("ie")) {
                  var copied = window.clipboardData.getData("Text");
                  if (copied != this.permalinkbox.value) {
                    alert(_("Clipboard access was denied. Please right-click and copy the link manually."));
                  }
                }
              }.bind(this)}><Icon icon="copy" /> {_("Copy")}</Button>
            <Button
              onClick={() => this.setState({showPermalink: false})}
            ><Icon icon="close" /> {_("Close")}</Button>
          </Modal.Footer>
        </Modal>

        <Modal show={this.state.busy} dialogClassName='busy-modal'>
          <Modal.Header>
            <Modal.Title>{_("Please Wait…")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <img src={LOADING_IMAGE} alt={_("Loading")} />
          </Modal.Body>
        </Modal>
      </div>
    );
  }
}

export default OceanNavigator;

