import React from "react";
import {Button, Well, Panel, Checkbox, Row} from "react-bootstrap";
import Icon from "./Icon.jsx";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");

export default class Permalink extends React.Component {
  constructor(props) {
    super(props);

    // Default options
    this.state = {
      center: true,
      projection: true,
      basemap: false,
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

    // Function bindings
    this.handleChange = this.handleChange.bind(this);
    this.copyPermalink = this.copyPermalink.bind(this);
  }

  copyPermalink() {
    this.refs.permalink.select();

    try {
      document.execCommand("copy");
    } catch(err) {
      alert("Please manually copy the selected text.");
    }
  }

  handleChange(e) {
    this.setState({[e.target.name]: e.target.checked});
  }

  render() {
    return (
      <div className="PermaLink">
        <Well bsSize="small">
          <Row>
            <textarea
              ref="permalink"
              type="text"
              id="permalink_area"
              readOnly
              value={this.props.generatePermLink("permaLinkSettings", this.state)}
            />
          </Row>
          <Row>
            <Button
              bsStyle="primary"
              className="pull-right"
              onClick={this.copyPermalink}
            ><Icon icon="copy" /> {_("Copy")}</Button>
          </Row>
        </Well>

        <br />
        <Panel
          defaultExpanded
          bsStyle="warning"
        >
          <Panel.Heading>{_("Advanced")}</Panel.Heading>
          <Panel.Collapse>
            <Panel.Body>
              <p>{_("Please select which feature's state you would like to be saved.")}</p>
              <br />
              <form>
                <Panel
                  defaultExpanded 
                  bsStyle='primary' 
                >
                  <Panel.Heading>{_("Global Map Settings")}</Panel.Heading>
                  <Panel.Collapse>
                    <Panel.Body>
                      <Checkbox 
                        checked={this.state.projection}
                        name="projection"
                        onChange={this.handleChange}
                      >{_("Projection")}</Checkbox>
                      <Checkbox
                        checked={this.state.basemap}
                        name="basemap"
                        onChange={this.handleChange}
                      >{_("Basemap")}</Checkbox>
                      <Checkbox
                        checked={this.state.bathymetry}
                        name="bathymetry"
                        onChange={this.handleChange}
                      >{_("Bathymetry Contours")}</Checkbox>
                      <Checkbox
                        checked={this.state.dataset_compare}
                        name="dataset_compare"
                        onChange={this.handleChange}
                      >{_("Side-by-side Comparison")}</Checkbox>
                    </Panel.Body>
                  </Panel.Collapse>
                </Panel>
                <Panel
                  defaultExpanded
                  bsStyle="primary"
                >
                  <Panel.Heading>{_("View Settings")}</Panel.Heading>
                  <Panel.Collapse>
                    <Panel.Body>
                      <Checkbox
                        checked={this.state.zoom}
                        name="zoom"
                        onChange={this.handleChange}
                      >{_("Zoom")}</Checkbox>
                      <Checkbox
                        checked={this.state.dataset}
                        name="dataset"
                        onChange={this.handleChange}
                      >{_("Dataset (Primary/Left Map)")}</Checkbox>
                      <Checkbox
                        checked={this.state.dataset_1}
                        name="dataset_1"
                        onChange={this.handleChange}
                      >{_("Dataset (Right Map)")}</Checkbox>
                      <Checkbox
                        checked={this.state.variable}
                        name="variable"
                        onChange={this.handleChange}
                      >{_("Variable")}</Checkbox>
                      <Checkbox
                        checked={this.state.depth}
                        name="depth"
                        onChange={this.handleChange}
                      >{_("Depth")}</Checkbox>
                      <Checkbox
                        checked={this.state.time}
                        name="time"
                        onChange={this.handleChange}
                      >{_("Time")}</Checkbox>
                    </Panel.Body>
                  </Panel.Collapse>
                </Panel>
              </form>
            </Panel.Body>
          </Panel.Collapse>
        </Panel>
      </div>
    );
  }
}

//***********************************************************************
Permalink.propTypes = {
  generatePermLink: PropTypes.func,
};
