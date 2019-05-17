import React from "react";
import {Row, FormControl, ControlLabel, Col, Panel, Button} from "react-bootstrap";
import NumericInput from "react-numeric-input";
import Icon from "./Icon.jsx";
import SelectBox from "./SelectBox.jsx";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");

export default class Options extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      // Interpolation
      interpType: props.options.interpType,
      interpRadius: props.options.interpRadius,
      interpNeighbours: props.options.interpNeighbours,
      // Map
      bathymetry: props.options.bathymetry,
      mapBathymetryOpacity: props.options.mapBathymetryOpacity,
      topoShadedRelief: props.options.topoShadedRelief,
    };

    this.updateOptions = this.updateOptions.bind(this);
  }

  updateOptions(key, value) {
    const newOptions = this.state;

    newOptions[key] = value;

    this.setState({options: newOptions});
  }

  render() {
   
    return (
      <div>
        <Panel
          collapsible
          defaultExpanded
          header={_(" Colour Interpolation")}
          bsStyle='primary'
        >
          <Row>
            <Col md={4}>
              <ControlLabel>{_("Method")}</ControlLabel>
            </Col>
            <Col md={8}>
              <FormControl
                componentClass="select"
                onChange={event => this.updateOptions("interpType", event.target.value)}
                value={this.state.interpType}
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
              <NumericInput 
                min={5}
                max={100}
                value={this.state.interpRadius}
                onChange={value => this.updateOptions("interpRadius", value) }
              />
            </Col>
          </Row>
          <Row>
            <Col md={4}>
              <ControlLabel>{_("Nearest Neighbours")}</ControlLabel>
            </Col>
            <Col md={8}>
              <NumericInput
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
              <Icon icon="check"/> 
              {_("Apply")}
            </Button>
          </Row>
        </Panel>
      
        <Panel
          collapsible
          defaultExpanded
          header={_("Map")}
          bsStyle='primary'
        >
          <Row>
            <Col md={4}>
              <ControlLabel>{_("Bathemetry Opacity")}</ControlLabel>
            </Col>
            <Col md={8}>
              <NumericInput
                min={0.0}
                max={1.0}
                step={0.05}
                precision={2}
                value={this.state.mapBathymetryOpacity}
                onChange={value => this.updateOptions("mapBathymetryOpacity", value)}
              />
            </Col>
          </Row>
          <SelectBox
            id='bathymetry'
            state={this.state.bathymetry}
            onUpdate={(e, val) => {this.setState({"bathymetry": val,});} }
            title={_("Show Bathymetry Contours")}
          />
          <SelectBox
            id='topoShadedRelief'
            state={this.state.topoShadedRelief}
            onUpdate={(e, val) => {this.setState({"topoShadedRelief": val,});}}
            title={_("Topography Shaded Relief")}
          />
          <Row>
            <br />
            <Button
              bsStyle="primary"
              className="center-block"
              onClick={e => this.props.updateOptions(this.state)}
            >
              <Icon icon="check"/> 
              {_("Apply")}
            </Button>
          </Row>
        </Panel>
      </div>
    );
  }
}

//***********************************************************************
Options.propTypes = {
  options: PropTypes.object,
  updateOptions: PropTypes.func,
};