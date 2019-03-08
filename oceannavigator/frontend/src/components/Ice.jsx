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
import IceLayer from "./IceLayer.jsx";
import Layer from "./Layer.jsx";

const i18n = require("../i18n.js");

export default class Ice extends React.Component {
  constructor(props) {
    super(props);

    
  }

  render() {    
    
    return (
        <div>
            {/*<Layer
              state={this.props.state}

              toggleLayer={this.props.toggleLayer}
              reloadLayer={this.props.toggleLayer}
              mapComponent={this.props.mapComponent}
              globalUpdate={this.props.globalUpdate}
              options={this.props.state.options}
              layerType='ice'
              swapViews={this.props.swapViews}
              showHelp={this.props.showHelp}
              updateOptions={this.props.updateOptions}
              //defaultDataset='giops_day'
              //defaultVariable='u-component_of_wind_height_above_ground'
            ></Layer>*/}
        </div>
    );
  }
}

//***********************************************************************
Ice.propTypes = {
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
