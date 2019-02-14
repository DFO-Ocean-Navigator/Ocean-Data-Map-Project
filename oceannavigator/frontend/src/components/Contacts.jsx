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
      trafficTypes: ['All', 'Fishing'],
      displayTraffic: true
    };



    // Function bindings
    this.toggleTraffic = this.toggleTraffic.bind(this);
  }

  //addTrafficLayer() {
  //  if ()
  //}


  //Adds or remove traffic 
  toggleTraffic(type, status) {

    //Status is true if it is currently being displayed on the map
    switch(status) {
        //Add to Contacts layer
        case true:
          
            this.props.toggleLayer(this.layer_contacts, 'remove')
            this.setState({
              displayTraffic: true
            })
            break;
        
        //Remove from Contacts layer
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
              
              let geometry = e.feature.getGeometry();
              geometry = geometry.clone().transform(this.props.state.projection, "EPSG:4326")
              let draw_radius = geometry.getRadius();
              let draw_center = geometry.getCenter();
                

              
              let boats_url = '' // BBOX' //+ geopoint
              
              
              let vectorSource = new ol.source.Vector({
                url: boats_url,
                format: new ol.format.GeoJSON(),
              })
              

              //Places a circle on the map
              let feature = new ol.Feature(geometry)
              vectorSource.addFeature(feature)

              this.layer_contacts = new ol.layer.Vector({
                source: vectorSource,
                style: function(feat, res) {
                  const red = 255;
                  //const green = Math.min(255, 255 * (1 - feat.get("error_norm")) / 0.5);
                  
                  return new ol.style.Style({
                    image: new ol.style.Circle({
                      radius: 4,
                      fill: new ol.style.Fill({
                        color: [red, red, 0, 1],
                      }),
                      stroke: new ol.style.Stroke({
                        color: "#000000",
                        width: 1
                      }),
                    }),
                  });
                }

              });

              // ADDS LAYER TO THE MAP
              this.props.toggleLayer(this.layer_contacts, 'add')

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

  render() {

    this.availableTypes = <ContactButton
                name={this.state.trafficTypes[0]}
                displayTraffic={this.state.displayTraffic}
                toggleTraffic={this.toggleTraffic}
            />
    
    

    
    return (
        <div>
            <Panel
                  collapsible
                  defaultExpanded
                  header={_("Contacts")}
                  bsStyle='primary'
                >

                {this.availableTypes}

                <Button disabled={!this.state.displayTraffic} onClick={this.clear}>
                    Remove Contacts
                </Button>
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
