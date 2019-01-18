import React from "react";
import ComboBox from "./ComboBox.jsx";
import Range from "./Range.jsx";
import SelectBox from "./SelectBox.jsx";
import DatasetSelector from "./DatasetSelector.jsx";
import {Panel, Button, Row, Col, Tabs, Tab} from "react-bootstrap";
import Icon from "./Icon.jsx";
import Options from "./Options.jsx";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");

export default class SettingsTab extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      currentTab: 1,
    };

    // Function bindings
    this.handleTabs = this.handleTabs.bind(this);
  }

  handleTabs(key) {
    this.setState({currentTab: key,});
  }
 
  render() {
    const className = this.props.state.sidebarOpen ? "MapInputs open" : "MapInputs";
    
    return (
      <div className={className}>
        <Panel    //Settings Panel
          collapsible
          defaultExpanded
          header={_("Map")} 
          bsStyle='primary' 
        >
          <ComboBox   //Projection Drop Down - Hardcoded
            id='projection'
            state={this.props.state.projection}
            onUpdate={this.props.changeHandler}
            data={[
              { id: "EPSG:3857", value: _("Global") },
              { id: "EPSG:32661", value: _("Arctic") },
              { id: "EPSG:3031", value: _("Antarctic") },
            ]}
            title={_("Projection")}
          />
          <ComboBox   //Basemap Drop Down - Hardcoded
            id='basemap'
            state={this.props.state.basemap}
            onUpdate={this.props.changeHandler}
            data={[
              {
                id: "topo",
                value: _("ETOPO1 Topography"),
                attribution: "Topographical Data from ETOPO1 1 Arc-Minute Global Relief Model. NCEI, NESDIR, NOAA, U.S. Department of Commerce."
              },
              {
                id: "ocean",
                value: _("Esri Ocean Basemap"),
                attribution: "Tiles &copy; Esri &mdash; Sources: GEBCO, NOAA, CHS, OSU, UNH, CSUMB, National Geographic, DeLorme, NAVTEQ, and Esri."
              },
              {
                id: "world",
                value: _("Esri World Imagery"),
                attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community."
              },
            ]}
            title={_("Basemap")}
          />

        </Panel>
        <Options
          options={this.props.options}
          updateOptions={this.props.updateOptions}
        />
      </div>
        

    );
  }
}