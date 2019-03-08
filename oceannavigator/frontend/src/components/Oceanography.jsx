import React from "react";
import PropTypes from "prop-types";
import MetLayer from "./MetLayer.jsx";
import Layer from "./Layer.jsx"

const i18n = require("../i18n.js");

export default class Meteorology extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {    
    
    return (
        <div>
          {/*}
            <MetLayer
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
            <Layer
              state={this.props.state}
              toggleLayer={this.props.toggleLayer}
              reloadLayer={this.props.toggleLayer}
              mapComponent={this.props.mapComponent}
              globalUpdate={this.props.globalUpdate}
              options={this.props.state.options}
              layerType='ocean'
              swapViews={this.props.swapViews}
              showHelp={this.props.showHelp}
              updateOptions={this.props.updateOptions}
              //defaultDataset='giops_day'
              //defaultVariable='u-component_of_wind_height_above_ground'
            ></Layer>
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
