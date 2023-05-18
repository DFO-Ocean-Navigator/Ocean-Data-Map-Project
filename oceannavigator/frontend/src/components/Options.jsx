import React from "react";
import { Row, FormControl, ControlLabel, Col, Card, Button } from "react-bootstrap";
// import NumericInput from "react-numeric-input";
import Icon from "./lib/Icon.jsx";
import CheckBox from "./lib/CheckBox.jsx";
import PropTypes from "prop-types";

import { withTranslation } from "react-i18next";

class Options extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      // Interpolation
      interpType: props.options.interpType,
      interpRadius: props.options.interpRadius,
      interpNeighbours: props.options.interpNeighbours,
      // Map
      bathymetry: props.options.bathymetry,
      bathyContour: props.options.bathyContour,
      mapBathymetryOpacity: props.options.mapBathymetryOpacity,
      topoShadedRelief: props.options.topoShadedRelief,
    };

    this.updateOptions = this.updateOptions.bind(this);
  }

  updateOptions(key, value) {
    const newOptions = this.state;

    newOptions[key] = value;

    this.setState({ options: newOptions });
  }

  render() {

    return (
      <div>
        <Card
          defaultExpanded
          bsStyle='primary'
        >
          <Card.Header>{_("Colour Interpolation")}</Card.Header>
            <Card.Body>
              <Row>
                <Col md={4}>
                  <ControlLabel>{_("Method")}</ControlLabel>
                </Col>
                <Col md={8}>
                  <FormControl
                    componentClass="select"
                    onChange={event => this.updateOptions("interpType", event.target.value)}
                    value={this.props.options.interpType}
                  >
                    <option value="gaussian">{_("Gaussian Weighting (Default)")}</option>
                    <option value="bilinear">{_("Bilinear")}</option>
                    <option value="inverse">{_("Inverse Square")}</option>
                    <option value="nearest">{_("Nearest Neighbour")}</option>
                  </FormControl>
                </Col>
              </Row>
              <Row>
                <Col md={4}>
                  <ControlLabel>{_("Sampling Radius (km)")}</ControlLabel>
                </Col>
                <Col md={8}>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={this.state.interpRadius}
                    onChange={value => this.updateOptions("interpRadius", value)}
                  />
                </Col>
              </Row>
              <Row>
                <Col md={4}>
                  <ControlLabel>{_("Nearest Neighbours")}</ControlLabel>
                </Col>
                <Col md={8}>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={this.state.interpNeighbours}
                    onChange={value => this.updateOptions("interpNeighbours", value)}
                  />
                </Col>
              </Row>
              <Row>
                <br />
                <Button
                  bsStyle="primary"
                  className="center-block"
                  onClick={e => this.props.updateOptions(this.state)}
                >
                  <Icon icon="check" />
                  {_("Apply")}
                </Button>
              </Row>
            </Card.Body>
        </Card>

        <Card
          defaultExpanded
          bsStyle='primary'
        >
          <Card.Header>{_("Bathymetry")}</Card.Header>
            <Card.Body>
              <Row>
                <Col md={12}>
                  <CheckBox
                    id='bathymetry'
                    checked={this.state.bathymetry}
                    onUpdate={(e, val) => { this.setState({ "bathymetry": val, }); }}
                    title={_("Show Bathymetry Contours")}
                  />
                </Col>
              </Row>
              <Row>
                <Col md={4}>
                  <ControlLabel>{_("Bathemetry Opacity")}</ControlLabel>
                </Col>
                <Col md={8}>
                  <input
                    type="number"
                    min={0.0}
                    max={1.0}
                    step={0.05}
                    precision={2}
                    value={this.state.mapBathymetryOpacity}
                    onChange={val => { this.setState({ "mapBathymetryOpacity": val, }); }}
                  />
                </Col>
              </Row>
              <Row>
                <Col md={4}>
                  <ControlLabel>{_("Bathymetry Layer")}</ControlLabel>
                </Col>
                <Col md={8}>
                  <FormControl
                    componentClass="select"
                    onChange={event => { this.setState({ "bathyContour": event.target.value, }); }}
                    value={this.state.bathyContour}
                  >
                    <option value="etopo1">{_("ETOPO1")}</option>
                  </FormControl>
                </Col>
              </Row>
              <Row>
                <Col md={12}>
                  <CheckBox
                    id='topoShadedRelief'
                    checked={this.state.topoShadedRelief}
                    onUpdate={(e, val) => { this.setState({ "topoShadedRelief": val, }); }}
                    title={_("Topography Shaded Relief")}
                  />
                </Col>
              </Row>
              <Row>
                <br />
                <Button
                  bsStyle="primary"
                  className="center-block"
                  onClick={e => this.props.updateOptions(this.state)}
                >
                  <Icon icon="check" />
                  {_("Apply")}
                </Button>
              </Row>
            </Card.Body>
        </Card>
      </div>
    );
  }
}

//***********************************************************************
Options.propTypes = {
  options: PropTypes.object,
  updateOptions: PropTypes.func,
};

export default withTranslation()(Options);
