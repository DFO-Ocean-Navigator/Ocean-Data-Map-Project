import React from "react";
import ComboBox from "./ComboBox.jsx";
import Range from "./Range.jsx";
import { Panel, Button } from "react-bootstrap";
import PropTypes from "prop-types";
import * as olcontrol from "ol/control";
import * as olsource from "ol/source";
import * as ollayer from "ol/layer";
import ReactSimpleRange from "react-simple-range";
import IceComboBox from "./IceComboBox.jsx";
import NewComboBox from "./newComboBox.jsx";
import { Checkbox } from 'react-bootstrap'
const i18n = require("../i18n.js");

// IMPORT IMAGES FOR ICONS
import ice from '../images/ice_symbol.png';
import met from '../images/cloud_symbol.png';
import ocean from '../images/ocean_symbol.png'
import wave from '../images/waves_symbol.png'
import iceberg from '../images/iceberg_symbol.png'

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
      icons: {
        'ocean': <img src={ocean} alt="Ocean" className='timeIcon'></img>,
        'met': <img src={met} alt="Met" className='timeIcon'></img>,
        'ice': <img src={ice} alt="Ice" className='timeIcon'></img>,
        'wave': <img src={wave} alt="Waves" className='timeIcon'></img>,
        'iceberg': <img src={iceberg} alt="IceBerg" className='timeIcon'></img>,
      },
      // DISPLAY INFO
      colourmaps_val: [],
      opacity: 100,

      // CURRENT STATE
      current_depth: 0,
      current_quantum: '',
      current_colourmap: ['default'],
      current_display: 'colour',
      current_variable: undefined,
      current_dataset: undefined,
      current_scale: '-5,30',
      current_map: 'left',

      compare: false,
    };

    this.range = undefined

    // Function bindings
    this.handleTabs = this.handleTabs.bind(this);
    this.createLayer = this.createLayer.bind(this);
    this.toggleLayer = this.toggleLayer.bind(this);
    this.localUpdate = this.localUpdate.bind(this);
    this.updateLayer = this.updateLayer.bind(this);
    this.sendData = this.sendData.bind(this);

    //Getting metadata
    //this.getVariables = this.getVariables.bind(this);
    //this.getDatasets = this.getDatasets.bind(this);
    this.updateTransparency = this.updateTransparency.bind(this);
    //this.getDataInfo = this.getDataInfo.bind(this);
    //this.addData = this.addData.bind(this);
    this.removeData = this.removeData.bind(this);
    this.removeOpenLayer = this.removeOpenLayer.bind(this);
    this.changeDataset = this.changeDataset.bind(this)
    this.changeVariable = this.changeVariable.bind(this);
    this.changeDepth = this.changeDepth.bind(this);
    this.changeTimeSource = this.changeTimeSource.bind(this);
    this.updateDates = this.updateDates.bind(this);

    //this.setCurrent = this.setCurrent.bind(this);
    this.dateToISO = this.dateToISO.bind(this);
    //this.fetchVariables = this.fetchVariables.bind(this);
    this.toggleCompare = this.toggleCompare.bind(this);
  }

  singleClick(feature, pixel) {


    this.infoRequest = $.ajax({
      url: (
        `/api/v1.0/data/${dataset}` +
        `/${variable}` +
        `/${data[type][index][dataset][variable]['time'].toISOString()}` +
        `/${data[type][index][dataset][variable].depth}` +
        `/${location[1]},${location[0]}.json`
      ),
      success: function (response) {
        for (let i = 0; i < response.name.length; ++i) {
          if (response.value[i] !== "nan") {
            text = <p><br />{response.name[i] + ": " + response.value[i] + " " + response.units[i]}</p>;
            toRender.push(text)
            this.setState({
              toRender: toRender
            })
          }
        }

      }.bind(this),
    })
    return
  }

  componentDidMount() {
    this._mounted = true
    this.changeDataset();
    this.createLayer();
  }

  /*
  setCurrent() {
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


    let depth = 0
    this.setState({
      current_dataset: dataset,
      current_variable: variable,
      current_scale: this.state.variables[0]['scale'],
      current_depth: depth,
      current_quantum: quantum,
    })
  }
  */

  loadExisting(data) {
    // Check if the data belongs to the layer
    this.props.preload
    if (this.props.preload.id === 'something') {
      // Loads the data if it belongs

      this.setState({
        current_dataset: '',
        current_variable: '',
        current_depth: '',
      })

      // SendData

      // Force layerUpdate()

      // 

    }
  }

  /*
    Sends the data information back to OceanNavigator.jsx to be used by the modals
    
  */
  sendData(update) {
    return
    console.warn("SEND DATA")
    let data
    if (this.state.current_map in this.props.state.data) {
      data = jQuery.extend({}, this.props.state.data[this.state.current_map]) // Make a new object so it will trigger componentDidUpdate in other components
    } else {
      data = {}
    }
    let time_access = this.state.current_map + this.props.layerType + this.props.value + this.state.current_dataset + this.state.current_variable
    let time = undefined
    
    try {
      time = this.props.state.timestamps[time_access];
    } catch (err) {
      console.warn("No Time Available")
    }
    
    if (this.state.current_dataset !== undefined && this.state.current_variable !== undefined && time !== undefined) {
      if (this.props.layerType in data) {
        if (this.props.value in data[this.props.layerType]) {
          if (data[this.props.layerType] !== undefined || data[this.props.layerType] !== {}) {
            data[this.props.layerType][this.props.value] = undefined
            delete [this.props.layerType][this.props.value]
          }
          data[this.props.layerType][this.props.value] = {
            [this.state.current_dataset]: {
              [this.state.current_variable]: {
                frequency: 1,
                quantum: this.state.current_quantum,
                time: time,
                scale: this.state.current_scale,
                display: this.state.current_display,
                colourmap: this.state.current_colourmap,
                depth: this.state.current_depth
              }
            }
          }
        } else {
          data[this.props.layerType][this.props.value] = {
            [this.state.current_dataset]: {
              [this.state.current_variable]: {
                frequency: 1,
                quantum: this.state.current_quantum,
                time: time,
                scale: this.state.current_scale,
                display: this.state.current_display,
                colourmap: this.state.current_colourmap,
                depth: this.state.current_depth
              }
            }
          }
        }
      } else {
        data[this.props.layerType] = {
          [this.props.value]: {
            [this.state.current_dataset]: {
              [this.state.current_variable]: {
                frequency: 1,
                quantum: this.state.current_quantum,
                time: time,
                scale: this.state.current_scale,
                display: this.state.current_display,
                colourmap: this.state.current_colourmap,
                depth: this.state.current_depth
              }
            }
          }
        }
      }
    }
    let new_data = jQuery.extend({}, this.props.state.data)
    new_data[this.state.current_map] = data
    this.props.globalUpdate('data', new_data)
  }


  /*
    
  */
 changeDataset(dataset) {

    let old_dataset = this.state.current_dataset;
    let old_variable = this.state.current_variable;
    let update = undefined
    
    let new_dataset
    let new_quantum
    let new_variable
    let new_scale
    let new_depth_list

    if (dataset !== null && dataset !== undefined) {
      this.props.removeData(this.state.current_map, old_dataset, old_variable, this.props.value);
    }
    if (this.props.datasetconfig !== undefined && this.props.datasetconfig !== null) {

      // Check for giops_day
      if ('giops_day' in this.props.datasetconfig && dataset === undefined || dataset === null) {

        new_dataset = 'giops_day';
        let giops_obj = this.props.datasetconfig['giops_day']
        new_quantum = giops_obj.quantum

        // Check for votemper
        if ('votemper' in giops_obj.variables) {
          new_variable = 'votemper';
          new_scale = giops_obj.variables['votemper'].scale
        } else {
          for (let v in giops_obj.variables) {
            new_variable = v;
            new_scale = giops_obj.variables[new_variable].scale
            break;
          }
        }

      } else if (dataset !== undefined && dataset !== null) {
        
        new_dataset = dataset;
        new_quantum = this.props.datasetconfig[dataset].quantum;
        
        for (let v in this.props.datasetconfig[new_dataset].variables) {
          new_variable = v;
          new_scale = this.props.datasetconfig[new_dataset].variables[new_variable].scale;
          
          break;
        }
        
      } else {
        for (let d in this.props.datasetconfig) {
          new_dataset = d;
          new_quantum = d;

          for (let v in this.props.datasetconfig[d].variables) {
            new_variable = v;
            new_scale = this.props.datasetconfig[d].variables[v].scale;
            
            break;
          }

          break;
        }
      }


      // Update State with new selections
      this.setState({
        current_dataset: new_dataset,
        current_quantum: new_quantum,
        current_variable: new_variable,
        current_scale: new_scale,
        default_scale: new_scale,
      }, () => {
        this.updateDates();
        this.changeTimeSource({
          new_dataset: new_dataset,
          new_quantum: new_quantum,
          new_variable: new_variable,
          old_dataset: old_dataset,
          old_variable: old_variable,
          new_map: this.state.current_map,
          old_map: this.state.current_map
        });
      })


      // Find depth
      const depth_promise = $.ajax("/api/v1.0/depth/?dataset=" + new_dataset + "&variable=" + new_variable,)
      $.when(depth_promise).done(function (depths) {

        // Update state with depths
        this.setState({
          depths: depths
        })

        // Trigger data update using this.sendData('update')
        this.sendData(update)
        update = 'update'

      }.bind(this));
    } else {
      console.error("Missing Data")
      // Update Anyway to prevent future errors
      this.sendData(update)
      return null
    }

 }

  /*
    Replaced with function utilizing pre-loaded data

    This should be the only function called when a dataset change happens
    This includes changes to the available datasets

    If dataset is undefined - initialize
  */
  changeDataset_deprecated(dataset) {
    let variable_promise = undefined;
    let old_dataset = this.state.current_dataset;
    let old_variable = this.state.current_variable;



    let quantum;
    let new_quantum
    let new_dataset

    // Load datasets if they arent already
    if (dataset === undefined) {
      const dataset_promise = $.ajax("/api/v1.0/datasets/?envType=" + this.props.layerType).promise();
      $.when(dataset_promise).done(function (datasets) {

        if (this.props.state._firstLayer && datasets !== undefined) {
          for (let dataset in datasets) {
            if (datasets[dataset]['id'] === 'giops_day') {
              new_quantum = datasets[dataset]['quantum']
              new_dataset = 'giops_day'
              break;
            }
          }
        } else if (datasets !== undefined) {
          new_dataset = datasets[0]['id']
          new_quantum = datasets[0]['quantum']
        }

        dataset = new_dataset
        quantum = new_quantum

        this.setState({
          datasets: datasets,
          current_dataset: dataset,
          current_quantum: quantum
        })
        variable_promise = $.ajax("/api/v1.0/variables/?dataset=" + dataset + "&envType=" + this.props.layerType).promise();


        // Update Variables
        $.when(variable_promise).done(function (variables) {
          var new_variable
          if (this.props.state._firstLayer && variables !== undefined) {
            for (let variable in variables) {
              if (variables[variable]['id'] === 'votemper') {
                new_variable = 'votemper';
                break;
              }
            }
          } else if (variables !== undefined) {
            new_variable = variables[0]['id']
          }
          this.setState({
            variables: variables,
            current_variable: new_variable,
          }, () => {
            this.changeTimeSource({
              new_dataset: dataset,
              new_quantum: quantum,
              new_variable: new_variable,
              old_dataset: old_dataset,
              old_variable: old_variable,
              new_map: this.state.current_map,
              old_map: this.state.current_map
            })
          })

          $.ajax({
            url: "/api/v1.0/depth/?dataset=" + dataset + "&variable=" + new_variable,
            success: function (depths) {
              this.setState({
                depths: depths,
                current_depth: 0,
              }, () => {
                this.sendData();
              })
            }.bind(this),
            error: function () {
              console.warn("FAILED TO LOAD DEPTHS")
            }
          })


        }.bind(this));
      }.bind(this));
    } else {  // Not initializing, available datasets don't change
      // Remove old dataset from global data Object
      this.props.removeData(this.state.current_map, old_dataset, old_variable, this.props.value);
      // Change current_dataset and current_quantum
      // Located Quantum
      let quantum
      for (let d in this.state.datasets) {
        if (this.state.datasets[d]['id'] === dataset) {
          quantum = this.state.datasets[d]['quantum']
          break;
        }
      }
      this.setState({
        current_dataset: dataset,
        current_quantum: quantum,
      })
      // Fetch new Variables
      variable_promise = $.ajax("/api/v1.0/variables/?dataset=" + dataset + "&envType=" + this.props.layerType).promise();

      // Update Variables
      $.when(variable_promise).done(function (variables) {
        let variable = variables[0]['id']
        const depths_promise = $.ajax("/api/v1.0/depth/?dataset=" + dataset + "&variable=" + variable).promise();

        this.setState({
          variables: variables,
          current_variable: variable,
        }, () => {
          this.changeTimeSource({
            new_dataset: dataset,
            new_quantum: quantum,
            new_variable: variable,
            old_dataset: old_dataset,
            old_variable: old_variable,
            new_map: this.state.current_map,
            old_map: this.state.current_map
          })  // Update the timeSource to reflect the changes
        })
        // Update depths dropdown
        $.when(depths_promise).done(function (depths) {
          this.setState({
            depths: depths,
            current_depth: 0,
          }, () => {
            this.sendData('update');
          })   // Update the data object
        }.bind(this))
      }.bind(this))
    }
  }

  /*
    Updates current_variable, current_depths, and depths
    - Depths can change on variable change (ex: surface only)
  
    Requires: Variable (string)
    Returns: Nothing
  */
  changeVariable(variable) {

    // Change Time Source
    this.changeTimeSource({
      new_dataset: this.state.current_dataset,
      new_quantum: this.state.current_quantum,
      new_variable: variable,
      old_dataset: this.state.current_dataset,
      old_variable: this.state.current_variable,
      new_map: this.state.current_map,
      old_map: this.state.current_map
    })

    const depths_promise = $.ajax("/api/v1.0/depth/?dataset=" + this.state.current_dataset + '&variable=' + variable)

    this.props.removeData(this.state.current_map, this.state.current_dataset, this.state.current_variable, this.props.value)

    // Finds depth for new variable (often the same)
    $.when(depths_promise).done(function (depths) {
      this.setState({
        current_variable: variable,
        current_scale: 0,
        depths: depths, //this.props.datasetconfig[],
        default_scale: this.props.datasetconfig[this.state.current_dataset][variable].scale,
        current_depth: 0,
      }, () => {this.sendData('update'); this.updateDates()});
      
    }.bind(this))
  }


  /*
    Updates current_depth
    Requires: Depth (int)
    Returns: Nothing
  */
  changeDepth(depth) {
    this.setState({
      current_depth: depth
    })
    this.sendData();  // Sends the change to parent
  }


  componentDidUpdate(prevProps, prevState) {
    if (this.state.show && this.props.mapComponent2 !== null) {
      this.toggleLayer()
      this.setState({
        show: false,
      })
    }

    if (this.props.datasetconfig !== prevProps.datasetconfig) {
      this.changeDataset(undefined)
    }

    if (this.state.datasets != [] && this.state.variables != [] && this.props.state.timestamps !== {} && this.props.state.timestamps !== undefined) {
      if (this.props.state.timestamps !== prevProps.state.timestamps || this.state.current_dataset !== prevState.current_dataset || this.state.current_variable !== prevState.current_variable || this.props.state.projection !== prevProps.state.projection) {
        this.updateLayer();
        this.sendData();
        if (this.props.state._firstLayer && this.state.current_dataset !== undefined && this.state.current_variable !== undefined) {
          this.toggleLayer()

          this.props.globalUpdate('_firstLayer', false)
        }
      }//} else if (this.props.state.timestamps != prevProps.state.timestamps && this.props.state.timestamps != undefined) {
      //  this.updateLayer();
      //}
    }

  }


  /*
    Code to be displayed when map is single clicked
     - Passed into the data layer
  */
  singleClick(feature) {

  }

  /*

  */
  handleTabs(key) {
    this.setState({ currentTab: key, });
  }

  /*

  */
  toggleCompare() {
    let show = false
    if (this.props.layers.includes(this.state.layer)) {
      this.toggleLayer()
      show = true
    }

    let old_map = this.state.current_map
    this.props.removeData(old_map, this.state.current_dataset, this.state.current_variable, this.props.value)

    let current_map;


    if (this.state.current_map === 'left') {
      current_map = 'right'
    } else {
      current_map = 'left'
    }

    this.setState({
      compare: !this.state.compare,
      current_map: current_map,

    }, () => {
      this.changeTimeSource({
        new_dataset: this.state.current_dataset,
        new_quantum: this.state.current_quantum,
        new_variable: this.state.current_variable,
        new_map: this.state.current_map,
        old_dataset: this.state.current_dataset,
        old_variable: this.state.current_variable,
        old_map: old_map
      })
      this.setState({
        show: show
      })
      this.sendData()
    })
  }

  /*

  */
  getVariables() {
    let variables = []

    for (let key in this.state.datainfo) {
      variables.push(key)
    }

    return variables
  }

  /*

  */
  getDatasets(variable) {
    if (variable == undefined) {
      let datasets = this.state.datainfo[variables[0]]['datasets']
      return datasets
    } else {
      let datasets = this.state.datainfo[variable]['datasets']
      return datasets
    }
  }

  /*
    This function triggers updates on data changes

    Requires:
        key: variable to save to in state
        value: value to save
  */
  localUpdate(key, value) {

    if (key === 'current_depth') {
      this.changeDepth(value)
    } else if (key === 'current_variable') {
      this.changeVariable(value)
    } else if (key === 'current_dataset') {
      this.changeDataset(value)
    } else {
      this.setState({
        [key]: value,
      }, () => {
        this.sendData('update');
        this.updateLayer();
      })
    }
  }

  /*
    This Function is unused.
    Replaced by this.props.removeData(map, dataset, variable, index)
  */
  removeData(map, dataset, variable) {
    if (map === undefined || dataset === undefined || variable === undefined) {
      return
    }
    let data = jQuery.extend({}, this.props.state.data)
    delete data[map][this.props.layerType][dataset].variable
    if (data[map][this.props.layerType][dataset] === {}) {
      delete data[map][this.props.layerType].dataset
      if (data[map][this.props.layerType] === {}) {
        let type = this.props.layerType
        delete data[map].type

        if (data[map] === {}) {
          delete data[map]
        }
      }
    }
    this.props.globalUpdate('data', data)
  }

  /*
    Converts a JS Date() Object to ISO8604 extended format

    ** This does not ensure that this date exists in the dataset **

    requires: JS Date() Object
    ensures: Valid ISO8604 extended format string
  */
  dateToISO(date, quantum) {
    if (date === undefined) {
      return
    }
    function formatDay(day) {
      if (day.toString().length === 1) {
        return '0' + day.toString()
      } else {
        return day
      }
    }

    function formatMonth(month) {
      month = month - 1
      if (month.toString().length === 1) {
        return '0' + month.toString()
      } else {
        return month
      }
    }

    let iso

    if (quantum === 'min') {
      iso = date.format('YYYY-MM-DD[T]HH[:]MM[:00+00:00]')
      //iso = date.getUTCFullYear() + '-' + formatMonth(date.getUTCMonth()) + '-' + formatDay(date.getUTCDate()) + 'T' + date.getUTCHours() + date.getUTCMinutes() + ':00+00:00'
    } else if (quantum === 'hour') { // Only returns ISO to hour precision
      iso = date.format('YYYY-MM-DD[T]HH[:00:00+00:00]')
      //iso = date.getUTCFullYear() + '-' + formatMonth(date.getUTCMonth()) + '-' + formatDay(date.getUTCDate()) + 'T' + date.getUTCHours() + ':00:00+00:00'
    } else if (quantum === 'day') { // Only returns ISO to day precision
      iso = date.format('YYYY-MM-DD[T00:00:00+00:00]')
      //iso = date.getUTCFullYear() + '-' + formatMonth(date.getUTCMonth()) + '-' + formatDay(date.getUTCDate()) + 'T00:00:00+00:00'
    } else if (quantum === 'month') { // Only returns ISO to month precision
      iso = date.toISOString()
      //iso = date.format('YYYY-MM[-01T00:00:00+00:00]')
      //iso = date.getUTCFullYear() + '-' + formatMonth(date.getUTCMonth()) + '-01T00:00:00+00:00'
    } else if (quantum === 'year') {
      iso = date.format('YYYY[-01-01T00:00:00+00:00]')
      //iso = date.getUTCFullYear() + '-01-01T00:00:00+00:00'
    } else {    // Returns ISO to max available precision
      is = date.format('YYYY-MM-DD[T]HH[:]MM[:]SS[:00:00]')
      //iso = date.getUTCFullYear() + '-' + date.getUTCMonth() + '-' + date.getUTCDate() + 'T' + date.getUTCHours() + ':' + date.getUTCMinutes() + ':' + date.getUTCSeconds() + '+00:00'
    }

    return iso
  }

  /*
    Retrieve time information and add to layer
  */
  updateDates() {
    let url = "/api/v1.0/timestamps/?dataset=" + this.state.current_dataset + "&variable=" + this.state.current_variable;
    const time_promise = $.ajax(url);
    console.warn("UPDATE DATES")
    // Finds depth for new variable (often the same)
    $.when(time_promise).done(function (times) {
      let time = {};
      time.quantum = this.state.current_quantum;
      time.available = times;
      time.callback = () => {console.warn("CALLBACK FUNCTION")};
      time.idx = this.state.current_map + this.props.layerType + this.props.index + this.state.current_dataset + this.state.current_variable;
      time.icon = this.state.icons[this.props.layerType]
      console.warn("time.icon: ", time.icon, this.props.layerType, this.state.icons);
      let updated_layer = this.state.layer;
      updated_layer.set('time', time);

      this.setState({
        layer: updated_layer
      }, this.props.mapComponent.reloadLayer())
      
    }.bind(this))
  
  }

  /*
    Initializes a new OpenLayers Tile layer

    ** This does not add the layer to the map **
  */
  createLayer() {
    let new_layer = new ollayer.Tile(
      {
        name: 'data',
        preload: Infinity,
        opacity: this.state.opacity / 100,
        source: new olsource.XYZ({
          attributions: [
            new olcontrol.Attribution({
              html: "CONCEPTS",
            })
          ],
        }),
      });
    new_layer.set('name', this.props.layerType)

    // Create Scale Bar and Add to Layer
    let scaleBar = <div key={this.state.current_dataset + this.state.current_variable + this.props.layerType}>
      {this.state.icons[this.props.layerType]}
      <div className='indexNum'>{}</div>
      <img key={this.state.current_dataset + this.state.current_variable + this.props.layerType} src={'/api/v1.0/scale/' + this.state.current_dataset + '/' + this.state.current_variable + '/' + this.state.current_scale + '/' + this.state.current_colourmap + '/' + 'horizontal/True/False.png'}></img>
    </div>
    new_layer.set('scaleBar', scaleBar)

    // Saves the new layer
    this.setState({
      layer: new_layer
    })

  }

  /*
    Updates the already initialized layer with the data currently set
      Updates layer source
  */
  updateLayer() {
    //this.sendData('update')
    //this.updateDates();
    let layer = this.state.layer;

    let scaleBar = <div key={this.state.current_dataset + this.state.current_variable + this.props.layerType}>
    {this.state.icons[this.props.layerType]}
    <div className='indexNum'>{}</div>
    <img key={this.state.current_dataset + this.state.current_variable + this.props.layerType} src={'/api/v1.0/scale/' + this.state.current_dataset + '/' + this.state.current_variable + '/' + this.state.current_scale + '/' + this.state.current_colourmap + '/' + 'horizontal/True/False.png'}></img>
    </div>

    layer.set('scaleBar', jQuery.extend({}, scaleBar))

    let props = layer.getSource().getProperties();
    let time_access = this.state.current_map + this.props.layerType + this.props.value + this.state.current_dataset + this.state.current_variable
    //let timeString = this.dateToISO(this.props.state.timestamps[time_access], this.state.current_quantum)
    if (this.props.state.timestamps[time_access] === undefined) {
      return
    }
    let timeString = this.props.state.timestamps[time_access].toISOString()
    let masked = 0
    if (this.props.layerType === 'met') {
      masked = 1  // 0 Masks the land, 1 doesn't
    }
    // Sets new values for tiles
    props.url = `/api/v1.0/tiles` +
      `/${this.props.options.interpType}` +
      `/${this.props.options.interpRadius}` +
      `/${this.props.options.interpNeighbours}` +
      `/${this.props.state.projection}` +
      `/${this.state.current_dataset}` +
      `/${this.state.current_variable}` +
      `/${timeString}` +
      `/0` +
      `/${this.state.current_scale}` +
      `/${masked}` +    // 0 Masks the land
      `/${this.state.current_display},${this.state.current_colourmap}` +
      `/{z}/{x}/{y}.png`;

    props.projection = this.props.state.projection;
    props.attributions = [
      new olcontrol.Attribution({
        html: this.state.dataset_attribution,
      }),
    ];
    const newSource = new olsource.XYZ(props);
    
    layer.setSource(newSource)  // Apply the new Changes to the layer
    
    let data = {
      dataset: this.state.current_dataset,
      variable: this.state.current_variable,
      time: this.props.state.timestamps[time_access],
      quantum: this.state.current_quantum,
      scale: this.state.current_scale,
      depth: this.state.current_depth,
      display: this.state.current_display,
      colourmap: this.state.current_colourmap
    }
    layer.set('data', data)

    // Create Scale Bar and Add to Layer
    
    

    // Triggers the map to reload with new changes
    /*if (this.state.current_map === 'left') {
      this.props.mapComponent.reloadLayer();
    } else {
      this.props.mapComponent2.reloadLayer();
    }*/
  }

  /*
    toggleLayer()

    This function toggles the ice layer on and off
  */
  toggleLayer() {
    let layers = this.props.layers

    if (layers.includes(this.state.layer)) {
      let new_layers = layers;
      let layer = this.state.layer;
      this.setState({
        layerState: 'Add Layer'
      })

      new_layers.splice(new_layers.indexOf(layer), 1);

      this.props.globalUpdate('layers', new_layers)
      if (this.state.current_map === 'left') {
        this.props.mapComponent.toggleLayer(layer, 'remove')
      } else {
        this.props.mapComponent2.toggleLayer(layer, 'remove')
      }
    } else {
      this.updateLayer()

      this.setState({
        layerState: 'Remove Layer'
      })

      let new_layers = this.props.layers

      new_layers.push(
        this.state.layer
      )

      this.props.globalUpdate('layers', new_layers)
      if (this.state.current_map === 'left') {
        this.props.mapComponent.toggleLayer(this.state.layer, 'add')
      } else {
        this.props.mapComponent2.toggleLayer(this.state.layer, 'add')
      }
    }
  }

  /*

  */
  removeOpenLayer() {
    if (this.props.layers.includes(this.state.layer)) {
      if (this.state.current_map === 'left') {
        this.props.mapComponent.toggleLayer(this.state.layer, 'remove')
      } else {
        this.props.mapComponent2.toggleLayer(this.state.layer, 'remove')
      }
      let new_layers = this.props.layers
      new_layers.splice(new_layers.indexOf(this.state.layer), 1);
      this.setState({
        layers: new_layers,
        layerState: 'Add Layer'
      })
    }
  }

  /*
    Changes the transparency of the layer as it appears on the map
  */
  updateTransparency(e) {
    this.setState({
      opacity: e.value
    })
    this.state.layer.setOpacity(e.value / 100)
  }

  /*
    Change the global timeSources
    
    ** This both adds and removes from the object **

    timeSources: Controls the available time bars which provides the layer specific times.
  */
  changeTimeSource(args) {

    if (!('new_dataset' in args) || !('new_variable' in args)) {
      this.removeTime(args.old_map, args.old_dataset, args.old_variable)
    } else if (!('old_dataset' in args) || !('old_variable' in args)) {
      this.addTime(args.new_map, args.new_dataset, args.new_variable, args.new_quantum)
    } else {
      this.removeTime(args.old_map, args.old_dataset, args.old_variable)
      this.addTime(args.new_map, args.new_dataset, args.new_variable, args.new_quantum)
    }
  }

  /*
    Removes a timeSource from the global timeSources list

    Requires dataset, variable
  */
  removeTime(map, dataset, variable) {
    // Object complete empty (don't bother removing)
    let data = ''

    if (this.props.state.timeSources === undefined) {
      return
    } else if (this.props.state.timeSources[map] === undefined) {
      data = this.props.state.timeSources
      delete data[map]
    } else if (this.props.state.timeSources[map][this.props.layerType] === undefined) {
      data = this.props.state.timeSources
      delete data[map][this.props.layerType]
    } else if (this.props.state.timeSources[map][this.props.layerType][this.props.value] === undefined) {
      data = this.props.state.timeSources
      delete data[map][this.props.layerType][this.props.value]
    } else if (this.props.state.timeSources[map][this.props.layerType][this.props.value][dataset] === undefined) {
      data = this.props.state.timeSources
      delete data[map][this.props.layerType][this.props.value][dataset]
    } else if (this.props.state.timeSources[map][this.props.layerType][this.props.value][dataset][variable] !== undefined) {
      data = this.props.state.timeSources
      delete data[map][this.props.layerType][this.props.value][dataset][variable]
      if (data[map][this.props.layerType][this.props.value][dataset] !== undefined) {
        delete data[map][this.props.layerType][this.props.value][dataset]

      }
    } else {
      return
    }


    this.props.globalUpdate('timeSources', jQuery.extend({}, data))
  }

  addTime(map, dataset, variable, quantum) {


    let data = jQuery.extend({}, this.props.state.timeSources)

    if (data === undefined) {
      data[map] = {
        [this.props.layerType]: {
          [this.props.value]: {
            [dataset]: {
              [variable]: {
                quantum: quantum
              }
            }
          }
        }
      }
    } else if (data[map] === undefined) {
      data[map] = {
        [this.props.layerType]: {
          [this.props.value]: {
            [dataset]: {
              [variable]: {
                quantum: quantum
              }
            }
          }
        }
      }
    } else if (data[map][this.props.layerType] === undefined) {
      data[map][this.props.layerType] = {
        [this.props.value]: {
          [dataset]: {
            [variable]: {
              quantum: quantum
            }
          }
        }
      }
    } else if (data[map][this.props.layerType][this.props.value] === undefined) {
      data[map][this.props.layerType][this.props.value] = {
        [dataset]: {
          [variable]: {
            quantum: quantum
          }
        }
      }
    } else if (data[map][this.props.layerType][this.props.value][dataset] === undefined) {
      data[map][this.props.layerType][this.props.value][dataset] = {
        [variable]: {
          quantum: quantum
        }
      }
    } else if (data[map][this.props.layerType][this.props.value][dataset][variable] === undefined) {
      data[map][this.props.layerType][this.props.value][dataset][variable] = {
        quantum: quantum
      }
    }

    this.props.globalUpdate('timeSources', jQuery.extend({}, data))
  }

  render() {

    _("Variable Range");
    _("Show Bathymetry Contours");
    _("Remove Layer");
    _("Use as Comparison");

    if (Object.keys(this.props.state.timestamps).length > 0 && this.props.state.timestamps !== undefined && this._mounted === true) {

      let time_access = this.state.current_map + this.props.layerType + this.props.value + this.state.current_dataset + this.state.current_variable

      let timeString = this.dateToISO(this.props.state.timestamps[time_access], this.state.current_quantum)
      this.range = <Range
        key='current_scale'
        id='current_scale'
        state={this.state.current_scale}
        setDefaultScale={this.state.setDefaultScale}
        def=''
        onUpdate={this.localUpdate}
        title={_("Scale")}
        autourl={"/api/v1.0/range/" +
          this.state.current_dataset + "/" +
          this.state.current_variable + "/" +
          this.props.options.interpType + "/" +
          this.props.options.interpRadius + "/" +
          this.props.options.interpNeighbours + "/" +
          this.props.state.projection + "/" +
          this.props.state.extent.join(",") + "/" +
          this.state.current_depth + "/" +
          timeString + ".json"
        }
        default_scale={this.state.current_scale}
      ></Range>
    }


    let depth = []
    if (this.state.depths.length > 0) {
      if (this.props.layerType === 'ocean') {
        depth.push(<IceComboBox
          data={this.state.depths}
          current={this.state.current_depth}
          localUpdate={this.localUpdate}
          key='depth'
          name='current_depth'
          title={_("Depth")}
        ></IceComboBox>)
      } else if (this.props.layerType === 'met') {
        depth.push(<IceComboBox
          data={this.state.depths}
          current={this.state.current_depth}
          localUpdate={this.localUpdate}
          key='depth'
          name='current_depth'
          title={_("Altitude")}
        ></IceComboBox>)
      }
    }

    //Creates Main Map Panel
    let datasets = []
    if (this.props.datasetconfig !== undefined && this.props.datasetconfig !== null) {
    //if (this.state.datasets.length > 1) {
      datasets.push(<NewComboBox
        data={this.props.datasetconfig}
        envType={this.props.layerType}
        //data={this.state.datasets}
        current={this.state.current_dataset}
        localUpdate={this.localUpdate}
        key='dataset'
        name='current_dataset'
        title={_("Dataset")}
      ></NewComboBox>)
      //datasets.push(<Button 
      //  bsStyle="link"
      //  key='show_help'
      //  id='show_help'
      //  onClick={this.props.showHelp}
      //>
      //  {_("Help")}
      //</Button>)
    }
    let variables = []
    if (this.props.datasetconfig !== undefined && this.props.datasetconfig !== null && this.state.current_variable !== undefined) {
      variables.push(<NewComboBox
        data={this.props.datasetconfig[this.state.current_dataset].variables}
        //data={this.state.variables}
        current={this.state.current_variable}
        localUpdate={this.localUpdate}
        envType={this.props.layerType}
        key='variable'
        name='current_variable'
        title={_("Variable")}
      ></NewComboBox>)
    }
    
    const inputs = [
      <Panel
        key='left_map_panel'
        collapsible
        defaultExpanded
        header={this.props.state.dataset_compare ? _("Left Map (Anchor)") : <div>{this.state.icons[this.props.layerType]} {_(this.props.layerName)}</div>}
        bsStyle='primary'
      >
        <Button
          className='removeButton'
          onClick={() => {
            this.removeOpenLayer()
            this.changeTimeSource({
              old_map: this.state.current_map,
              old_dataset: this.state.current_dataset,
              old_variable: this.state.current_variable,
            })
            this.props.removeLayer(this.state.current_map, this.state.current_dataset, this.state.current_variable, this.props.value)
          }}
        >X</Button>
        <Checkbox
          key='compare'
          id='compare'
          onChange={this.toggleCompare}
          checked={this.state.compare}
        //style={this.props.style}
        >
          {_("Use as Comparison")}
        </Checkbox>
        {/*
          <SelectBox
          id='useGlobalTime'
          title='Sync to Global Time'
          state={this.state.useGlobalTime}
          onUpdate={this.changeTimeSource}
        ></SelectBox>
        */}
        {datasets}
        {variables}
        {depth}
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
          data={this.props.state.display}
          current={this.state.current_display}
          localUpdate={this.localUpdate}
          key='current_display'
          name='current_display'
          title={_("Display")}
        ></IceComboBox>

        <ComboBox
          id='current_colourmap'
          state={this.state.current_colourmap}
          def={"current_colourmap"}
          onUpdate={this.localUpdate}
          url='/api/v1.0/colormaps/'
          title={_("Colour Map")}></ComboBox>

        <div className='ComboBox input'>
          <h1>Transparency</h1>
          <ReactSimpleRange
            className='iceSlider'
            value={this.state.opacity}
            min={0}
            max={100}
            step={1}
            label={true}
            onChange={this.updateTransparency}
          />
        </div>
        

        <Button className='addIceButton' onClick={this.toggleLayer}>
          {_(this.state.layerState)}
        </Button>
      </Panel>
    ];

    // Creates Right Map Panel when comparing datasets
    /*
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
        }
          {}
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
          ></Range>}
          <Button className='addIceButton' onClick={this.toggleLayer}>
            ADD ICE
          </Button>
        </Panel>
      );
  }*/

    return (
      <div>
        {inputs  /* Renders Side Panel */}
      </div>
    );
  }
}

//***********************************************************************
Layer.propTypes = {
  key: PropTypes.number,
  state: PropTypes.object,
  removeLayer: PropTypes.func,
  toggleLayer: PropTypes.func,
  reloadLayer: PropTypes.func,
  globalUpdate: PropTypes.func,
  options: PropTypes.object,
  layerType: PropTypes.string,
  swapViews: PropTypes.bool,
  showHelp: PropTypes.bool,
  updateOptions: PropTypes.func,
};
