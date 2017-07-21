import React from "react";
import {Button, Well, Panel, Checkbox} from "react-bootstrap";
import Icon from "./Icon.jsx";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");

class Permalink extends React.Component {
  constructor(props) {
    super(props);

    // Default options
    this.state = {
      projection: true,
      basemap: true,
      bathymetry: false,
      dataset_compare: false,
      zoom: true,
      dataset: true,
      dataset_1: false,
      variable: true,
      depth: true,
      vectortype: true,
      vectorid: true,
      time: true,
    };
  }

  selectPermalink() {
    this.refs.permalink.select();
  }

  handleChange(e) {
    this.setState({[e.target.name]: e.target.checked});
    this.selectPermalink();
  }

  render() {
    return (
      <div className="PermaLink">
        <Well bsSize="small">
          <textarea
            ref="permalink"
            type="text"
            id="permalink_area"
            readOnly
            value={this.props.generatePermLink("permaLinkSettings", this.state)}
          />
          <Button
            bsStyle="primary"
            className="pull-right"
            onClick={function() {
              this.selectPermalink();
            }.bind(this)}><Icon icon="copy" /> {_("Copy")}</Button>
        </Well>

        <br />
        <Panel
          collapsible
          header={_("Advanced")}
          bsStyle="warning"
        >
          <p>{_("Please select which feature's state you would like to be saved.")}</p>
          <br />
          <form>
            <Panel
              collapsible
              header={_("Global Map Settings")}
              defaultExpanded 
              bsStyle='primary' 
            >
              <Checkbox 
                checked={this.state.projection}
                name="projection"
                onChange={this.handleChange.bind(this)}
              >{_("Projection")}</Checkbox>
              <Checkbox
                checked={this.state.basemap}
                name="basemap"
                onChange={this.handleChange.bind(this)}
              >{_("Basemap")}</Checkbox>
              <Checkbox
                checked={this.state.bathymetry}
                name="bathymetry"
                onChange={this.handleChange.bind(this)}
              >{_("Bathymetry Contours")}</Checkbox>
              <Checkbox
                checked={this.state.dataset_compare}
                name="dataset_compare"
                onChange={this.handleChange.bind(this)}
              >{_("Side-by-side Comparison")}</Checkbox>
            </Panel>
            <Panel
              collapsible
              header={_("View Settings")}
              defaultExpanded
              bsStyle="primary"
            >
              <Checkbox
                checked={this.state.zoom}
                name="zoom"
                onChange={this.handleChange.bind(this)}
              >{_("Zoom")}</Checkbox>
              <Checkbox
                checked={this.state.dataset}
                name="dataset"
                onChange={this.handleChange.bind(this)}
              >{_("Dataset (Primary/Left View)")}</Checkbox>
              <Checkbox
                checked={this.state.dataset_1}
                name="dataset_1"
                onChange={this.handleChange.bind(this)}
              >{_("Dataset (Right View)")}</Checkbox>
              <Checkbox
                checked={this.state.variable}
                name="variable"
                onChange={this.handleChange.bind(this)}
              >{_("Variable")}</Checkbox>
              <Checkbox
                checked={this.state.depth}
                name="depth"
                onChange={this.handleChange.bind(this)}
              >{_("Depth")}</Checkbox>
              <Checkbox
                checked={this.state.time}
                name="time"
                onChange={this.handleChange.bind(this)}
              >{_("Time")}</Checkbox>
            </Panel>
          </form>
        </Panel>
      </div>
    );
  }
}

//***********************************************************************
Permalink.propTypes = {
  generatePermLink: PropTypes.func,
};

export default Permalink;