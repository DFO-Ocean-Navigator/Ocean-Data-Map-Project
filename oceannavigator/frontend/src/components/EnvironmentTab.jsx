import React from "react";
import ComboBox from "./ComboBox.jsx";
import Range from "./Range.jsx";
import SelectBox from "./SelectBox.jsx";
import DatasetSelector from "./DatasetSelector.jsx";
import {Panel, Button, Row, Col, Tabs, Tab} from "react-bootstrap";
import Icon from "./Icon.jsx";
import Options from "./Options.jsx";
import PropTypes from "prop-types";
import Oceanography from "./Oceanography.jsx";
import Ice from "./Ice.jsx"

const i18n = require("../i18n.js");

export default class EnvironmentTab extends React.Component {
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
          id="MapInputTabs"
        >

          {/* Creates the Data Selection Tab */}
            <Tab eventKey={1} title={<span>{_("Oceanography")}</span>}>
                <Oceanography
                    state={this.props.state}
                    swapViews={this.props.swapViews}
                    changeHandler={this.props.changeHandler}
                    showHelp={this.props.showHelp}
                    options={this.props.state.options}
                    updateOptions={this.props.updateOptions}
                />
            </Tab>
            <Tab eventKey={2} title={<span>{_("Meteorology")}</span>}>
                <Panel
                  collapsible
                  header={_("Meteorology")}
                  bsStyle='primary'
                > 
                </Panel>
            </Tab>
            <Tab eventKey={3} title={<span>{_("Ice")}</span>}>
                <Ice
                  state={this.props.state}
                  swapViews={this.props.swapViews}
                  changeHandler={this.props.changeHandler}
                  showHelp={this.props.showHelp}
                  options={this.props.state.options}
                  updateOptions={this.props.updateOptions}
                />
            </Tab>
        </Tabs>
      </div>
        

    );
  }
}

//***********************************************************************
EnvironmentTab.propTypes = {
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
