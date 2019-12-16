import React from "react";
import {Panel, Tabs, Tab} from "react-bootstrap";

const i18n = require("../i18n.js");

export default class DerivedProductsTab extends React.Component {
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
            <Tab eventKey={1} title={<span>{_("Navy")}</span>}>
                <Panel
                  collapsible
                  defaultExpanded
                  header={_("Navy")}
                  bsStyle='primary'
                >
                </Panel>
            </Tab>
            <Tab eventKey={2} title={<span>{_("Army")}</span>}>
                <Panel
                  collapsible
                  header={_("Army")}
                  bsStyle='primary'
                > 
                </Panel>
            </Tab>
            <Tab eventKey={3} title={<span>{_("Air")}</span>}>
                <Panel
                  collapsible
                  header={_("Air")}
                  bsStyle='primary'
                > 
                </Panel>
            </Tab>
        </Tabs>
      </div>
        

    );
  }
}