/*

  Left Side bar on main page

*/

import React from "react";
import ComboBox from "./ComboBox.jsx";
import CheckBox from "./lib/CheckBox.jsx";
import DatasetSelector from "./DatasetSelector.jsx";
import {Panel, Button, Row, Col, Tabs, Tab} from "react-bootstrap";
import Icon from "./lib/Icon.jsx";
import Options from "./Options.jsx";
import PropTypes from "prop-types";

import { withTranslation } from "react-i18next";

class MapInputs extends React.Component {
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
    _("Show Bathymetry Contours");

    //Creates Main Map Panel
    const inputs = [
      <Panel
        key='left_map_panel'
        defaultExpanded
        bsStyle='primary'
      >
        <Panel.Heading>
          {this.props.dataset_compare ? _("Left Map (Anchor)") : _("Main Map")}
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body>
            <DatasetSelector
              key='map_inputs_dataset_0'
              id='dataset_0'
              onUpdate={this.props.changeHandler}
              options={this.props.options}
              projection={this.props.projection}
              extent={this.props.extent}
            />            
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    ];

    // Creates Right Map Panel when comparing datasets
    if (this.props.dataset_compare) {
      inputs.push(
        <Panel
          key='right_map_panel'
          defaultExpanded
          bsStyle='primary'
        >
          <Panel.Heading>{_("Right Map")}</Panel.Heading>
          <Panel.Collapse>
            <Panel.Body>
              <DatasetSelector
                key='map_inputs_dataset_1'
                id='dataset_1'
                onUpdate={this.props.changeHandler}
                options={this.props.options}
                projection={this.props.projection}
                extent={this.props.extent}
              />
            </Panel.Body>
          </Panel.Collapse>
        </Panel>
      );
    }

    const className = this.props.sidebarOpen ? "MapInputs open" : "MapInputs";

    return (
      <div className={className}>
        
        <Tabs //Creates Tabs Container
          activeKey={this.state.currentTab}
          onSelect={this.handleTabs}
          id="MapInputTabs"
        >

          {/* Creates the Data Selection Tab */}
          <Tab eventKey={1} title={<span><Icon icon="table"/> <span>{_("Data Selection")}</span></span>}>
            <Panel
              defaultExpanded
              bsStyle='primary'
            >
              <Panel.Heading>{_("Data Comparison")}</Panel.Heading>
              <Panel.Collapse>
                <Panel.Body>
                  <Row>
                    <Col xs={9}>
                      <CheckBox
                        id='dataset_compare'
                        checked={this.props.dataset_compare}
                        onUpdate={this.props.changeHandler}
                        title={_("Compare Datasets")}
                      />
                    </Col>
                    <Col xs={3}>
                      <Button 
                        bsStyle="link"
                        key='show_help'
                        id='show_help'
                        onClick={this.props.showHelp}
                      >
                        {_("Help")}
                      </Button>
                    </Col>
                  </Row>
                  <CheckBox
                    id='syncRanges'
                    onUpdate={this.props.changeHandler}
                    title={_("Sync Variable Ranges")}
                    style={{display: this.props.dataset_compare ? "block" : "none"}}
                  />
                  <Button
                    bsStyle="default"
                    block
                    style={{display: this.props.dataset_compare ? "block" : "none"}}
                    onClick={this.props.swapViews}
                  >
                    {_("Swap Views")}
                  </Button>
                </Panel.Body>
              </Panel.Collapse>
            </Panel>
            
            {inputs  /* Renders Side Panel */}
            
          </Tab>

          {/* Creates Settings Tab */}
          <Tab eventKey={2} title={<span><Icon icon="gear"/> <span>{_("Settings")}</span></span>}>

            <Panel    //Settings Panel
              defaultExpanded
              header={_("Map")} 
              bsStyle='primary' 
            >
              <Panel.Heading>{_("Map")}</Panel.Heading>
              <Panel.Collapse>
                <Panel.Body>
                  <ComboBox   //Projection Drop Down - Hardcoded
                    id='projection'
                    state={this.props.projection}
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
                    state={this.props.basemap}
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
                      {
                        id: "chs",
                        value: _("Maritime Chart Service"),
                        attribution: "Government of Canada"
                      }
                    ]}
                    title={_("Basemap")}
                  />
                </Panel.Body>
              </Panel.Collapse>
            </Panel>

            <Options
              options={this.props.options}
              updateOptions={this.props.updateOptions}
            />

          </Tab>
        </Tabs>
        <div className='cookieBanner'>
          This website uses Google Analytics.
          By continuing, you accept the usage of cookies. 
          <a target="_blank" rel="noopener noreferrer" href="https://www.wikihow.com/Disable-Cookies">How to Disable Cookies</a>
        </div>
      </div>
    );
  }
}

//***********************************************************************
MapInputs.propTypes = {
  state: PropTypes.object,
  sidebarOpen: PropTypes.bool,
  basemap: PropTypes.string,
  bathymetry: PropTypes.bool,
  dataset_compare: PropTypes.bool,
  projection: PropTypes.string,
  extent: PropTypes.array,
  changeHandler: PropTypes.func,
  swapViews: PropTypes.func,
  showHelp: PropTypes.func,
  options: PropTypes.object,
  updateOptions: PropTypes.func,
};

export default withTranslation()(MapInputs);
