import React from "react";
import PropTypes from "prop-types";
import { Button } from "react-bootstrap";
import FontAwesome from "react-fontawesome";


// IMPORT IMAGES FOR ICONS
import Ice_Icon from '../images/ice_symbol.png';
import Met_Icon from '../images/cloud_symbol.png';
import Ocean_Icon from '../images/ocean_symbol.png'
import Wave_Icon from '../images/waves_symbol.png'
import Iceberg_Icon from '../images/iceberg_symbol.png'

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

  //componentDidUpdate() {
    //console.warn("updating")
  //}

  remove(e) {
      console.warn("REMOVING")
  }

  moveUp(e) {
    let self = this;

    console.warn("MOVING UP: ", e.target.name)
    this.props.map.getLayers().forEach(function(layer) {
        if (layer['I'].name == e.target.name) {
            console.warn("MATCHING NAME")
            console.warn(layer)
            self.props.map.raiseLayer(layer, 1)
        }
    })
  }

  moveDown(e) {
      console.warn("MOVING DOWN: ", e.target.name)
  }

  showLayers() {
      this.setState({
          showLayers: !this.state.showLayers,
      })
  }

  render() {

    let layers = []
    var self = this;
    if (this.state.showLayers) {
        this.props.map.getLayers().forEach(function(layer) {
          if (layer['I'].name != undefined) {
            layers.push(
                <div className="layerContainer" key={layer['I'].name}>
                    <div className='layerTextContainer'>
                        {layer['I'].name}
                    </div>
                    <div className='buttonContainer'>
                        <div className='arrowsContainer'>
                            <Button key={layer['I'].name + '_up'} name={layer['I'].name} onClick={self.moveUp} className='layerButton'>
                            {/*<FontAwesome name='caret-up' />*/}
                            </Button>
                            <Button key={layer['I'].name + '_down'} name={layer['I'].name} onClick={self.moveDown} className='layerButton'>
                            {/*<FontAwesome name='caret-down'/>*/}
                            </Button>
                        </div>
                        <Button className='layerCloseButton'>

                        </Button>
                    </div>
                </div>
            )
          }
        })
    }
    return (
        <div>
            <Button
                className='showLayers'
                onClick={this.showLayers}
            >Layers</Button>
            {layers}
        </div>
        
    );
  }
}

//***********************************************************************
LayerRearrange.propTypes = {
  alt: PropTypes.string,
};

