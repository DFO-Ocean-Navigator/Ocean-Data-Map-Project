import React from "react";
import PropTypes from "prop-types";
import Layer from "./Layer.jsx"
import { Button } from "react-bootstrap";

const i18n = require("../i18n.js");

export default class LayerWrap extends React.Component {
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

  removeLayer(map, dataset, variable, idx) {
    let layers = this.state.layers
    let i = layers.indexOf(idx)
    layers.splice(i, 1)
    this.setState({
      layers: layers
    })
  }

  render() {
    let layers = []
    for (let idx in this.state.layers) {
      layers.push(<Layer
        datasetconfig={this.props.datasetconfig}
        index={idx}
        key={idx}
        value={idx}
        state={this.props.state}
        layers={this.props.state.layers}
        removeLayer={this.removeLayer}
        removeData={this.removeData}
        mapComponent={this.props.mapComponent}  // Left map Component
        mapComponent2={this.props.mapComponent2} // Left map component - for dataset compare
        globalUpdate={this.props.globalUpdate}
        options={this.props.state.options}
        layerType={this.props.layerType}
        layerName={this.props.layerName}
        showHelp={this.props.showHelp}
        updateOptions={this.props.updateOptions}
      ></Layer>)
    }



    return (
      <div>
        {layers}
        <Button
          onClick={this.addLayer}
        >
          New {this.props.layerType} Layer
      </Button>
      </div>
    );
  }
}

//***********************************************************************
LayerWrap.propTypes = {
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
