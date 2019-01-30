import React from "react";
import ComboBox from "./ComboBox.jsx";
import Range from "./Range.jsx";
import SelectBox from "./SelectBox.jsx";
import DatasetSelector from "./DatasetSelector.jsx";
import {Panel, Button, Row, Col, Tabs, Tab} from "react-bootstrap";
import Icon from "./Icon.jsx";
import Options from "./Options.jsx";
import PropTypes from "prop-types";
import Contacts from "./Contacts.jsx";

const i18n = require("../i18n.js");

export default class IntelligenceTab extends React.Component {
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
        <Tabs //Creates Tabs Container
          activeKey={this.state.currentTab}
          onSelect={this.handleTabs}
          id="IntelligenceTab"
        >

          {/* Creates the Data Selection Tab */}
            <Tab eventKey={1} title={<span>{_("Contacts")}</span>}>
                <Contacts
                  state={this.props.state}
                  swapViews={this.props.swapViews}
                  toggleLayer={this.props.toggleLayer}
                  reloadLayer={this.props.reloadLayer}
                  mapComponent={this.props.mapComponent}
                  changeHandler={this.props.changeHandler}
                  showHelp={this.props.showHelp}
                  options={this.props.state.options}
                  updateOptions={this.props.updateOptions}
                />
            </Tab>
            <Tab eventKey={2} title={<span>{_("Events")}</span>}>
                <Panel
                  collapsible
                  header={_("Events")}
                  bsStyle='primary'
                > 
                </Panel>
            </Tab>
            <Tab eventKey={3} title={<span>{_("Other")}</span>}>
                <Panel
                  collapsible
                  header={_("Other")}
                  bsStyle='primary'
                > 
                </Panel>
            </Tab>
        </Tabs>
      </div>
        

    );
  }
}

IntelligenceTab.propTypes = {
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