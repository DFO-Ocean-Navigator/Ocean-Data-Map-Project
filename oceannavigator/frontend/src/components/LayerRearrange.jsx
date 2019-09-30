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

    let layers = []
    var self = this;

    //if (this.state.showLayers) {
    //    this.props.map.getLayers().forEach(function(layer) {
    //      if (layer['I'].name != undefined) {
    //        layers.push(
    //            <div className="layerContainer" key={layer['I'].name}>
    //                <div className='layerTextContainer'>
    //                   {layer['I'].name}
    //                </div>
    //                <div className='buttonContainer'>
    //                    <div className='arrowsContainer'>
    //                        <Button key={layer['I'].name + '_up'} name={layer['I'].name} onClick={self.moveUp} className='layerButton'>
    //                        {/*<FontAwesome name='caret-up' />*/}
    //                        </Button>
    //                        <Button key={layer['I'].name + '_down'} name={layer['I'].name} onClick={self.moveDown} className='layerButton'>
    //                        {/*<FontAwesome name='caret-down'/>*/}
    //                        </Button>
    //                    </div>
    //                    <Button className='layerCloseButton'>
    //
    //                    </Button>
    //                </div>
    //            </div>
    //        )
    //      }
    //    })
    //}
    
    /*
    OLD METHOD USING GLOBAL DATA
    let data = this.props.data

    for (let layer in data) {
      for (let index in data[layer]) {
        for (let dataset in data[layer][index]) {
          for (let variable in data[layer][index][dataset]) {
            //layers.push(layer+dataset+variable)
            layers.push(
            <div key={layer + index + dataset + variable}>
              {this.state.icons[layer]}
              <div className='indexNum'>{index}</div>
              <img key={layer + index + dataset + variable} src={'/api/v1.0/scale/' + dataset + '/' + variable + '/' + data[layer][index][dataset][variable].scale + '/' + data[layer][index][dataset][variable].colourmap + '/' + 'horizontal/True/False.png'}></img>
          
            </div>)
            }
        }
      }
    }
    */

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
          >Layers</Button>
          { layers }
        </div >
        
    );
  }
}

//***********************************************************************
LayerRearrange.propTypes = {
  alt: PropTypes.string,
};

