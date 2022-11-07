import React from "react";
import Map from "./Map.jsx";
import MapInputs from "./MapInputs.jsx";
import MapToolbar from "./MapToolbar.jsx";
import PointWindow from "./PointWindow.jsx";
import LineWindow from "./LineWindow.jsx";
import AreaWindow from "./AreaWindow.jsx";
import TrackWindow from "./TrackWindow.jsx";
import Class4Window from "./Class4Window.jsx";
import Permalink from "./Permalink.jsx";
import Options from "./Options.jsx";
import WarningBar from "./WarningBar.jsx";
import {Button, Modal} from "react-bootstrap";
import Icon from "./lib/Icon.jsx";
import Iframe from "react-iframe";
import ReactGA from "react-ga";

import { DATASET_DEFAULTS, DEFAULT_OPTIONS } from "./Defaults.js";

import { withTranslation } from "react-i18next";

import { GetTimestampsPromise } from "../remote/OceanNavigator.js";

const stringify = require("fast-stable-stringify");

function formatLatLon(latitude, longitude) {
  latitude = (latitude >90) ? 90: latitude;
  latitude = (latitude <-90) ? -90: latitude;
  longitude = (longitude >180) ? longitude -360: longitude;
  longitude = (longitude <-180) ? 360+longitude: longitude;
  let formatted = "";
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

    ReactGA.ga("send", "pageview");

    this.DEF_INTERP_TYPE = Object.freeze("gaussian");
    this.DEF_INTERP_RADIUS_KM = Object.freeze(25);
    this.DEF_INTERP_NUM_NEIGHBOURS = Object.freeze(10);

    this.state = {
      ...DATASET_DEFAULTS,
      plotEnabled: false, // "Plot" button in MapToolbar
      projection: "EPSG:3857", // Map projection
      showModal: false,
      vectortype: null,
      vectorid: null,
      busy: false, // Controls if the busyModal is visible
      basemap: "topo",
      showHelp: false,
      showCompareHelp: false,
      extent: [],
      setDefaultScale: false,
      dataset_compare: false, // Controls if compare mode is enabled
      dataset_1: {
        ...DATASET_DEFAULTS,
      },
      syncRanges: false, // Clones the variable range from one view to the other when enabled
      sidebarOpen: true, // Controls sidebar opened/closed status
      options: {
        ...DEFAULT_OPTIONS
      },
      showObservationSelect: false,
      observationArea: [],
    };

    this.mapComponent = null;
    this.mapComponent2 = null;

    this.prevOptions = this.state.options;

    if (window.location.search.length > 0) {
      try {
        const querystate = JSON.parse(decodeURIComponent(window.location.search.replace("?query=", "")));
        $.extend(this.state, querystate);
      } catch(err) {
        console.error(err);
      }
      let url = window.location.origin;
      if (window.location.pathname != undefined) {
        url += window.location.pathname;
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

    // Function bindings (performance optimization)
    this.toggleSidebar = this.toggleSidebar.bind(this);
    this.toggleCompareHelp = this.toggleCompareHelp.bind(this);
    this.swapViews = this.swapViews.bind(this);
    this.updateState = this.updateState.bind(this);
    this.action = this.action.bind(this);
    this.closeModal = this.closeModal.bind(this);
    this.generatePermLink = this.generatePermLink.bind(this);
    this.updateOptions = this.updateOptions.bind(this);
    this.setStartTime = this.setStartTime.bind(this);
    this.removeMapInteraction = this.removeMapInteraction.bind(this);
  }

  // Opens/closes the sidebar state
  toggleSidebar() {
    this.setState({sidebarOpen: !this.state.sidebarOpen});
  }

  // Opens/closes the help modal for dataset comparison
  toggleCompareHelp() {
    this.setState({showCompareHelp: !this.state.showCompareHelp,});
  }

  // Swap all view-related state variables
  swapViews() {
    const newState = this.state;
    // "destructuring" from ES2015
    [newState.dataset, newState.dataset_1.dataset] = [newState.dataset_1.dataset, newState.dataset];    
    [newState.variable, newState.dataset_1.variable] = [newState.dataset_1.variable, newState.variable];
    [newState.depth, newState.dataset_1.depth] = [newState.dataset_1.depth, newState.depth];
    [newState.time, newState.dataset_1.time] = [newState.dataset_1.time, newState.time];
    [newState.scale, newState.scale_1] = [newState.scale_1, newState.scale];
    [newState.variable_scale, newState.dataset_1.variable_scale] = [newState.dataset_1.variable_scale, newState.variable_scale];
    [newState.starttime, newState.dataset_1.starttime] = [newState.dataset_1.starttime, newState.starttime];

    this.setState(newState);
  }

  // Turns off map drawing
  removeMapInteraction(type = "all") {
     if (this.mapComponent){
      this.mapComponent.removeMapInteractions(type);
    }
    if (this.mapComponent2) {
      this.mapComponent2.removeMapInteractions(type);
    }
  }

  updateOptions(newOptions) {
    let options = null;
    if (newOptions == null) {
      options = this.prevOptions;
    }
    else {
      options = Object.assign({}, this.state.options);
      this.prevOptions = this.state.options;
      options.interpType = newOptions.interpType ? newOptions.interpType : options.interpType;
      options.interpRadius = newOptions.interpRadius ? newOptions.interpRadius : options.interpRadius;
      options.interpNeighbours = newOptions.interpNeighbours ? newOptions.interpNeighbours : options.interpNeighbours;
      options.mapBathymetryOpacity = newOptions.mapBathymetryOpacity ? newOptions.mapBathymetryOpacity : options.mapBathymetryOpacity;
      options.bathymetry = newOptions.bathymetry ? newOptions.bathymetry : options.bathymetry;
      options.topoShadedRelief = newOptions.topoShadedRelief ? newOptions.topoShadedRelief : options.topoShadedRelief;
      options.bathyContour = newOptions.bathyContour ? newOptions.bathyContour : options.bathyContour;
    }

    this.setState({options});
  }

  componentWillMount() {
    GetTimestampsPromise(DATASET_DEFAULTS.dataset, DATASET_DEFAULTS.variable).then(timeResult => {
      const defaults = {...DATASET_DEFAULTS};
      defaults.starttime = timeResult.data[0].id;
      defaults.time = timeResult.data[timeResult.data.length - 1].id;
      this.setState({ ...defaults,
                      dataset_1 : {...defaults}
                    });
    });     
  }

  // Updates global app state
  updateState(key, value) {
    if (key === "dataset_0" ) {
      this.setState(value);
      return;
    }

    if (key === "dataset_1") {
      this.setState({dataset_1: value});
      return;
    }

    let newState = {};

    // Only updating one value
    if (typeof(key) === "string") {
      if (this.state[key] === value) {

        // Value hasn't changed
        return;
      }
      
      // Store the updated value
      newState[key] = value;

      switch (key) {
        case "scale":
          const newScaleState = {
            variable_scale: value,
          };

          if (this.state.syncRanges) {
            newScaleState["dataset_1"] = {
              ...this.state.dataset_1,
              variable_scale: value,
            };
          }

          this.setState(newScaleState);
          return;
        case "scale_1":
          const newScale_1State = {
            dataset_1: {
              ...this.state.dataset_1,
              variable_scale: value,
            }
          };

          if (this.state.syncRanges) {
            newScale_1State["variable_scale"] = value;
          }

          this.setState(newScale_1State);
          return;
        case "showObservationSelect":
          if (!value) {
            newState['observationArea'] = [];
          }
          break;
      }

    }
    else {
      for (let i = 0; i < key.length; ++i) {
        switch(key[i]) {
          case "time":
            if (value[i] !== undefined) {
              newState.time = value[i];
            }
            break;
          default:
            newState[key[i]] = value[i];
        }
      }
    }
    this.setState(newState);
  }

  setStartTime(time) {
    if (time.length > 24) {
      return time[time.length - 25].id;
    }
    return time[0].id;
  }

  action(name, arg, arg2, arg3) {
    switch(name) {
      case "obs_point":
        // Enable point selection in both maps
        this.mapComponent.obs_point();
        if (this.mapComponent2) {
          this.mapComponent2.obs_point();
        }
        break;
      case "obs_area":
        if (typeof(arg) === "object") {
          this.setState({
            observationArea: arg,
            showObservationSelect: true,
          });
        } else {
          // Enable point selection in both maps
          this.mapComponent.obs_area();
          if (this.mapComponent2) {
            this.mapComponent2.obs_area();
          }
        }
        break;
      case "point":
        if (typeof(arg) === "object") {
          // The EnterPoint component correctly orders the coordinate
          // pair, so no need to swap it.
          if (arg2 === "enterPoint") {
            this.setState({
              point: [[arg[0], arg[1]]],
              modal: "point",
              names: [],
            });       
            this.showModal();
          }
          // Drawing on the map results in a reversed coordinate pair
          // so swap it.
          else {
            this.setState({
              point: arg,
              modal: "point",
              names: [],
            });
          }

          ReactGA.event({
            category: "PointPlot",
            action: "click",
            label: "PointPlot"
          });
        } 
        else {
          // Enable point selection in both maps
          this.mapComponent.point();
          if (this.mapComponent2) {
            this.mapComponent2.point();
          }
        }
        break;
      case "line":
        if (typeof(arg) === "object") {
          this.setState({
            line: arg,
            modal: "line",
            names: [],
          });

          // Disable line drawing in both maps
          this.removeMapInteraction("Line");
          ReactGA.event({
            category: "LinePlot",
            action: "click",
            label: "LinePlot"
          });

          this.showModal();
        } else {
          // Enable line drawing in both maps
          this.mapComponent.line();
          if (this.mapComponent2) {
            this.mapComponent2.line();
          }
        }
        break;
      case "area":        
        if (typeof(arg) === "object") {
          // Disable area drawing on both maps
          this.setState({
            area: arg,
            modal: "area",
            names: [],
          });
          this.removeMapInteraction("Area");
          ReactGA.event({
            category: "AreaPlot",
            action: "click",
            label: "AreaPlot"
          });
          this.showModal();
        } else {
          // Enable area drawing on both maps
          this.mapComponent.area();
          if (this.mapComponent2) {
            this.mapComponent2.area();
          }
        }
        break;
      case "track":
        this.setState({
          track: arg,
          modal: "track",
          names: arg,
        });
        ReactGA.event({
          category: "TrackPlot",
          action: "click",
          label: "TrackPlot"
        });
        this.showModal();
        break;
      case "show":
        this.mapComponent.show(arg, arg2);
        if (this.mapComponent2) {
          this.mapComponent2.show(arg, arg2);
        }
        if (arg === 'class4') {
          this.setState({class4type : arg3})
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
        if (arg !== null) {
          this.setState({
            subquery: arg,
            showPermalink: true,
          });
        }
        else {
          this.setState({
            showPermalink: true,
          });
        }
        break;
      case "options":
        this.setState({showOptions: true,});
        break;
      case "help":
        this.setState({ showHelp: true,});
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

  generatePermLink(subquery, permalinkSettings) {
    let query = {};
    // We have a request from Point/Line/AreaWindow component.
    if (this.state.subquery !== undefined) {
      query.subquery = this.state.subquery;
      query.showModal = true;
      query.modal = this.state.modal;
      query.names = this.state.names;
      // Hacky fix to remove a third "null" array member from corrupting
      // permalink URL.
      if (this.state.modal === "point" && this.state.point[0].length === 3) {
        query.point = [this.state.point[0].slice(0, 2)];
      }
      else {
        query[this.state.modal] = this.state[this.state.modal];
      }
    }
    // We have a request from the Permalink component.
    for (let setting in permalinkSettings) {
      if (permalinkSettings[setting] === true) {
        query[setting] = this.state[setting];
      }
    }

    return window.location.origin + window.location.pathname +
      `?query=${encodeURIComponent(stringify(query))}`;
  }

  render() {
    let modalContent = "";
    let modalTitle = "";

    switch (this.state.modal) {
      case "point":
        modalContent = (
          <PointWindow
            dataset_0={this.state}
            point={this.state.point}
            names={this.state.names}
            onUpdate={this.updateState}
            onUpdateOptions={this.updateOptions}
            init={this.state.subquery}
            dataset_compare={this.state.dataset_compare}
            dataset_1={this.state.dataset_1}
            action={this.action}
            showHelp={this.toggleCompareHelp}
            swapViews={this.swapViews}
            options={this.state.options}
          />
        );
        modalTitle = this.state.point.map(p => formatLatLon(p[0], p[1]))
        modalTitle = modalTitle.join(", ")
        break;
      case "line":
        modalContent = (
          <LineWindow
            dataset_0={this.state}
            line={this.state.line}
            colormap={this.state.colormap}
            names={this.state.names}
            onUpdate={this.updateState}
            onUpdateOptions={this.updateOptions}
            init={this.state.subquery}
            dataset_compare={this.state.dataset_compare}
            dataset_1={this.state.dataset_1}
            action={this.action}
            showHelp={this.toggleCompareHelp}
            swapViews={this.swapViews}
            options={this.state.options}
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
            area={this.state.area}
            colormap={this.state.colormap}
            names={this.state.names}
            projection={this.state.projection}
            onUpdate={this.updateState}
            onUpdateOptions={this.updateOptions}
            init={this.state.subquery}
            dataset_compare={this.state.dataset_compare}
            dataset_1={this.state.dataset_1}
            showHelp={this.toggleCompareHelp}
            action={this.action}
            swapViews={this.swapViews}
            options={this.state.options}
          />
        );

        modalTitle = "";
        break;
      case "track":
        modalContent = (
          <TrackWindow
            dataset={this.state.dataset}
            quantum={this.state.quantum}
            track={this.state.track}
            variable={this.state.variable}
            scale={this.state.variable_scale}
            names={this.state.names}
            depth={this.state.depth}
            onUpdate={this.updateState}
            init={this.state.subquery}
            action={this.action}
            obs_query={this.state.vectorid}
          />
        );

        modalTitle = "";
        break;
      case "class4":
        modalContent = (
          <Class4Window
            dataset={this.state.dataset}
            class4id={this.state.class4}
            class4type={this.state.class4type}
            calss4type={this.state.modal}
            init={this.state.subquery}
            action={this.action}
          />
        );
        modalTitle = "";
        break;
    }
    if (this.state.modal !== "point" && this.state.names && this.state.names.length > 0) {
      modalTitle = this.state.names.slice(0).sort().join(", ");
    }

    _("Loading");

    const contentClassName = this.state.sidebarOpen ? "content open" : "content";
    
    // Pick which map we need
    let map = null;
    if (this.state.dataset_compare) {
      
      const secondState = $.extend(true, {}, this.state);
      for (let i = 0; i < Object.keys(this.state.dataset_1).length; ++i) {
        const keys = Object.keys(this.state.dataset_1);
        secondState[keys[i]] = this.state.dataset_1[keys[i]];
      }
      map = <div className='multimap'>
        <Map
          ref={(m) => this.mapComponent = m}
          state={this.state}
          action={this.action}
          updateState={this.updateState}
          partner={this.mapComponent2}
          scale={this.state.variable_scale}
          options={this.state.options}
          quiverVariable={this.state.quiverVariable}
        />
        <Map
          ref={(m) => this.mapComponent2 = m}
          state={secondState}
          action={this.action}
          updateState={this.updateState}
          partner={this.mapComponent}
          scale={this.state.dataset_1.variable_scale}
          options={this.state.options}
        />
      </div>;
    } 
    else {
      map = <Map
        ref={(m) => this.mapComponent = m}
        state={this.state}
        action={this.action}
        updateState={this.updateState}
        scale={this.state.variable_scale}
        options={this.state.options}
        quiverVariable={this.state.quiverVariable}
      />;
    }

    return (
      <div className='OceanNavigator'>
        <MapInputs
          state={this.state}
          swapViews={this.swapViews}
          changeHandler={this.updateState}
          showHelp={this.toggleCompareHelp}
          options={this.state.options}
          updateOptions={this.updateOptions}
          extent={this.state.extent}
          projection={this.state.projection}
          basemap={this.state.basemap}
          dataset_compare={this.state.dataset_compare}
          sidebarOpen={this.state.sidebarOpen}
        />
        <div className={contentClassName}>
          <MapToolbar
            action={this.action}
            plotEnabled={this.state.plotEnabled}
            dataset_compare={this.state.dataset_compare}
            updateState={this.updateState}
            toggleSidebar={this.toggleSidebar}
            toggleOptionsSidebar={this.toggleOptionsSidebar}
            showObservationSelect={this.state.showObservationSelect}
            observationArea={this.state.observationArea}
            disablePlotInteraction={this.removeMapInteraction}
          />
          <WarningBar />
          {map}
        </div>

        <Modal
          show={this.state.showModal}
          onHide={this.closeModal}
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
              onClick={this.closeModal}
            ><Icon icon="close" alt={_("Close")}/> {_("Close")}</Button>
          </Modal.Footer>
        </Modal>

        <Modal
          show={this.state.showPermalink}
          onHide={() => this.setState({showPermalink: false})}
          dialogClassName='permalink-modal'
          backdrop={true}
        >
          <Modal.Header closeButton closeLabel={_("Close")}>
            <Modal.Title><Icon icon="link" alt={_("Share Link")}/> {_("Share Link")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Permalink
              generatePermLink={this.generatePermLink}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={() => this.setState({showPermalink: false})}
            ><Icon icon="close" alt={_("Close")}/> {_("Close")}</Button>
          </Modal.Footer>
        </Modal>

        <Modal
          show={this.state.showOptions}
          onHide={() => this.setState({showOptions: false})}
          dialogClassName='permalink-modal'
          backdrop={true}
        >
          <Modal.Header closeButton closeLabel={_("Close")}>
            <Modal.Title><Icon icon="gear" alt={_("Options")}/> {_("Options")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Options 
              options={this.state.options}
              updateOptions={this.updateOptions}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={() => this.setState({showOptions: false})}
            ><Icon icon="close" alt={_("Close")}/> {_("Close")}</Button>
          </Modal.Footer>
        </Modal>

        <Modal
          show={this.state.showHelp}
          onHide={() => this.setState({showHelp: false})}
          dialogClassName='full-screen-modal'
          backdrop={true}
        >
          <Modal.Header closeButton closeLabel={_("Close")}>
            <Modal.Title><Icon icon="question" alt={_("Help")}/> {_("Help")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Iframe 
              url="https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/"
              height="768px"
              position="relative"
            />
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={() => this.setState({showHelp: false})}
            ><Icon icon="close" alt={_("Close")}/> {_("Close")}</Button>
          </Modal.Footer>
        </Modal>

        <Modal
          show={this.state.showCompareHelp}
          onHide={this.toggleCompareHelp}
          bsSize="large"
          dialogClassName="helpdialog"
          backdrop={true}
        >
          <Modal.Header closeButton closeLabel={_("Close")}>
            <Modal.Title>{_("Compare Datasets Help")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={this.toggleCompareHelp}><Icon icon="close" alt={_("Close")}/> {_("Close")}</Button>
          </Modal.Footer>
        </Modal>
      </div>
    );
  }
}

export default withTranslation()(OceanNavigator);
