import React from "react";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");

export default class Bathymetry extends React.Component {
  constructor(props) {
    super(props);

    
  }

  render() {    
    // UPDATE TO USE LAYERWRAP AND LAYER COMPONENT    
    return (
        <div>{/*<IceLayer
          state={this.props.state}
          swapViews={this.props.swapViews}
          toggleLayer={this.props.toggleLayer}
          reloadLayer={this.props.reloadLayer}
          mapComponent={this.props.mapComponent}
          globalUpdate={this.props.globalUpdate}
          showHelp={this.props.showHelp}
          options={this.props.state.options}
          updateOptions={this.props.updateOptions}
        />*/}
            

        </div>
    );
  }
}

//***********************************************************************
Bathymetry.propTypes = {
  state: PropTypes.object,
  sidebarOpen: PropTypes.bool,
  basemap: PropTypes.string,
  scale: PropTypes.string,
  scale_1: PropTypes.string,
  bathymetry: PropTypes.bool,
  dataset_compare: PropTypes.bool,
  dataset_1: PropTypes.object,
  reloadLayer: PropTypes.func,
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
