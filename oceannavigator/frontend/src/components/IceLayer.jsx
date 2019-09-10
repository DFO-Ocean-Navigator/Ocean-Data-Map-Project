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
const i18n = require("../i18n.js");

export default class IceLayer extends React.Component {
  constructor(props) {
    super(props);
    this._mounted = false;

    this.state = {
      currentTab: 1,
      ice_layer: undefined,
      
      //State Variables for dataset selector
      time: -1,
      layerState: 'Add Ice',
      dataset_quantum: 'day',
      depth: 0,
      scale_1: "0,60000",
      scale: "0,1",
      setDefaultScale: false,
      default_scale: "0,60000",
      opacity: 50,

      datainfo: {},

      variables: [],
      datasets: [],

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

  }

  
  getDataInfo() {
   
    $.ajax({
      url: `/api/v1.0/variables/?dataset=all&env_type=ice`,
      success: function(response) {
        
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
  }

  componentDidMount() {
    this.getDataInfo()
    this.createIce();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.datasets != [] && this.state.variables != []) {
      if (this.state.current_dataset != prevState.current_dataset || this.state.current_variable != prevState.current_variable) {
        this.updateIce();
      }
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

    let layer_ice = new ol.layer.Tile(
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

    layer_ice.set('name', 'ice')

    this.setState({
      ice_layer: layer_ice
    })

  }

  updateIce() {

    if (this.state.current_dataset == undefined || this.state.current_variable == undefined) {
      return
    }
    
    let layer_ice = this.state.ice_layer;
    let props = layer_ice.getSource().getProperties();
    
    // Sets new values for tiles
    props.url = `/tiles/v0.1` + 
                `/${this.props.options.interpType}` + 
                `/${this.props.options.interpRadius}` +
                `/${this.props.options.interpNeighbours}` +
                `/${this.props.state.projection}` + 
                `/${this.state.current_dataset}` + 
                `/${this.state.datainfo[this.state.current_variable]['info'][this.state.current_dataset]['id']}` + 
                `/${this.props.state.time}` + 
                `/0` + 
                `/${this.state.scale_1}` + 
                `/0` +
                `/{z}/{x}/{y}.png`;
    
    props.projection = this.props.state.projection;
    props.attributions = [
      new ol.Attribution({
        html: this.state.dataset_attribution,
      }),
    ];
    const newSource = new ol.source.XYZ(props);
    
    // Gives updated source to layer
    layer_ice.setSource(newSource)

    // Reloads layer to apply changes
    this.props.reloadLayer();
    
  }

  changeDataset(dataset, state) {
    // Busy modal
    this.setState({
      busy: true,
    });

    // When dataset changes, so does time & variable list
    const var_promise = $.ajax("/api/v1.0/variables/?dataset=" + dataset).promise();
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
        header={this.props.state.dataset_compare ? _("Left Map (Anchor)") : _("Ice Layer")}
        bsStyle='primary'
      >
      
        <IceDatasetSelector
          id='dataset_0'
          dataset='all'
          envtype='ice'
          state={this.state}
          datainfo={this.state.datainfo}
          localUpdate={this.localUpdate}
          toggleLayer={this.toggleLayer}
          depth={true}
        />
        
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
            <Panel
              collapsible
              defaultExpanded
              header={_("Data Comparison")}
              bsStyle='primary'
            >
              <DisplayType
                types={this.props.state.availableTypes}
              />
              <Row>
                <Col xs={9}>
                  <SelectBox
                    id='dataset_compare'
                    state={this.props.state.dataset_compare}
                    onUpdate={this.props.globalUpdate}
                    title={_("Compare Datasets")}
                  />
                </Col>
                <Col xs={3}>
                  <Button 
                    bsStyle="link"
                    key='show_help'
                    id='show_help'
                    onClick={this.props.showHelp}
                  >
                    {_("Help")}
                  </Button>
                </Col>
              </Row>
              <SelectBox
                id='syncRanges'
                onUpdate={this.props.globalUpdate}
                title={_("Sync Variable Ranges")}
                style={{display: this.props.state.dataset_compare ? "block" : "none"}}
              />
              <Button
                bsStyle="default"
                block
                style={{display: this.props.state.dataset_compare ? "block" : "none"}}
                onClick={this.props.swapViews}
              >
                {_("Swap Views")}
              </Button>
              
            </Panel>
            
            
            {inputs  /* Renders Side Panel */}
        </div>
    );
  }
}

//***********************************************************************
IceLayer.propTypes = {
  state: PropTypes.object,
  sidebarOpen: PropTypes.bool,
  basemap: PropTypes.string,
  scale: PropTypes.string,
  scale_1: PropTypes.string,
  bathymetry: PropTypes.bool,
  dataset_compare: PropTypes.bool,
  dataset_1: PropTypes.object,
  projection: PropTypes.string,
  depth: PropTypes.number,
  time: PropTypes.number,
  variable_scale: PropTypes.array,
  extent: PropTypes.array,
  globalUpdate: PropTypes.func,
  swapViews: PropTypes.func,
  showHelp: PropTypes.func,
  options: PropTypes.object,
  updateOptions: PropTypes.func,
  private: PropTypes.bool,
};
