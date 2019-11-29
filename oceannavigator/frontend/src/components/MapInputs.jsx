/*

  Left Side bar on main page

*/

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

export default class MapInputs extends React.Component {
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
    _("Variable Range");
    _("Show Bathymetry Contours");

    //Creates Main Map Panel
    const inputs = [
      <Panel
        key='left_map_panel'
        collapsible
        defaultExpanded
        header={this.props.state.dataset_compare ? _("Left Map (Anchor)") : _("Main Map")}
        bsStyle='primary'
      >
        <DatasetSelector
          id='dataset_0'
          state={this.props.state}
          onUpdate={this.props.changeHandler}
          depth={true}
        />
        <Range
          id='scale'
          state={this.props.state.scale}
          setDefaultScale={this.props.state.setDefaultScale}
          def=''
          onUpdate={this.props.changeHandler}
          onSubmit={this.props.changeHandler}
          title={_("Variable Range")}
          autourl={"/api/v1.0/range/" +
                  this.props.state.dataset + "/" + 
                  this.props.state.variable + "/" +
                  this.props.options.interpType + "/" +
                  this.props.options.interpRadius + "/" +
                  this.props.options.interpNeighbours + "/" +
                  this.props.state.projection + "/" +
                  this.props.state.extent.join(",") + "/" +
                  this.props.state.depth + "/" +
                  this.props.state.time +  ".json"
          }
          dataset_compare={this.props.state.dataset_compare}
          default_scale={this.props.state.variable_scale}
        ></Range>
      </Panel>
    ];

    // Creates Right Map Panel when comparing datasets
    if (this.props.state.dataset_compare) {
      inputs.push(
        <Panel
          key='right_map_panel'
          collapsible
          defaultExpanded
          header={_("Right Map")}
          bsStyle='primary'
        >
          <DatasetSelector 
            id='dataset_1'
            state={this.props.state.dataset_1}
            onUpdate={this.props.changeHandler}
            depth={true}
          />
          <Range
            key='scale_1'
            id='scale_1'
            state={this.props.state.scale_1}
            setDefaultScale={this.props.state.setDefaultScale}
            def=''
            onUpdate={this.props.changeHandler}
            title={_("Variable Range")}
            autourl={"/api/v1.0/range/" +
                    this.props.state.dataset_1.dataset + "/" +
                    this.props.state.dataset_1.variable + "/" +
                    this.props.options.interpType + "/" +
                    this.props.options.interpRadius + "/" +
                    this.props.options.interpNeighbours + "/" +
                    this.props.state.projection + "/" +
                    this.props.state.extent.join(",") + "/" +
                    this.props.state.dataset_1.depth + "/" +
                    this.props.state.dataset_1.time + ".json"
            }
            default_scale={this.props.state.dataset_1.variable_scale}
          ></Range>
        </Panel>
      );
    }

    if (this.props.private === true) {
      this.settings_panel = undefined;
    } else {
      this.settings_panel = <Tab eventKey={2} title={<span><Icon icon="gear"/> <span>{_("Settings")}</span></span>}>

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

      </Tab>
    }
    const className = this.props.state.sidebarOpen ? "MapInputs open" : "MapInputs";

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
              collapsible
              defaultExpanded
              header={_("Data Comparison")}
              bsStyle='primary'
            >
              <Row>
                <Col xs={9}>
                  <SelectBox
                    id='dataset_compare'
                    state={this.props.state.dataset_compare}
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
              <SelectBox
                id='syncRanges'
                onUpdate={this.props.changeHandler}
                title={_("Sync Variable Ranges")}
                style={{display: this.props.state.dataset_compare ? "block" : "none"}}
              />
              <Button
                bsStyle="default"
                block
                style={{display: this.props.state.dataset_compare ? "block" : "none"}}
                onClick={this.props.swapViews}
              >
                {_("Swap Views")}
              </Button>
            </Panel>
            
            {inputs  /* Renders Side Panel */}
            
          </Tab>

          {/* Creates Settings Tab */}
          {this.settings_panel}
        </Tabs>
        
      </div>
    );
  }
}

//***********************************************************************
MapInputs.propTypes = {
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
