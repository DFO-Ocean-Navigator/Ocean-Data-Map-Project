import React from "react";
import { Tabs, Tab} from "react-bootstrap";
import PropTypes from "prop-types";
import LayerWrap from "./LayerWrap.jsx";

const i18n = require("../i18n.js");

export default class EnvironmentTab extends React.Component {
  constructor(props) {
    super(props);

    

    this.state = {
      currentTab: 1,
      datasetconfig: null,
      done: false
    };

    // Function bindings
    this.handleTabs = this.handleTabs.bind(this);
    this.getDataInfo = this.getDataInfo.bind(this);
    
    this.getDataInfo()
  }

  handleTabs(key) {
    this.setState({currentTab: key,});
  }

  /*
    Retrieves the dataset config so it only has to be done once, rather than everytime a new layer is made
  */
  getDataInfo() {

    const config_promise = $.ajax("/api/v1.0/datasetconfig/").promise();
      
    $.when(config_promise).done(function (data) {
      this.setState({
        datasetconfig: data
      }, () => {
        // Check to see if the components state was actually updated
        
        // Hold creation of the layer components until the data is actually there
        this.setState({
          done: true,
        })
      })
    }.bind(this));

  }


  render() {
      
    const className = this.props.state.sidebarOpen ? "MapInputs open" : "MapInputs";
    let layers = null
    if (this.state.datasetconfig !== undefined || this.state.datasetconfig === null) {
      layers = <Tabs //Creates Tabs Container
      activeKey={this.state.currentTab}
      onSelect={this.handleTabs}
      id="MapInputTabs"
    >

      {/* Creates the Data Selection Tab */}
        <Tab eventKey={1} title={<span className='envTabName'>{_("Oceanography")}</span>}>
            
            <LayerWrap
              datasetconfig={this.state.datasetconfig}
              state={this.props.state}
              swapViews={this.props.swapViews}
              mapComponent={this.props.mapComponent}
              mapComponent2={this.props.mapComponent2}
              globalUpdate={this.props.changeHandler}
              showHelp={this.props.showHelp}
              options={this.props.state.options}
              updateOptions={this.props.updateOptions}
              layerType='ocean'
              layerName='Ocean'
              depthName='Depth'
            />
        </Tab>
        <Tab eventKey={2} title={<span className='envTabName'>{_("Meteorology")}</span>}>
            {<LayerWrap
              datasetconfig={this.state.datasetconfig}
              state={this.props.state}
              swapViews={this.props.swapViews}
              mapComponent={this.props.mapComponent}
              mapComponent2={this.props.mapComponent2}
              globalUpdate={this.props.changeHandler}
              showHelp={this.props.showHelp}
              options={this.props.state.options}
              updateOptions={this.props.updateOptions}
              layerType='met'
              layerName='Met'
              depthName='Altitude'
            />}
        </Tab>
        <Tab eventKey={3} title={<span className='envTabName'>{_("Ice")}</span>}>
          <LayerWrap
              datasetconfig={this.state.datasetconfig}
              state={this.props.state}
              swapViews={this.props.swapViews}
              mapComponent={this.props.mapComponent}
              mapComponent2={this.props.mapComponent2}
              globalUpdate={this.props.changeHandler}
              showHelp={this.props.showHelp}
              options={this.props.state.options}
              updateOptions={this.props.updateOptions}
              layerType='ice'
              layerName='Ice'
              depthName='Depth'
            />
        </Tab>
        {/*
        NEEDS TO BE UPDATE TO USE LAYERWRAP AND LAYER CLASS

        <Tab eventKey={4} title={<span className='envTabName'>{_("Waves")}</span>}>
            <Waves
              state={this.props.state}
              swapViews={this.props.swapViews}
              toggleLayer={this.props.toggleLayer}
              reloadLayer={this.props.reloadLayer}
              mapComponent={this.props.mapComponent}
              globalUpdate={this.props.changeHandler}
              showHelp={this.props.showHelp}
              options={this.props.state.options}
              updateOptions={this.props.updateOptions}
            />
        </Tab>
        <Tab eventKey={5} title={<span className='envTabName'>{_("Bio Geo Chem")}</span>}>
            <Biogeochem
              state={this.props.state}
              swapViews={this.props.swapViews}
              toggleLayer={this.props.toggleLayer}
              reloadLayer={this.props.reloadLayer}
              mapComponent={this.props.mapComponent}
              globalUpdate={this.props.changeHandler}
              showHelp={this.props.showHelp}
              options={this.props.state.options}
              updateOptions={this.props.updateOptions}
            />
        </Tab> */}
    </Tabs>
    }
    return (
      <div className={className}>
        
        {layers}
        
      </div>
        

    );
  }
}

//***********************************************************************
EnvironmentTab.propTypes = {
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
  changeHandler: PropTypes.func,
  swapViews: PropTypes.func,
  showHelp: PropTypes.func,
  options: PropTypes.object,
  updateOptions: PropTypes.func,
  private: PropTypes.bool,
  toggleLayer: PropTypes.func,
};
