import React from "react";
import ComboBox from "./ComboBox.jsx";
import Range from "./Range.jsx";
import SelectBox from "./SelectBox.jsx";
import IceDatasetSelector from "./IceDatasetSelector.jsx";
import {Panel, Button, Row, Col, Tabs, Tab} from "react-bootstrap";
import Icon from "./Icon.jsx";
import Options from "./Options.jsx";
import PropTypes from "prop-types";
import DisplayType from "./DisplayType.jsx";
import ol from "openlayers";
import ReactSimpleRange from "react-simple-range";
import IceComboBox from "./IceComboBox.jsx";
const i18n = require("../i18n.js");

export default class Layer extends React.Component {
  constructor(props) {
    super(props);
    this._mounted = false;

    this.state = {
      layer: undefined,
      layerState: 'Add Layer',
      useGlobalTime: true,
      timeSource: 'global',
      // DATA INFO
      variables: {},
      datasets: {},
      depths: {},
      default_scales: "0,1",
      
      // DISPLAY INFO
      colourmaps_val: [],
      opacity: 50,
      
      // CURRENT STATE
      current_depth: 0,
      current_quantum: 'day',
      current_colourmap: 'default',
      current_display: 'contours,default',
      current_variable: undefined,
      current_dataset: undefined,
    };

    this.range = undefined

    // Function bindings
    this.handleTabs = this.handleTabs.bind(this);
    this.createIce = this.createIce.bind(this);
    this.toggleLayer = this.toggleLayer.bind(this);
    this.localUpdate = this.localUpdate.bind(this);
    this.changeDataset = this.changeDataset.bind(this)
    this.updateIce = this.updateIce.bind(this);

    //Getting metadata
    this.getVariables = this.getVariables.bind(this);
    this.getDatasets = this.getDatasets.bind(this);
    this.updateTransparency = this.updateTransparency.bind(this);
    this.getDataInfo = this.getDataInfo.bind(this);
    this.changeTimeSource = this.changeTimeSource.bind(this);
    this.setCurrent = this.setCurrent.bind(this);
    this.dateToISO = this.dateToISO.bind(this);
  }

  componentDidMount() {
    this.getDataInfo()
    this.createIce();
  }

  setCurrent() {
    console.warn("SETTING CURRENT")
    let dataset = ''
    let quantum
    if (this.props.defaultDataset != undefined) { 
        for (dataset in this.state.datasets) {
          if (this.state.datasets[dataset] === this.props.defaultDataset) {
            quantum = this.state.datasets[dataset]['quantum']
          }
        }
        dataset = this.props.defaultDataset
    } else {
        dataset = this.state.datasets[0]['id']
        quantum = this.state.datasets[0]['quantum']
    }
    
    let variable = ''
    if (this.props.defaultVariable != undefined) {
        variable = this.props.defaultVariable
    } else {
        variable = this.state.variables[0]['id']
    }

    this.setState({
        current_dataset: dataset,
        current_variable: variable,
        current_quantum: quantum,
    })
  }

  getDataInfo() {
    console.warn("GET DATA INFO")

    
    $.ajax({
        url: `/api/v1.0/datasets/`,
        success: function(response) {
            console.warn("RESPONSE: ", response)
            this.setState({
                datasets: response
            })

        }.bind(this),
        error: function() {
            console.error("Dataset Info Failed to Load")
        }
    }).done( () => {
        console.warn("FINISHED LOADING DATASETS")
        if (this.props.defaultDataset in this.state.datasets) {
            console.warn("USING DEFAULT DATASET")
            $.ajax({
                url: `/api/v1.0/variables/?dataset=` + this.props.defaultDataset,
                success: function(response) {
                    console.warn("RESPONSE: ", response)
                    this.setState({
                        variables: response,
                    })
                }.bind(this),
                error: function() {
                    console.error("Variables Failed to Load")
                }
            }).done(this.setCurrent())
        } else {
            console.warn("NO DEFAULT DATASET")
            $.ajax({
                url: `/api/v1.0/variables/?dataset=` + this.state.datasets[0]['id'],
                success: function(response) {
                    console.warn("RESPONSE: ", response)
                    this.setState({
                        variables: response
                    })
                }.bind(this),
                error: function() {
                    console.error("Variables Failed to Load")
                }
            }).done(this.setCurrent())
        }
    })
    console.warn("END OF FUNCTION")

    
    // CODE TO RECEIVE ALL DATASETS // THIS IS TO ALLOW VARIABLE FIRST SELECTION
    /*
    $.ajax({
      url: `/api/v1.0/variables/?dataset=all&env_type=` + this.props.layerType,
      success: function(response) {
        console.warn("RESPONSE: ", response)
        this.setState({
          'datainfo': response
        })
        let variables = this.getVariables();
        if (variables == []) {
          throw Error;
        }
        this.setState({
          'variables': variables,
          'current_variable': variables[0],
        })
      
        let datasets = this.getDatasets(this.state.current_variable);
        this.setState({
          'datasets': datasets,
          'current_dataset': datasets[0],
        })
        this._mounted = true;
      }.bind(this),
      error: function() {
        console.error("Error getting data!");
      }
    });
    */
    
  }
  
  componentDidUpdate(prevProps, prevState) {
    
    if (this.state.datasets != [] && this.state.variables != [] && this.props.state.timestamps != undefined) {
      if (this.props.state.timestamps != prevProps.state.timestamps || this.state.current_dataset != prevState.current_dataset || this.state.current_variable != prevState.current_variable) {
        this.updateIce();
      }//} else if (this.props.state.timestamps != prevProps.state.timestamps && this.props.state.timestamps != undefined) {
      //  this.updateIce();
      //}
    }
    
  }
  handleTabs(key) {
    this.setState({currentTab: key,});
  }

  getVariables() {
    let variables = []

    for (let key in this.state.datainfo) {
      variables.push(key)
    }

    return variables
  }

  getDatasets(variable) {
    if (variable == undefined) {
      let datasets = this.state.datainfo[variables[0]]['datasets']
      return datasets
    } else {
      let datasets = this.state.datainfo[variable]['datasets']
      return datasets
    }
  }

  // Updates Ice app state
  localUpdate(key, value) {
    if (key == 'current_variable') {
      let datasets = this.state.datainfo[value]['datasets']
      if (!(this.state.current_dataset in datasets)) {
        this.setState({
          'current_dataset': datasets[0]
        })
      }
      this.setState({
        'current_variable': value,
        'datasets': datasets
      })
    } else if (key == 'current_dataset') {
      this.setState({
        'current_dataset': value,
      })
    } else {
      let newState = this.state
      newState[key] = value
      this.setState(newState, () => {
        console.log("SCALE IN CALLBACK: ", this.state.scale_1);
      })
      
    }
    this.updateIce();
  }

  createIce() {

    let layer = new ol.layer.Tile(
      {
        preload: Infinity,
        opacity: this.state.opacity/100,
        source: new ol.source.XYZ({
          attributions: [
            new ol.Attribution({
              html: "CONCEPTS",
            })
          ],
        }),
      });

    layer.set('name', this.props.layerType)

    this.setState({
      layer: layer
    })

  }

  /*
    Converts a JS Date() Object to ISO8604 extended format

    ** This does not ensure that this date exists in the dataset **

    requires: JS Date() Object
    ensures: Valid ISO8604 extended format string
  */
  dateToISO(date, quantum) {

    function formatDay(day) {
      if (day.length === 1) {
        return '0' + day
      } else {
        return day
      }
    }

    function formatMonth(month) {
      if (month.length === 1) {
        return '0' + day
      } else {
        return month
      }
    }

    let iso
    
    if (quantum === 'min') {
      iso = date.getFullYear() + '-' + formatMonth(date.getMonth()) + '-' + formatDay(date.getDate()) + 'T' + date.getHours() + date.getMinutes() + ':00+00:00'
    } else if (quantum === 'hour') { // Only returns ISO to hour precision
      iso = date.getFullYear() + '-' + formatMonth(date.getMonth()) + '-' + formatDay(date.getDate()) + 'T' + date.getHours() + ':00:00+00:00'
    } else if (quantum === 'day') { // Only returns ISO to day precision
      iso = date.getFullYear() + '-' + formatMonth(date.getMonth()) + '-' + formatDay(date.getDate()) + 'T00:00:00+00:00'
    } else if (quantum === 'month') { // Only returns ISO to month precision
      iso = date.getFullYear() + '-' + formatMonth(date.getMonth()) + '-01T00:00:00+00:00'
    } else if (quantum === 'year') {
      iso = date.getFullYear() + '-01-01T00:00:00+00:00'
    } else {    // Returns ISO to max available precision
      iso = date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate() + 'T' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds() + '+00:00'
    }

    return iso
  }

  updateIce() {

    let layer = this.state.layer;
    let props = layer.getSource().getProperties(); 
    console.warn("TIMES: ", this.props.state.timestamps)
    let timeString = this.dateToISO(this.props.state.timestamps[this.state.timeSource], this.state.current_quantum)
    // Sets new values for tiles
    props.url = `/api/v1.0/tiles` + 
                `/${this.props.options.interpType}` + 
                `/${this.props.options.interpRadius}` +
                `/${this.props.options.interpNeighbours}` +
                `/${this.props.state.projection}` + 
                `/${this.state.current_dataset}` + 
                `/${this.state.current_variable}` + 
                //`/2018-07-12T00:00:00+00:00` +
                `/${timeString}` + 
                `/0` + 
                `/${this.state.scale_1}` + 
                `/1` +
                `/${this.state.current_display},${this.state.colourmap}` +
                `/{z}/{x}/{y}.png`;
    
    props.projection = this.props.state.projection;
    props.attributions = [
      new ol.Attribution({
        html: this.state.dataset_attribution,
      }),
    ];
    const newSource = new ol.source.XYZ(props);
    
    // Gives updated source to layer
    layer.setSource(newSource)

    // Reloads layer to apply changes
    this.props.reloadLayer();
    
  }

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
  }


  /*
  toggleLayer()

  This function toggles the ice layer on and off

  */
  toggleLayer() {
    if (this.props.state.layers.includes(this.state.ice_layer)) {

      let new_layers = this.props.state.layers;
      let ice_layer = this.state.ice_layer;
      this.setState({
        layerState: 'Add Ice'
      })

      new_layers.splice(new_layers.indexOf(ice_layer), 1 );
      
      this.props.globalUpdate('layers', new_layers)
      this.props.toggleLayer(ice_layer, 'remove')
    } else {

      this.setState({
        layerState: 'Remove Ice'
      })

      let new_layers = this.props.state.layers
      
      new_layers.push(
        this.state.ice_layer
      )

      this.props.globalUpdate('layers', new_layers)
      this.props.toggleLayer(this.state.ice_layer, 'add')
    }
  }

  updateTransparency(e) {
    this.setState({
      opacity: e.value
    })
    this.state.ice_layer.setOpacity(e.value / 100)
  }

  changeTimeSource() {
    console.warn("CURRENT DATASET: ", this.state.current_dataset)
    if (this.state.useGlobalTime) { // If currently using global time
      let new_timeSources = jQuery.extend({}, this.props.state.timeSources)
      if (this.props.layerType in new_timeSources) {
        new_timeSources[this.props.layerType].push(this.state.current_dataset)  // Adds the dataset
      } else {
        new_timeSources[this.props.layerType] = [this.state.current_dataset]    // Adds the layerType and dataset
      }

      this.props.globalUpdate('timeSources', new_timeSources)    // Adds to global time source list

      this.setState({
        useGlobalTime: false,    // Unchecks the using global time selectbox
        timeSource: this.props.layerType    // Indicates the new source to look for in the global time source list
      })
    } else {
      let new_timeSources = this.props.state.timeSources
      console.warn("REMOVING TIME SOURCE")
      console.warn("TIME SOURCE: ", new_timeSources[this.state.timeSource])
      console.warn(this.state.current_dataset)
      console.warn(new_timeSources[this.props.timeSource])
      if (new_timeSources[this.state.timeSource].includes(this.state.current_dataset)) {
        console.warn("SEARCHING FOR DATASET")
        for (let idx in new_timeSources[this.state.timeSource]) {
          if (this.state.current_dataset === new_timeSources[this.props.layerType][idx]) {
            //if (new_timeSources[this.state.timeSource].length === 1) {
            //  new_timeSources[this.state.timeSource] = ''
            //} else {
              new_timeSources[this.props.layerType].splice(idx, 1)
            //}
            console.warn("NEW TIME SOURCES: ", new_timeSources)
            break;
          }
        }
        console.warn("NEW TIME SOURCES AGAIN: ", new_timeSources[this.state.timeSource])
        if (new_timeSources[this.state.timeSource].length < 1) {
          console.warn("REMOVING TIMESOURCE")
          delete new_timeSources[this.state.timeSource]
        }
      }

      this.props.globalUpdate('timeSources', new_timeSources)

      this.setState({
        useGlobalTime: true,    // Checks the using global time selectbox
        timeSource: 'global'    // Indicates the new source to look for in the global time source list
      })
    }
  }

  render() {

    _("Variable Range");
    _("Show Bathymetry Contours");
    if (this._mounted) {
      this.range = <Range
        key='scale_1'
        id='scale_1'
        state={this.state.scale_1}
        setDefaultScale={this.state.setDefaultScale}
        def=''
        onUpdate={this.localUpdate}
        title={_("Variable Range")}
        autourl={"/api/v0.1/range/" +
                this.props.options.interpType + "/" +
                this.props.options.interpRadius + "/" +
                this.props.options.interpNeighbours + "/" +
                this.state.current_dataset + "/" +
                this.props.state.projection + "/" +
                this.props.state.extent.join(",") + "/" +
                this.state.depth + "/" +
                this.props.state.time + "/" +
                this.state.datainfo[this.state.current_variable]['info'][this.state.current_dataset]['id'] + ".json"
        }
        default_scale={this.state.default_scale}
      ></Range>
    }
    

    //Creates Main Map Panel
    const inputs = [
      <Panel
        key='left_map_panel'
        collapsible
        defaultExpanded
        header={this.props.state.dataset_compare ? _("Left Map (Anchor)") : _(this.props.layerName)}
        bsStyle='primary'
      >
        <SelectBox
          id='useGlobalTime'
          title='Sync to Global Time'
          state={this.state.useGlobalTime}
          onUpdate={this.changeTimeSource}
        ></SelectBox>
      
        <IceComboBox
          data={this.state.datasets}
        ></IceComboBox>
        
        {this.range}

        {/* Contour Selector drop down menu */}
        {/*<ContourSelector 
          key='contour' 
          id='contour' 
          state={this.state.contour} 
          def='' 
          onUpdate={this.onLocalUpdate} 
          dataset={this.state.dataset_0.dataset} 
          title={_("Additional Contours")}
        >
          {_("contour_help")}
        </ContourSelector>
        */}

        <IceComboBox
          values={this.props.state.display}
          current={'current_display'}
          localUpdate={this.localUpdate}
        ></IceComboBox>
        
        <ComboBox
          id='colourmap'
          state={this.state.colourmap}
          def={"colourmap"}
          onUpdate={this.localUpdate}
          url='/api/v1.0/colormaps/'
          title={_("Colour Map")}></ComboBox>

        <ReactSimpleRange
          className='iceSlider'
          value={this.state.opacity}
          min={0}
          max={100}
          step={1}
          label={true}
          onChange={this.updateTransparency}
          />

        <Button className='addIceButton' onClick={this.toggleLayer}>
          {this.state.layerState}
        </Button>
      </Panel>
    ];

    // Creates Right Map Panel when comparing datasets
    if (this.props.state.dataset_compare) {
      inputs.push(
        <Panel
          key='right_map_panel'
          collapsible
          defaultExpanded
          header={_("Right Map")}
          bsStyle='primary'
        >
        {/*
          <IceDatasetSelector 
          id='dataset_1'
          state={this.props.state.dataset_1}
          datainfo={this.state.datainfo}
          onUpdate={this.props.globalUpdate}
          depth={true}
        />
        */}
          
          <Range
            key='scale'
            id='scale'
            state={this.state.scale_1}
            setDefaultScale={this.state.setDefaultScale}
            def=''
            onUpdate={this.localUpdate}
            title={_("Variable Range")}
            autourl={"/api/v0.1/range/" +
                    this.props.options.interpType + "/" +
                    this.props.options.interpRadius + "/" +
                    this.props.options.interpNeighbours + "/" +
                    this.state.current_dataset + "/" +
                    this.props.state.projection + "/" +
                    this.props.state.extent.join(",") + "/" +
                    this.state.depth + "/" +
                    this.props.state.time + "/" +
                    this.state.datainfo[this.state.current_variable]['info'] + ".json"
            }
            default_scale={this.props.state.dataset_1.variable_scale}
          ></Range>
          <Button className='addIceButton' onClick={this.toggleLayer}>
              ADD ICE
          </Button>
        </Panel>
      );
    }
    
    return (
        <div>
            {inputs  /* Renders Side Panel */}
        </div>
    );
  }
}

//***********************************************************************
Layer.propTypes = {

};
