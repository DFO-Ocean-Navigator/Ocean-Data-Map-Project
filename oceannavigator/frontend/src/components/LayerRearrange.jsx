import React from "react";
import PropTypes from "prop-types";
import { Button } from "react-bootstrap";
import FontAwesome from "react-fontawesome";


// IMPORT IMAGES FOR ICONS
import ice from "../images/ice_symbol.png";
import met from "../images/cloud_symbol.png";
import ocean from "../images/ocean_symbol.png";
import wave from "../images/waves_symbol.png";
import iceberg from "../images/iceberg_symbol.png";

export default class LayerRearrange extends React.PureComponent {

  constructor(props) {
    super(props);

    this.state = {
      showLayers: true,
      icons: {
        "ocean": <img src={ocean} alt="Ocean" className='timeIcon'></img>,
        "met": <img src={met} alt="Met" className='timeIcon'></img>,
        "ice": <img src={ice} alt="Ice" className='timeIcon'></img>,
        "wave": <img src={wave} alt="Waves" className='timeIcon'></img>,
        "iceberg": <img src={iceberg} alt="IceBerg" className='timeIcon'></img>,
      }
    };

    this.remove = this.remove.bind(this);
    this.moveUp = this.moveUp.bind(this);
    this.moveDown = this.moveDown.bind(this);
    this.showLayers = this.showLayers.bind(this);
  }

  //componentDidUpdate() {
  //}

  remove(e) {
  }

  moveUp(e) {
    const self = this;

    this.props.map.getLayers().forEach((layer) => {
      if (layer.I.name == e.target.name) {
        self.props.map.raiseLayer(layer, 1);
      }
    });
  }

  moveDown(e) {
  }

  showLayers() {
    this.setState({
      showLayers: !this.state.showLayers,
    });
  }

  render() {

    const layers = [];
    const self = this;

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
    const data = this.props.data;

    for (const layer in data) {
      for (const index in data[layer]) {
        for (const dataset in data[layer][index]) {
          for (const variable in data[layer][index][dataset]) {
            //layers.push(layer+dataset+variable)
            layers.push(
              <div key={layer + index + dataset + variable}>
                {this.state.icons[layer]}
                <div className='indexNum'>{index}</div>
                <img key={layer + index + dataset + variable} src={`/api/v1.0/scale/${  dataset  }/${  variable  }/${  data[layer][index][dataset][variable].scale  }/${  data[layer][index][dataset][variable].colourmap  }/` + "horizontal/True/False.png"}></img>
          
              </div>);
          }
        }
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

