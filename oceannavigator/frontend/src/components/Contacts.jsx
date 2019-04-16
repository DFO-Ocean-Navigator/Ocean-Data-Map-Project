import React from "react";
import ComboBox from "./ComboBox.jsx";
import Range from "./Range.jsx";
import SelectBox from "./SelectBox.jsx";
import DatasetSelector from "./DatasetSelector.jsx";
import {Panel, Button, Row, Col, Tabs, Tab} from "react-bootstrap";
import Icon from "./Icon.jsx";
import Options from "./Options.jsx";
import PropTypes from "prop-types";
import ContactButton from "./ContactButton.jsx";
import ol from "openlayers";



const i18n = require("../i18n.js");

export default class Contacts extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      currentTab: 1,
      trafficTypes: ['Marine Traffic'],
      displayTraffic: true
    };



    // Function bindings
    this.toggleTraffic = this.toggleTraffic.bind(this);
    this.getType = this.getType.bind(this);
  }

  componentDidMount() {
    //this.getType()
  }

  //Adds or remove traffic 
  toggleTraffic(type, status) {

    //Status is true if it is currently being displayed on the map
    switch(status) {
        //Remove from Contacts layer
        case true:
          
            this.props.mapComponent.toggleLayer(this.layer_contacts, 'remove')
            this.setState({
              displayTraffic: true
            })
            break;
        
        //Add to Contacts layer
        case false:
            this.setState({
              displayTraffic: false
            })
            this.props.mapComponent.removeMapInteractions('Circle')
            
            //CREATE A VECTOR SOURCE
            let vectorSource = new ol.source.Vector({wrapX: false})
            
            
            var draw = new ol.interaction.Draw({
              source: vectorSource,
              type: 'Circle',
              stopClick: true
            })
            this.props.mapComponent._drawing = true;
            
            draw.on("drawend", function(e) {
              // Disable zooming when drawing
              this.props.mapComponent.controlDoubleClickZoom(false);
              let geometry = e.feature.clone().getGeometry();
              geometry.transform(this.props.state.projection, "EPSG:4326")
              let draw_radius = geometry.getRadius();
              let draw_center = geometry.getCenter();
              console.warn("HERE")

              var vectorLoader = function() {
                var url = 'https://gpw.canmarnet.gc.ca/BETA-GEO/postgis/ows?service=WFS&version=1.0.0&srs=EPSG:3857&request=GetFeature&typeName=postgis:v2_m_identities&outputFormat=application%2Fjson&CQL_FILTER=DWITHIN(geopoint,Point(' + draw_center[0] + ' ' + draw_center[1] +'),' + draw_radius + ',kilometers)' // BBOX' //+ geopoint
                var xhr = new XMLHttpRequest();
                xhr.open('GET', url);
                var onError = function() {
                  vectorSource.removeLoadedExtent(extent);
                }
                xhr.onerror = onError;
                let username = '';
                let password = '';
                xhr.setRequestHeader("Authorization", btoa(username + ':' + password));
                xhr.onload = function() {
                  if (xhr.status == 200) {
                    vectorSource.addFeatures(
                        vectorSource.getFormat().readFeatures(xhr.responseText));
                  } else {
                    onError();
                  }
                }
                xhr.send();
              }.bind(this);
              
              let new_vectorSource = new ol.source.Vector({
                url: 'https://gpw.canmarnet.gc.ca/GEO/postgis/ows?service=WFS&version=1.0.0&srs=' + this.props.state.projection + '&request=GetFeature&typeName=postgis:vi_m_identities_all&outputFormat=application%2Fjson&CQL_FILTER=DWITHIN(geopoint,Point(' + draw_center[0] + ' ' + draw_center[1] +'),' + draw_radius + ',kilometers)', // BBOX' //+ geopoint
                //loader: vectorLoader,
                format: new ol.format.GeoJSON(),
              })
              
              

              //Places a circle on the map
              new_vectorSource.addFeature(e.feature)
              console.warn(e.feature)
              console.warn(new_vectorSource)
              
              this.layer_contacts = new ol.layer.Vector({
                projection: this.props.state.projection,
                source: new_vectorSource,
                style: function(feat, res) {
                  const red = 255;
                  //const green = Math.min(255, 255 * (1 - feat.get("error_norm")) / 0.5);
                  
                  return new ol.style.Style({
                    stroke: new ol.style.Stroke({
                      color: "#000000",
                      width: 1,
                    }),
                    
                    image: new ol.style.Circle({
                      radius: 4,
                      fill: new ol.style.Fill({
                        color: [red, red, 0, 1],
                      }),
                      stroke: new ol.style.Stroke({
                        color: "#000000",
                        width: 1
                      }),
                    })
                  });
                }

              });

              // ADDS LAYER TO THE MAP
              this.props.mapComponent.toggleLayer(this.layer_contacts, 'add')

              this.props.mapComponent.map.removeInteraction(draw);
              
              this.props.mapComponent.drawing = false;
        
              setTimeout(
                function() { this.props.mapComponent.controlDoubleClickZoom(true); }.bind(this),
                251
              );
            }.bind(this));
          
            this.props.mapComponent.map.addInteraction(draw)
            break;
            
    }
  }

  getType() {
    $.ajax({
      url: 'https://gpw.canmarnet.gc.ca/GEO/postgis/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=postgis:vi_m_identity_types&maxFeatures=50&outputFormat=application%2Fjson'
      ,
      dataType: "json",
      cache: true,
      
      //If server returns status code of 200 / it worked - Ajax call successful
      //
      // data filled by ajax
      //
      success: function (data) {
        pass
      }.bind(this),
    
      // On fail...
      error: function (xhr, status, err) {  
        if (this._mounted) {
          console.error("FAILED TO LOAD");
        }
      }.bind(this)
    });
  }

  render() {
    let availableTypes = []
    let self = this;
    this.state.trafficTypes.forEach(function(type) {
      availableTypes.push(<ContactButton
        key={type + '_key'}
        name={type}
        displayTraffic={self.state.displayTraffic}
        toggleTraffic={self.toggleTraffic}
    />)
    })
    
    return (
        <div>
            <Panel
                  collapsible
                  defaultExpanded
                  header={_("Contacts")}
                  bsStyle='primary'
                >

                {availableTypes}
{/*
<Button key='remove' disabled={!this.state.displayTraffic} onClick={this.clear}>
                    Remove Contacts
                </Button>
*/}
                
            </Panel>
        </div>
    );
  }
}

//***********************************************************************
Contacts.propTypes = {
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
  changeHandler: PropTypes.func,
  swapViews: PropTypes.func,
  showHelp: PropTypes.func,
  options: PropTypes.object,
  updateOptions: PropTypes.func,
  private: PropTypes.bool,
};
