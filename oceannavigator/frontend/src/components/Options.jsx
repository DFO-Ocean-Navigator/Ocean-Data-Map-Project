import React, { useState } from "react";
import { Row, FormControl, ControlLabel, Col, Card, Button } from "react-bootstrap";
import Icon from "./lib/Icon.jsx";
import CheckBox from "./lib/CheckBox.jsx";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

const Options = ({ options, updateOptions }) => {
  const { t: _ } = useTranslation();

  // Local state mirrors props.options
  const [interpType, setInterpType] = useState(options.interpType);
  const [interpRadius, setInterpRadius] = useState(options.interpRadius);
  const [interpNeighbours, setInterpNeighbours] = useState(options.interpNeighbours);
  const [bathymetry, setBathymetry] = useState(options.bathymetry);
  const [bathyContour, setBathyContour] = useState(options.bathyContour);
  const [mapBathymetryOpacity, setMapBathymetryOpacity] = useState(options.mapBathymetryOpacity);
  const [topoShadedRelief, setTopoShadedRelief] = useState(options.topoShadedRelief);

  const handleApply = () => {
    updateOptions({
      interpType,
      interpRadius,
      interpNeighbours,
      bathymetry,
      bathyContour,
      mapBathymetryOpacity,
      topoShadedRelief,
    });
  };

  return (
    <div>
      <Card defaultExpanded bsStyle="primary">
        <Card.Header>{_("Colour Interpolation")}</Card.Header>
        <Card.Body>
          <Row>
            <Col md={4}>
              <ControlLabel>{_("Method")}</ControlLabel>
            </Col>
            <Col md={8}>
              <FormControl
                componentClass="select"
                value={interpType}
                onChange={e => setInterpType(e.target.value)}
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
                value={interpRadius}
                onChange={e => setInterpRadius(Number(e.target.value))}
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
                value={interpNeighbours}
                onChange={e => setInterpNeighbours(Number(e.target.value))}
              />
            </Col>
          </Row>
          <Row>
            <br />
            <Button bsStyle="primary" className="center-block" onClick={handleApply}>
              <Icon icon="check" /> {_("Apply")}
            </Button>
          </Row>
        </Card.Body>
      </Card>

      <Card defaultExpanded bsStyle="primary">
        <Card.Header>{_("Bathymetry")}</Card.Header>
        <Card.Body>
          <Row>
            <Col md={12}>
              <CheckBox
                id="bathymetry"
                checked={bathymetry}
                onUpdate={(_, val) => setBathymetry(val)}
                title={_("Show Bathymetry Contours")}
              />
            </Col>
          </Row>
          <Row>
            <Col md={4}>
              <ControlLabel>{_("Bathymetry Opacity")}</ControlLabel>
            </Col>
            <Col md={8}>
              <input
                type="number"
                min={0.0}
                max={1.0}
                step={0.05}
                value={mapBathymetryOpacity}
                onChange={e => setMapBathymetryOpacity(Number(e.target.value))}
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
                value={bathyContour}
                onChange={e => setBathyContour(e.target.value)}
              >
                <option value="etopo1">{_("ETOPO1")}</option>
              </FormControl>
            </Col>
          </Row>
          <Row>
            <Col md={12}>
              <CheckBox
                id="topoShadedRelief"
                checked={topoShadedRelief}
                onUpdate={(_, val) => setTopoShadedRelief(val)}
                title={_("Topography Shaded Relief")}
              />
            </Col>
          </Row>
          <Row>
            <br />
            <Button bsStyle="primary" className="center-block" onClick={handleApply}>
              <Icon icon="check" /> {_("Apply")}
            </Button>
          </Row>
        </Card.Body>
      </Card>
    </div>
  );
};

Options.propTypes = {
  options: PropTypes.shape({
    interpType: PropTypes.string,
    interpRadius: PropTypes.number,
    interpNeighbours: PropTypes.number,
    bathymetry: PropTypes.bool,
    bathyContour: PropTypes.string,
    mapBathymetryOpacity: PropTypes.number,
    topoShadedRelief: PropTypes.bool,
  }).isRequired,
  updateOptions: PropTypes.func.isRequired,
};

export default Options;
