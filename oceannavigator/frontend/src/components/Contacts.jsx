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
import * as olsource from "ol/source";
import * as olcontrol from "ol/control";
import * as olformat from "ol/format";
import * as olstyle from "ol/style";

import ShipOptions from "./ShipOptions.jsx";


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
    this.singleClick = this.singleClick.bind(this);
  }
  
  /*
    Function called on single click of the map
    
    Requires: Contact (feature), pixel (screen location)
    Ensures: Returns Component/HTML
  
  */
  singleClick(feature, pixel) {
    if (feature.get('identity_name') === undefined) {
      return
    }
    
    const contactInfo = <ShipOptions
            key='selectedContact'
            contact={feature}
            pixel={pixel}
            projection={this.props.state.projection}
          ></ShipOptions>
    return contactInfo

  }

  //Adds or remove traffic 
  toggleTraffic(type, status) {

    //Status is true if it is currently being displayed on the map
    switch (status) {
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
        let vectorSource = new olsource.Vector({
          wrapX: false,
          crossOrigin: 'anonymous'
        })


        var draw = new olcontrol.interaction.Draw({
          source: vectorSource,
          type: 'Circle',
          stopClick: true
        })
        this.props.mapComponent.toggleDrawing(true)


        // Handles selecting the contacting area, and loading the contacts
        draw.on("drawend", function (e) {

          // Disable zooming when drawing
          this.props.mapComponent.controlDoubleClickZoom(false);
          let geometry = e.feature.clone().getGeometry();
          let transformed_geo = e.feature.clone().getGeometry();
          transformed_geo.transform(this.props.state.projection, "EPSG:4326")
          let draw_radius = geometry.getRadius();
          let draw_center = geometry.getCenter();
          
          let transformed_center = transformed_geo.getCenter()
          let edgeCoordinate = [draw_center[0] + draw_radius, draw_center[1]];
          let wgs84Sphere = new ol.Sphere(6378137)
          let groundRadius = wgs84Sphere.haversineDistance(
            ol.proj.transform(draw_center, 'EPSG:3857', 'EPSG:4326'),
            ol.proj.transform(edgeCoordinate, 'EPSG:3857', 'EPSG:4326')
          )

          
          let new_vectorSource

          // Create URL for contacts
          let url = 'https://gpw.canmarnet.gc.ca/BETA-GEO/wfs?service=wfs&version=2.0.0&srsname=' + this.props.state.projection + '&request=GetFeature&typeNames=postgis:v2_m_identities&outputFormat=application%2Fjson&count=500&CQL_FILTER=DWITHIN(geopoint,Point(' + transformed_center[1] + '%20' + transformed_center[0] + '),' + groundRadius + ',meters)'
          url = encodeURIComponent(url)

          // Proxy URL
          const localUrl = "/api/v1.0/contacts/?query=" + url
          
          // Add proxy to Layer
          new_vectorSource = new olsource.Vector({
            url: localUrl,   
            format: new olformat.GeoJSON(),
            
          })

          //Places a circle on the map
          new_vectorSource.addFeature(e.feature)
          
          // Create Contacts Layer
          this.layer_contacts = new ol.layer.Vector({
            projection: this.props.state.projection,
            source: new_vectorSource,
            style: function (feat, res) {
              const red = 255;
              //const green = Math.min(255, 255 * (1 - feat.get("error_norm")) / 0.5);

              return new ol.style.Style({
                stroke: new ol.style.Stroke({
                  color: "#000000",
                  width: 8,
                }),

                image: new ol.style.Circle({
                  radius: 6,
                  fill: new ol.style.Fill({
                    color: [red, red, 0, 1],
                  }),
                  stroke: new ol.style.Stroke({
                    color: "#000000",
                    width: 2
                  }),
                })
              });
            }

          });
          
          // Add function to handle single click on map
          this.layer_contacts.set('singleClick', this.singleClick)

          // Add Layer to map
          this.props.mapComponent.toggleLayer(this.layer_contacts, 'add')
          this.props.mapComponent.map.removeInteraction(draw);

          // This should be changed to use the drawing function
          this.props.mapComponent._drawing = false;

          setTimeout(
            function () { this.props.mapComponent.controlDoubleClickZoom(true); }.bind(this),
            251
          );
        }.bind(this));

        this.props.mapComponent.map.addInteraction(draw)
        break;

    }
  }


  /*
    NOT WORKING - Invalid URL

    Should fetch the possible types of Marine Traffic Available From Source
  */
  getType() {
    $.ajax({
      url: 'https://gpw.canmarnet.gc.ca/GEO/postgis/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=postgis:vi_m_identity_types&maxFeatures=50&outputFormat=application%2Fjson'
      ,
      dataType: "json",
      cache: true,

      success: function (data) {
        pass
      }.bind(this),
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
    this.state.trafficTypes.forEach(function (type) {
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
