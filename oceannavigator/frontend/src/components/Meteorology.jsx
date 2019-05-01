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
    this.removeTimeSource = this.removeTimeSource.bind(this);
    this.removeData = this.removeData.bind(this);
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
    this.removeTimeSource(map, dataset, variable)
    this.removeData(map, dataset, variable, idx)

    let layers = this.state.layers
    let i = layers.indexOf(idx)
    layers.splice(i, 1)
    this.setState({
      layers: layers
    })
  }

  removeTimeSource(map, dataset, variable) {
    // Data Stored as
    // map: {
    //   layer: {
    //     dataset: {
    //       variables: [],
    //       quantum: ''
    //     }
    //   }
    // }
    
    let new_timeSources = jQuery.extend({}, this.props.state.timeSources)

    if (new_timeSources !== undefined && new_timeSources[map] !== undefined && new_timeSources[map][this.props.layerType] !== undefined) {
      if (dataset in new_timeSources[map][this.props.layerType]) {
        if (new_timeSources[map][this.props.layerType][dataset]['variables'].includes(variable)) {
          
          let idx = new_timeSources[map][this.props.layerType][dataset]['variables'].indexOf(variable)
          new_timeSources[map][this.props.layerType][dataset]['variables'].splice(idx, 1)
        }
        if (new_timeSources[map][this.props.layerType][dataset]['variables'].length === 0) {
          delete new_timeSources[map][this.props.layerType][dataset]
        }
        if (new_timeSources[map][this.props.layerType] === {}) [
          delete new_timeSources[map][this.props.layerType]
        ]
      }
      this.props.globalUpdate('timeSources', jQuery.extend({}, new_timeSources))
    }
  }


removeData(map, dataset, variable, idx) {
  // Data Stored as
  // map: {
  //   layer: {
  //     dataset: {
  //       variables: {
  //         frequency: #,
  //         data: ...
  //         data: ...
  //         data: ...
  //       }
  //     }
  //   }
  // }

  if (map === undefined || dataset === undefined || variable === undefined || idx === undefined) {
    return
  }

  let data = this.props.state.data[map][this.props.layerType][idx]
  let full_data
  if (jQuery.isEmptyObject(data[dataset])) {
    return
  } else {
    data[dataset] = undefined
    delete data[dataset]
    
    if (jQuery.isEmptyObject(data)) {
      data = this.props.state.data[map][this.props.layerType]
      data[idx] = undefined
      delete data[idx]

      if (jQuery.isEmptyObject(data)) {
        data = this.props.state.data[map]
        data[this.props.layerType] = undefined
        delete data[this.props.layerType]

        if (jQuery.isEmptyObject(data)) {
          data = this.props.state.data
          data[map] = undefined
          delete data[map]
        } else {
          full_data = this.props.state.data
          full_data[map] = data
        }
      } else {
        full_data = this.props.state.data
        full_data[map][this.props.layerType] = data
      }
    } else {
      full_data = this.props.state.data
      full_data[map][this.props.layerType][idx] = data
    }
  } 
  this.props.globalUpdate('data', jQuery.extend({}, full_data))
}

render() {
  let layers = []
  for (let idx in this.state.layers) {
    layers.push(<Layer
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

        New {this.props.layerType} Layer

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
