import React from "react";
import { Checkbox, Panel } from "react-bootstrap";

const i18n = require("../i18n.js");

export default class SettingsTab extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      currentTab: 1,
    };

    // Function bindings
    this.updateFeature = this.updateFeature.bind(this);
  }

  updateFeature(e) {
    this.props.globalUpdate(e.target.id, !this.props.state[e.target.id])
  }
 
  render() {
    const className = this.props.state.sidebarOpen ? "MapInputs open" : "MapInputs";
    let all_tabs = {
      _foundation: _('Foundation'),
      _environment: _('Environment'),
      _intelligence: _('Intelligence'),
      _derived: _('Derived Products'),
      _planning: _('Planning Tools')

    }
    let check_boxes = []

    for (let tab in this.props.state.allowedTabs) {
      if (this.props.state.allowedTabs[tab] === true) {
        check_boxes.push(<Checkbox
          id={tab}
          key={tab}
          checked={this.props.state[tab]}
          onChange={this.updateFeature}
        >
          {all_tabs[tab]}
        </Checkbox>)
      }
      
    }

    return (
        <Panel
              collapsible
              defaultExpanded
              header={_("Enabled Features")}
              bsStyle='primary'
        >
          {check_boxes} 
        </Panel>

    );
  }
}