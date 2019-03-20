import React from "react";
import ComboBox from "./ComboBox.jsx";
import Range from "./Range.jsx";
import SelectBox from "./SelectBox.jsx";
import DatasetSelector from "./DatasetSelector.jsx";
import { Panel, Button, Row, Col, Tabs, Tab } from "react-bootstrap";
import Icon from "./Icon.jsx";
import Options from "./Options.jsx";
import PropTypes from "prop-types";
import Ice from "./Ice.jsx";
import Bathymetry from "./Bathymetry.jsx";

const i18n = require("../i18n.js");

export default class FoundationTab extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      currentTab: 1,
    };

    // Function bindings
    this.handleTabs = this.handleTabs.bind(this);
  }

  handleTabs(key) {
    this.setState({ currentTab: key, });
  }

  render() {

    const className = this.props.state.sidebarOpen ? "MapInputs open" : "MapInputs";

    return (
      <div className={className}>
        <Tabs //Creates Tabs Container
          activeKey={this.state.currentTab}
          onSelect={this.handleTabs}
          id="MapInputTabs"
        >

          {/* Creates the Data Selection Tab */}
          <Tab eventKey={1} title={<span className='envTabName'>{_("Maps")}</span>}>
            <Panel
              collapsible
              defaultExpanded
              header={_("Maps")}
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
          </Tab>
          <Tab eventKey={2} title={<span className='envTabName'>{_("Charts")}</span>}>

            <Bathymetry
              state={this.props.state}
              swapViews={this.props.swapViews}
              toggleLayer={this.props.toggleLayer}
              reloadLayer={this.props.reloadLayer}
              mapComponent={this.props.mapComponent}
              globalUpdate={this.props.changeHandler}
              showHelp={this.props.showHelp}
              options={this.props.state.options}
              updateOptions={this.props.updateOptions}
            />

          </Tab>
          <Tab eventKey={3} title={<span className='envTabName'>{_("Satellite")}</span>}>
            <Panel
              collapsible
              header={_("Satellite")}
              bsStyle='primary'
            >
            </Panel>
          </Tab>
          <Tab eventKey={4} title={<span className='envTabName'>{_("Aerial")}</span>}>
            <Panel
              collapsible
              header={_("Aerial")}
              bsStyle='primary'
            >

            </Panel>

          </Tab>
        </Tabs>
      </div>


    );
  }
}

//***********************************************************************
FoundationTab.propTypes = {
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
