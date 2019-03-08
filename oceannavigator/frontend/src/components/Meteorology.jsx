import React from "react";
import PropTypes from "prop-types";
import MetLayer from "./MetLayer.jsx";
import Layer from "./Layer.jsx"
import { Button } from "react-bootstrap";

const i18n = require("../i18n.js");

export default class Meteorology extends React.Component {
  constructor(props) {
    super(props);

    let layers
    if (this.props.layerType === 'ocean') {
      layers = [1]
    } else {
      layers = []
    }
    this.state = {
      index: 2,
      layers: layers
    }
      
    this.addLayer = this.addLayer.bind(this);
    this.removeLayer = this.removeLayer.bind(this);
  }

  addLayer() {
    let layers = this.state.layers
    layers.push(this.state.index)
    let index = this.state.index
    index = index + 1
    this.setState({
      layers: layers,
      index, index
    })
    
    this.layers = layers
  }

  removeLayer(dataset, index) {

    let layers = this.state.layers
    let idx = layers.indexOf(index)
    layers.splice(idx, 1)
    let sources = this.props.state.timeSources
    console.warn(layers)
    if (layers.length === 0) {
      delete sources[this.props.layerType][dataset]
    } else {
      sources[this.props.layerType][dataset].frequency = layers.length
    }
    console.warn("NEW SOURCES: ", sources)
    this.props.globalUpdate('timeSources', jQuery.extend({}, sources))
    this.setState({
      layers: layers
    })
    
  }

  render() {    
    let layers = []
    for (let idx in this.state.layers) {
      layers.push(<Layer
        index={idx}
        key={this.state.layers[idx]}
        value={this.state.layers[idx]}
        state={this.props.state}
        removeLayer={this.removeLayer}
        toggleLayer={this.props.toggleLayer}
        reloadLayer={this.props.toggleLayer}
        mapComponent={this.props.mapComponent}
        globalUpdate={this.props.globalUpdate}
        options={this.props.state.options}
        layerType={this.props.layerType}
        layerName={this.props.layerName}
        //swapViews={this.props.swapViews}
        showHelp={this.props.showHelp}
        updateOptions={this.props.updateOptions}
        //defaultDataset='giops_day'
        //defaultVariable='u-component_of_wind_height_above_ground'
      ></Layer>)
    }
      

    return (
        <div>
          
            {/*<Layer
              state={this.props.state}
              swapViews={this.props.swapViews}
              toggleLayer={this.props.toggleLayer}
              reloadLayer={this.props.reloadLayer}
              mapComponent={this.props.mapComponent}
              globalUpdate={this.props.globalUpdate}
              showHelp={this.props.showHelp}
              options={this.props.state.options}
              updateOptions={this.props.updateOptions}
              layerType='met'
              defaultDataset='gem'
            />*/}
            {layers}
            <Button
              onClick={this.addLayer}
            >
            New Ocean Layer
            </Button>
            
        </div>
    );
  }
}

//***********************************************************************
Meteorology.propTypes = {
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
