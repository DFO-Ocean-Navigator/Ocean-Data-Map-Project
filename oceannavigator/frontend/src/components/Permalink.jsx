import React from "react";
import {Button, Well, Panel, Checkbox} from "react-bootstrap";
import Icon from "./Icon.jsx";

const i18n = require("../i18n.js");

class Permalink extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      projection: true,
      basemap: true,
      bathymetry: false,
      dataset_compare: true,
      zoom: true,
      dataset: true,
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
            style={{height: "10em",}}
            value={this.props.generatePermLink("permaLinkSettings", this.state)}
          />
          <Button
            bsStyle="primary"
            style={{float: "right",}}
            onClick={function() {
              this.selectPermalink();
            }.bind(this)}><Icon icon="copy" /> {_("Copy")}</Button>
        </Well>

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
                defaultChecked
                name="projection"
                onChange={this.handleChange.bind(this)}
              >{_("Projection")}</Checkbox>
              <Checkbox
                defaultChecked
                name="basemap"
                onChange={this.handleChange.bind(this)}
              >{_("Basemap")}</Checkbox>
              <Checkbox
                name="bathymetry"
                onChange={this.handleChange.bind(this)}
              >{_("Bathymetry Contours")}</Checkbox>
              <Checkbox
                defaultChecked
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
                defaultChecked
                name="zoom"
                onChange={this.handleChange.bind(this)}
              >{_("Zoom")}</Checkbox>
              <Checkbox
                defaultChecked
                name="dataset"
                onChange={this.handleChange.bind(this)}
              >{_("Dataset (Primary/Left View)")}</Checkbox>
              <Checkbox
                defaultChecked
                name="variable"
                onChange={this.handleChange.bind(this)}
              >{_("Variable")}</Checkbox>
              <Checkbox
                defaultChecked
                name="depth"
                onChange={this.handleChange.bind(this)}
              >{_("Depth")}</Checkbox>
              <Checkbox
                defaultChecked
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

export default Permalink;