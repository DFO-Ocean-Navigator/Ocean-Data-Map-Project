import React from "react";
import { Button, Card, Form, Row, Col, FormCheck } from "react-bootstrap";
import Icon from "./lib/Icon.jsx";
import PropTypes from "prop-types";

import { withTranslation } from "react-i18next";

class Permalink extends React.Component {
  constructor(props) {
    super(props);

    // Default options
    this.state = {
      dataset0: true,
      dataset1: this.props.compareDatasets,
      mapSettings: true,
      featureType: true,
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
    } catch (err) {
      alert("Please manually copy the selected text.");
    }
  }

  handleChange(e) {
    this.setState({ [e.target.name]: e.target.checked });
  }

  render() {
    return (
      <div className="PermaLink">
        <Col>
          <Row>
            <textarea
              ref="permalink"
              type="text"
              id="permalink_area"
              readOnly
              value={this.props.generatePermLink(
                this.state
              )}
            />
          </Row>
          <Row>
            <Button
              variant="primary"
              className="pull-right"
              onClick={this.copyPermalink}
            >
              <Icon icon="copy" /> {_("Copy")}
            </Button>
          </Row>
          <br />
          <Card variant="warning">
            <Card.Header>{_("Select which features to share:")}</Card.Header>
            <Card.Body>
              <Form.Check
                type={"checkbox"}
                checked={this.state.dataset0}
                onChange={this.handleChange}
                name={"dataset0"}
                label={_("Dataset (Primary/Left Map)")}
              />

              {this.props.compareDatasets ? (
                <Form.Check
                  type={"checkbox"}
                  checked={this.state.dataset1}
                  onChange={this.handleChange}
                  name={"dataset1"}
                  label={_("Dataset (Right Map)")}
                />
              ) : null}

              <Form.Check
                type={"checkbox"}
                checked={this.state.mapSettings}
                onChange={this.handleChange}
                name={"mapSettings"}
                label={_("Map Settings")}
              />

              {/* <Card variant="primary">
                <Card.Header>{_("Plot Settings")}</Card.Header>
                <Card.Body>
                  <Form.Check
                    type={"checkbox"}
                    checked={this.state.dataset}
                    name="dataset0"
                    onChange={this.handleChange}
                    label={_("Dataset (Primary/Left Map)")}
                  />
                  <Form.Check
                    type={"checkbox"}
                    checked={this.state.dataset_1}
                    name="dataset1"
                    onChange={this.handleChange}
                    label={_("Dataset (Right Map)")}
                  />
                  <Form.Check
                    type={"checkbox"}
                    checked={this.state.variable}
                    name="variable"
                    onChange={this.handleChange}
                    label={_("Variable")}
                  />
                  <Form.Check
                    type={"checkbox"}
                    checked={this.state.depth}
                    name="depth"
                    onChange={this.handleChange}
                    label={_("Depth")}
                  />
                  <Form.Check
                    type={"checkbox"}
                    checked={this.state.time}
                    name="time"
                    onChange={this.handleChange}
                    label={_("Time")}
                  />
                </Card.Body>
              </Card>
              <Card variant="primary">
                <Card.Header>{_("Global Map Settings")}</Card.Header>
                <Card.Body>
                  <Form.Check
                    type={"checkbox"}
                    checked={this.state.projection}
                    onChange={this.handleChange}
                    label={_("Projection")}
                  />
                  <Form.Check
                    type={"checkbox"}
                    checked={this.state.basemap}
                    onChange={this.handleChange}
                    label={_("Basemap")}
                  />
                  <Form.Check
                    type={"checkbox"}
                    checked={this.state.bathymetry}
                    onChange={this.handleChange}
                    label={_("Bathymetry Contours")}
                  />
                  <Form.Check
                    type={"checkbox"}
                    checked={this.state.dataset_compare}
                    onChange={this.handleChange}
                    label={_("Side-by-side Comparison")}
                  />
                </Card.Body>
              </Card> */}
            </Card.Body>
          </Card>
        </Col>
      </div>
    );
  }
}

//***********************************************************************
Permalink.propTypes = {
  generatePermLink: PropTypes.func,
};

export default withTranslation()(Permalink);

{
  /* <Card variant="warning">
<Card.Header>{_("Advanced")}</Card.Header>
<Card.Body>
  <p>
    {_(
      "Please select which feature's state you would like to be saved."
    )}
  </p>
  <br />
  <Card variant="primary">
    <Card.Header>{_("Plot Settings")}</Card.Header>
    <Card.Body>
      <Form.Check
        type={"checkbox"}
        checked={this.state.dataset}
        name="dataset0"
        onChange={this.handleChange}
        label={_("Dataset (Primary/Left Map)")}
      />
      <Form.Check
        type={"checkbox"}
        checked={this.state.dataset_1}
        name="dataset1"
        onChange={this.handleChange}
        label={_("Dataset (Right Map)")}
      />
      <Form.Check
        type={"checkbox"}
        checked={this.state.variable}
        name="variable"
        onChange={this.handleChange}
        label={_("Variable")}
      />
      <Form.Check
        type={"checkbox"}
        checked={this.state.depth}
        name="depth"
        onChange={this.handleChange}
        label={_("Depth")}
      />
      <Form.Check
        type={"checkbox"}
        checked={this.state.time}
        name="time"
        onChange={this.handleChange}
        label={_("Time")}
      />
    </Card.Body>
  </Card>
  <Card variant="primary">
    <Card.Header>{_("Global Map Settings")}</Card.Header>
    <Card.Body>
      <Form.Check
        type={"checkbox"}
        checked={this.state.projection}
        onChange={this.handleChange}
        label={_("Projection")}
      />
      <Form.Check
        type={"checkbox"}
        checked={this.state.basemap}
        onChange={this.handleChange}
        label={_("Basemap")}
      />
      <Form.Check
        type={"checkbox"}
        checked={this.state.bathymetry}
        onChange={this.handleChange}
        label={_("Bathymetry Contours")}
      />
      <Form.Check
        type={"checkbox"}
        checked={this.state.dataset_compare}
        onChange={this.handleChange}
        label={_("Side-by-side Comparison")}
      />
    </Card.Body>
  </Card> */
}
