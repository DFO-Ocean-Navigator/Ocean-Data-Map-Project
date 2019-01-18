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
            
            let newlayers = this.props.state.layers
            if (type in layers) {
                newlayers.remove(type);
            }

            this.setState({
                layers: newlayers,
            })

        //Remove from Contacts layer
        case false:

            let layers = this.props.state.layers;

            //Create layer
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
            //process.env.GEOSERVER_USER = 'oceannavigator';
            //process.env.GEOSERVER_PASSWORD = ''

            var AUTH = "Basic " + new Buffer(process.env.GEOSERVER_USER + ":" + process.env.GEOSERVER_PASSWORD).toString("base64");
    
            app.get("/proxy", function(req, res) {
            
              var url = req.url.replace("/proxy?url=", "https://gpw.canmarnet.gc.ca/GEO/postgis/ows?service=WFS&version=1.0.0&request=GetFeature&outputFormat=json&typeName=postgis:vi_m_identities_all&srsname=EPSG:3857&CQL_FILTER=BBOX(geopoint, -90, 40, -60, 45)");
            
              console.log(url)
            
              request({
                method: "GET",
                url: url,
                headers: {
                  Authorization: AUTH
                }
              }).pipe(res);
            });

            console.warn(res)
            this.props.changeHandler('layers', newlayers);

    }
  }

  render() {

    this.availableTypes = <ContactButton
                name={this.state.trafficTypes[0]}
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
