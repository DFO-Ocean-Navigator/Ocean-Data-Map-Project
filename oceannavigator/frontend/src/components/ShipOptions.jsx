import React from "react";
import ComboBox from "./ComboBox.jsx";
import Range from "./Range.jsx";
import SelectBox from "./SelectBox.jsx";
import DatasetSelector from "./DatasetSelector.jsx";
import { Panel, Button, Row, Col, Tabs, Tab } from "react-bootstrap";
import Icon from "./Icon.jsx";
import Options from "./Options.jsx";
import PropTypes from "prop-types";
import ContactButton from "./ContactButton.jsx";
import * as ol from "ol";




const i18n = require("../i18n.js");

export default class ShipOptions extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      display: 'select'
    }
    
    this.display = 'select'

    this.trackShip = this.trackShip.bind(this);
    this.quickInfo = this.quickInfo.bind(this);
    this.convertToClick = this.convertToClick.bind(this);
  }

  componentDidMount() {
    //this.getType()
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.contact !== this.props.contact) {
      this.setState({
        display: 'select'
      })
    }
  }

  trackShip() {
    //let lon = this.props.contact.getCoordinates();
    //console.warn("LAT, LON: ", lat, lon);
    //let coord = [lon, lat];
    //console.warn("COORD 1: ", coord);
    //coord = ol.proj.transform(coord, 'EPSG:4326', this.props.projection);
    //console.warn("COORD 2: ", coord);
    //coord = ol.proj.fromLonLat(coord);
    //console.warn("COORD 3: ", coord);
    //this.props.partner.mapView.setZoom(this.mapView.getZoom());
  }

  quickInfo() {
    let display
    if (this.state.display === 'info') {
      display = 'select'
    } else {
      display = 'info'
    }

    this.setState({
      display: display
    })
  }

  launchPlot() {
    this.display = 'launch'
  }

  convertToClick (e) {
    const evt = new MouseEvent('click', { bubbles: true })
    evt.stopPropagation = () => {}
    e.target.dispatchEvent(evt)
  }


  render() {
    
    

    let style = {
      width: '100%',
      height: 'fit-content',
      transition: 'inherit',
    }

    let button_style = {
      width: '100%',
      height: '20px',
    }

    let elems = ['entity_type', 'mmsi', 'flag', 'report_date_time', ];
    let elem_names = ['Vessel Type: ', 'MMSI: ', 'Country of Origin: ', 'Last Reported: ', ];
    let contact_info = [];
    for (let elem in elems) {
      let new_div = <div>{elem_names[elem]}{this.props.contact.get(elems[elem])}</div>;
      contact_info.push(new_div);
    }
    
    let display = [];
    let buttons = []
    switch(this.state.display) {
      case 'info':
        display.push(contact_info);
        break;
      }
    let info = <div onMouseUp={this.convertToClick}>
        <div className='topLeft' onClick={this.quickInfo}><Icon icon='info'/></div>
      </div>
    let plot = <div onMouseUp={this.convertToClick}>
        <div className='topRight' onClick={this.trackShip}><Icon icon='line-chart'/></div>  
      </div>
    let center = <div onMouseUp={this.convertToClick}>
        <div className='btmLeft' onClick={this.quickInfo}><Icon icon='thumb-tack'/></div>
      </div>
    buttons = [info, plot, center]

    return (
      <div className='shipOptions_container'>
        <div className='contactName'>
          {this.props.contact.get("identity_name")}
        </div>
        <div className='contactLine'></div>
        <div style={style}>
          {display}
          <div className='button_container' style={button_style} >
            {buttons}
          </div>
        </div>
      </div>
      
    );
  }
}

//***********************************************************************
ShipOptions.propTypes = {
  //location: PropTypes.string
};
