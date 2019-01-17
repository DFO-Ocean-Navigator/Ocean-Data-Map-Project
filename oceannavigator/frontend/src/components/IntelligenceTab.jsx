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
      
    
    return (
      <div>
        <Tabs //Creates Tabs Container
          activeKey={this.state.currentTab}
          onSelect={this.handleTabs}
          id="IntelligenceTab"
        >

          {/* Creates the Data Selection Tab */}
            <Tab eventKey={1} title={<span><Icon icon="table"/> <span>{_("Contacts")}</span></span>}>
                <Panel
                  collapsible
                  defaultExpanded
                  header={_("Contacts")}
                  bsStyle='primary'
                >
                </Panel>
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