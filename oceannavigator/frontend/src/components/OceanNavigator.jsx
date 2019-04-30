import React from "react";
import Map from "./Map.jsx";
import ol from "openlayers";
import MapInputs from "./MapInputs.jsx";
import MapToolbar from "./MapToolbar.jsx";
import WarningBar from "./WarningBar.jsx";
import moment from "moment-timezone";
import LayerSelection from "./LayerSelection.jsx";
import Permalink from "./Permalink.jsx";
import Options from "./Options.jsx";
import {Button, Modal} from "react-bootstrap";
import Icon from "./Icon.jsx";
import Iframe from "react-iframe";
import ReactGA from "react-ga";
import ModalContainer from "./ModalContainer.jsx"

const i18n = require("../i18n.js");
const stringify = require("fast-stable-stringify");
const LOADING_IMAGE = require("../images/bar_loader.gif");

function formatLatLon(latitude, longitude) {
  let formatted = "";
  formatted += Math.abs(latitude).toFixed(4) + " ";
  formatted += (latitude >= 0) ? "N" : "S";
  formatted += ", ";
  formatted += Math.abs(longitude).toFixed(4) + " ";
  formatted += (longitude >= 0) ? "E" : "W";
  
  return formatted;
}

export default class OceanNavigator extends React.Component {
  constructor(props) {
    super(props);
    
    ReactGA.ga('send', 'pageview')

    this.state = {
      _firstLayer: true,
      _foundation: true,
      _environment: true,
      _intelligence: false,
      _derived: false,
      _planning: false,

      allowedTabs: {
        _foundation: true,
        _environment: true,
        _intelligence: false,
        _derived: false,
        _planning: false,
      },

      data: {},
      display: [
        {
          id: 'colour',
          value: 'Colour',
        },
        {
          id: 'contours',
          value: 'Contours',
        },
        {
          id: 'windbarbs',
          value: 'Wind Barbs (BETA)',
        }
      ],
      
      dataset: "giops_day",
      variable: "votemper",
      variable_scale: [-5,30], // Default variable range for left/Main Map
      depth: 0,

      // New Global Times
      timeSources: {},    // Time bar layers to create
      timestamps: {},                     // Holds the id and time for each timebar
      // ~~~~~~~~~~~~~~~~

      time: -1,
      starttime: -2, // Start time for Left Map
      scale: "-5,30", // Variable scale for left/Main Map
      scale_1: "-5,30", // Variable scale for Right Map
      plotEnabled: false, // "Plot" button in MapToolbar
      projection: "EPSG:3857", // Map projection
      showModal: false,
      layers: [],
      vectortype: null,
      vectorid: null,
      busy: false, // Controls if the busyModal is visible
      basemap: "topo",
      showHelp: false,
      showBugs: false,
      showCompareHelp: false,
      availableTypes: ['colour', 'contour', 'hatching'],
      extent: [],
      setDefaultScale: false,
      dataset_compare: false, // Controls if compare mode is enabled
      dataset_1: {
        dataset: "giops_day",
        variable: "votemper",
        depth: 0,
        time: -1,
        starttime: -2,  // Start time for Right Map
        variable_scale: [-5,30], // Default variable range for Right Map
      },
      syncRanges: false, // Clones the variable range from one view to the other when enabled
      sidebarOpen: true, // Controls sidebar opened/closed status
      options: {
        // Interpolation
        interpType: "gaussian",
        interpRadius: 25,
        interpNeighbours: 10,
        // Map
        mapBathymetryOpacity: 0.75, // Opacity of bathymetry contours
        topoShadedRelief: false,    // Show hill shading (relief mapping) on topography
        bathymetry: true,           // Show bathymetry contours
      },
    };



    this.mapComponent = null;
    this.mapComponent2 = null;

    const preload = new Image();
    preload.src = LOADING_IMAGE;

    if (window.location.search.length > 0) {
      try {
        const querystate = JSON.parse(decodeURIComponent(window.location.search.replace("?query=", "")));
        $.extend(this.state, querystate);
      } catch(err) {
        console.error(err);
      }
      let url = window.location.origin;
      if (window.location.path != undefined) {
        url += window.location.path;
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
    this.showBugsModal = this.showBugsModal.bind(this);
    this.hideBugsModal = this.hideBugsModal.bind(this);
    this.swapViews = this.swapViews.bind(this);
    this.updateState = this.updateState.bind(this);
    this.action = this.action.bind(this);
    this.closeModal = this.closeModal.bind(this);
    this.generatePermLink = this.generatePermLink.bind(this);
    this.updateOptions = this.updateOptions.bind(this);
    this.updateLanguage = this.updateLanguage.bind(this);
    this.updateScale = this.updateScale.bind(this);
    this.multiPointAction = this.multiPointAction.bind(this);
  }
  
  //Updates the page language upon user request
  updateLanguage() {
    this.forceUpdate();
  }

  // Opens/closes the sidebar state
  toggleSidebar() {
    this.setState({sidebarOpen: !this.state.sidebarOpen});
  }

  // Opens/closes the help modal for dataset comparison
  toggleCompareHelp() {
    this.setState({showCompareHelp: !this.state.showCompareHelp,});
  }

  hideBugsModal(){
    this.setState({showBugs: false,});
  }

  showBugsModal(){
    this.setState({showBugs: true,});
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
  removeMapInteraction(mode) {
    this.mapComponent.removeMapInteractions(mode);
    if (this.mapComponent2) {
      this.mapComponent2.removeMapInteractions(mode);
    }
  }

  updateOptions(newOptions) {
    let options = Object.assign({}, this.state.options);
    options.interpType = newOptions.interpType;
    options.interpRadius = newOptions.interpRadius;
    options.interpNeighbours = newOptions.interpNeighbours;
    options.mapBathymetryOpacity = newOptions.mapBathymetryOpacity;
    options.bathymetry = newOptions.bathymetry;
    options.topoShadedRelief = newOptions.topoShadedRelief;

    this.setState({options});
  }

  

  // Updates global app state
  updateState(key, value) {
    
    var newState = {};

    if (key === 'timeSources') {
      this.setState({
        timeSources: value
      })
    }
    if (key === 'timestamps') {
      this.setState({
        timestamps: value,
      })
    }
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
          this.updateScale(key, value);
          return;
        case "scale_1":

          if (this.state.syncRanges) {
            newState.scale = value;
            newState.scale_1 = value;
          }
          break;
        case "dataset_0":

          if (value.dataset !== this.state.dataset) {
            this.changeDataset(value.dataset, value);
            return;
          }
          newState = value;
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

  updateScale(key, value) {
    this.setState({
      scale: value
    });
  }

  /*
  changeDataset(dataset, state) {
    // Busy modal
    this.setState({
      busy: true,
    });

    // When dataset changes, so does time & variable list
    const var_promise = $.ajax("/api/variables/?dataset=" + dataset).promise();
    const time_promise = $.ajax(
      "/api/timestamp/" +
      this.state.dataset + "/" +
      this.state.time + "/" +
      dataset
    ).promise();
    
    $.when(var_promise, time_promise).done(function(variable, time) {
      let newvariable = this.state.variable;
      
      if ($.inArray(this.state.variable, variable[0].map(function(e) 
      { return e.id; })) == -1) {
        newvariable = variable[0][0].id;
      }

      // If no state parameter has been passed
      // make a skeleton one
      if (state === undefined) {
        state = { };
      }

      state.dataset = dataset;
      state.variable = newvariable;
      state.time = time[0];
      state.busy = false;

      this.setState(state);
    }.bind(this));
  }*/

  action(name, arg, arg2, arg3) {
    switch(name) {
      case "point":

        this.mapComponent.resetMap();

        ReactGA.event({
          category: 'PointPlot',
          action: 'click',
          label: 'PointPlot'
        });
        
        /*
        this.mapComponent.resetMap();
        if (this.mapComponent2) {
          this.mapComponent2.resetMap();
        }
        */
        if (typeof(arg) === "object") {
          // The EnterPoint component correctly orders the coordinate
          // pair, so no need to swap it.
          if (arg2 === "enterPoint") {
            
            this.setState({
              point: [[arg[0], arg[1]]],
              modal: "point",
              names: [],
            });
          }
          // Drawing on the map results in a reversed coordinate pair
          // so swap it.
          else {
            this.setState({
              point: [[arg[1], arg[0]]],
              modal: "point",
              names: [],
            });
          }

          // Disable point selection in both maps
          this.removeMapInteraction("Point");
          ReactGA.event({
            category: 'PointPlot',
            action: 'click',
            label: 'PointPlot'
          });

          this.showModal();
        } else {

          // Enable point selection in both maps
          this.mapComponent.point();
          if (this.mapComponent2) {
            this.mapComponent2.point();
          }
        } 
        break;
      
      case "multi-point":

        
        //Tracks Google Analytics Event
        
        if (arg === undefined) {
        
          this.mapComponent.resetMap();

          ReactGA.event({
            category: 'MultiPointPlot',
            action: 'click',
            label: 'MultiPointPlot'
          })
          // Enable point selection in both maps
          
          this.mapComponent.multiPoint();  
        
        } else {
         
          this.setState({
            point: arg,
            modal: "point",
            names: [],
          })
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
            category: 'LinePlot',
            action: 'click',
            label: 'LinePlot'
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
            category: 'AreaPlot',
            action: 'click',
            label: 'AreaPlot'
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
      case "drifter":
        this.setState({
          drifter: arg,
          modal: "drifter",
          names: arg,
        });
        ReactGA.event({
          category: 'DrifterPlot',
          action: 'click',
          label: 'DrifterPlot'
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


        if (this.state.multiPoint === true) {
          this.mapComponent.disableMulti();
        }

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

  multiPointAction(key) {
    switch(key) {

      //Enables multiPoint and Enables Map Interaction
      case "enable":
        this.setState({
          multiPoint: true
        })
        this.action("multi-point")
        break;

      //Removes Map Interaction
      case "disable":
        this.setState({
          multiPoint: false
        })
        this.mapComponent.disableMulti();
        this.removeMapInteraction("multiPoint")
        break;

      //Resets everything back to default
      case "reset":
        this.mapComponent.resetMap();
        this.setState({
          multiPoint: false,
          point: undefined
        })
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
      this.setState({
        showModal: false,
      })
      //window.history.back();
    }
  }

  /*
  componentDidUpdate(prevProps, prevState) {
    
    if (this.state.showModal && !prevState.showModal) {
      window.history.replaceState(prevState, null, null);
      window.history.pushState(null, null, null);
    }
  }
  */

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

    
    if (this.state.names && this.state.names.length > 0) {
      modalTitle = this.state.names.slice(0).sort().join(", ");
    }

    _("Loading");

    const contentClassName = this.state.sidebarOpen ? "content open" : "content";
    
    // Pick which map we need
    let map = null;
    if ('right' in this.state.data) {
      
      const secondState = $.extend(true, {}, this.state);
      for (let i = 0; i < Object.keys(this.state.dataset_1).length; ++i) {
        const keys = Object.keys(this.state.dataset_1);
        secondState[keys[i]] = this.state.dataset_1[keys[i]];
      }
      map = <div className='multimap'>
        <Map
          ref={(m) => this.mapComponent = m}
          mapIdx='left'
          data={this.state.data['left']}
          timeSources={this.state.timeSources}
          state={this.state}
          layers={this.state.layers['left']}
          action={this.action}
          updateState={this.updateState}
          partner={this.mapComponent2}
          scale={this.state.scale}
          options={this.state.options}
        />
        <Map
          ref={(m) => this.mapComponent2 = m}
          mapIdx='right'
          data={this.state.data['right']}
          timeSources={this.state.timeSources}
          state={secondState}
          layers={this.state.layers['right']}
          action={this.action}
          updateState={this.updateState}
          partner={this.mapComponent}
          scale={this.state.scale}
          options={this.state.options}
        />
      </div>;
    } 
    else {
      map = <Map
        ref={(m) => this.mapComponent = m}
        mapIdx='left'
        layers={this.state.layers}
        data={this.state.data['left']}
        timeSources={this.state.timeSources}
        allSources={this.state.timeSources}
        state={this.state}
        action={this.action}
        updateState={this.updateState}
        scale={this.state.scale}
        options={this.state.options}
      />;
    }

    let layerSelect = null; 
    
    if (this.mapComponent !== null) {
      if (this.mapComponent2 === null) {
        layerSelect = <LayerSelection
        state={this.state}
        swapViews={this.swapViews}
        mapComponent={this.mapComponent}
        mapComponent2={this.mapComponent2}
        updateState={this.updateState}
        showHelp={this.toggleCompareHelp}
        options={this.state.options}
        updateOptions={this.updateOptions}
      />
      } else {
        layerSelect = <LayerSelection
        state={this.state}
        swapViews={this.swapViews}
        mapComponent={this.mapComponent}
        mapComponent2={this.mapComponent2}
        updateState={this.updateState}
        showHelp={this.toggleCompareHelp}
        options={this.state.options}
        updateOptions={this.updateOptions}
      />
      }
      
    }
    

    return (
      <div className='OceanNavigator'>
        
        {layerSelect}
        <div className={contentClassName}>
          <MapToolbar
            point={this.state.point}
            multiPoint={this.state.multiPoint}
            multiPointAction={this.multiPointAction}
            action={this.action}
            plotEnabled={this.state.plotEnabled}
            dataset_compare={this.state.dataset_compare}
            updateState={this.updateState}
            toggleSidebar={this.toggleSidebar}
            toggleOptionsSidebar={this.toggleOptionsSidebar}
            updateLanguage={this.updateLanguage}
          />
          {/*<WarningBar
            showWarningInfo={this.showBugsModal}
          />*/}
          
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
            <ModalContainer
              modal={this.state.modal}
              data={this.state.data}
              area={this.state.area}
              names={this.state.names}
              point={this.state.point}
              line={this.state.line}
              drifter={this.state.drifter}
              showHelp={this.toggleCompareHelp}
              dataset_compare={this.state.dataset_compare}
              onUpdate={this.updateState}
              init={this.state.subquery}  
              class4={this.state.class4}
              action={this.action}
              swapViews={this.swapViews}
              options={this.state.options}
            ></ModalContainer>
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

        <Modal
          show={this.state.showBugs}
          onHide={this.hideBugsModal}
          bsSize="large"
          dialogClassName="bugsdialog"
          backdrop={true}
        >
          <Modal.Header closeButton closeLabel={_("Close")}>
            <Modal.Title>{_("Water Velocity Issue")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>
              There is a known issue with how the direction of water velocity is rendered.<br/>
              <br/>
            </p>
            <p>
              The "water x velocity" and "water y velocity" do not necessarily refer to water velocity 
              in the East or North direction. Instead, they refer to the water velocity along the x or y axis 
              of the grid used by the source data, which are often rotated.<br/>
              <br/>
            </p>
            <p>
              For data sources such as GIOPS daily and GIOPS monthly this means the data is on a tripolar grid and the 
              angle of the x-axis changes, deviating further from the Latitude Longitude grid directions closer to the 
              north pole.<br/>
              <br/>
            </p>
            <p> 
              This issue is known to have an impact on:<br/>
                * Water velocity (x,y and combined) for The Global, Arctic, and Antarctic projections for all dataset<br/>
                * Model Water velocity for the Area, Point, and Line/Transect plots. for all datasets.<br/>
                * Model Water velocity (x, y, and combined) for exported CSV's and ODE<br/>
                * Model Water velocity for drifter plots.<br/>
              <br/>
              <br/>
            </p>
              Please note that the magnitude of the velocity is correct, it is only the direction of the velocity that is misrendered. 
              Also, note that for GIOPS and GLORYS this issue only has a minor effect on data that is south of 
              60deg Latitude, however, data above that Latitude could be represented in ways that are confusing without 
              a detailed knowledge of the original datasets. Again are working on resolving this issue and hope to have 
              a clear and understandable fix released soon. <br/>
              <br/>
            <p>
              you would like more detailed information you can view our bug tracking this problem on 
              our <a href="https://github.com/DFO-Ocean-Navigator/Ocean-Data-Map-Project" target="_blank">github</a> page and look for issue
              <a href="https://github.com/DFO-Ocean-Navigator/Ocean-Data-Map-Project/issues/213" target="_blank">"Bearing and vector representation"</a> <br/>
              If you still need more information about the problem contact oceandatamap@gmail.com <br/>
              <br/>
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={this.hideBugsModal}><Icon icon="close" alt={_("Close")}/> {_("Close")}</Button>
          </Modal.Footer>
        </Modal>

        <Modal 
          show={this.state.busy}
          dialogClassName='busy-modal'
          backdrop
        >
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
