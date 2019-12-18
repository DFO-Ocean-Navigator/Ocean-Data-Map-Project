import React from "react";
import PropTypes from "prop-types";
import { Button } from "react-bootstrap";
import FontAwesome from "react-fontawesome";



const i18n = require("../i18n.js");

export default class LayerRearrange extends React.PureComponent {

  constructor(props) {
    super(props);

    this.state = {
      showLayers: true,
    }

    this.remove = this.remove.bind(this);
    this.moveUp = this.moveUp.bind(this);
    this.moveDown = this.moveDown.bind(this);
    this.showLayers = this.showLayers.bind(this);
  }

  
  /*

  */
  remove(e) {
  }

  addLayer(e) {

  }

  componentDidUpdate(prevProps, prevState) {
    for (let layer in this.props.layers) {
      if (this.props.layers[layer].values_.scaleBar !== prevProps.layers[layer].values_.scaleBar) {
        this.forceUpdate();
      }
    }
  }

  /*
    Adjusts the z-index of the layer
    Layer will move up one index
  */
  moveUp(e) {
    let self = this;

    this.props.map.getLayers().forEach(function (layer) {
      if (layer['I'].name == e.target.name) {
        self.props.map.raiseLayer(layer, 1)
      }
    })
  }

  /*
    Adjusts the z-index up 1 from it's current
  */
  moveDown(e) {
  }

  showLayers() {
    this.setState({
      showLayers: !this.state.showLayers,
    })
  }

  render() {

    _("Layers")

    let layers = []
    var self = this;

    
  /*
    Displays all currently created layerDisplay components
  */
  for (let layer in this.props.layers) {
    
    if ( this.props.layers[layer].values_.scaleBar !== undefined ) {  
      // Push the component
      layers.push( this.props.layers[layer].values_.scaleBar )
    }
  }
  

  return(
        <div>
          <Button
            className='showLayers'
            onClick={this.showLayers}
          >{_("Layers")}</Button>
          { layers }
        </div >
        
    );
  }
}

//***********************************************************************
LayerRearrange.propTypes = {
  alt: PropTypes.string,
};

