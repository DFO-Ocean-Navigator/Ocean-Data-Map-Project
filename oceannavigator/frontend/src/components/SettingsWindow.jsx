import React, { useState } from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";

import Icon from "./lib/Icon.jsx";

import { withTranslation } from "react-i18next";

const BASEMAPS = [
  {
    id: "topo",
    value: "ETOPO1 Topography",
    attribution:
      "Topographical Data from ETOPO1 1 Arc-Minute Global Relief Model. NCEI, NESDIR, NOAA, U.S. Department of Commerce.",
  },
  {
    id: "ocean",
    value: "Esri Ocean Basemap",
    attribution:
      "Tiles &copy; Esri &mdash; Sources: GEBCO, NOAA, CHS, OSU, UNH, CSUMB, National Geographic, DeLorme, NAVTEQ, and Esri.",
  },
  {
    id: "world",
    value: "Esri World Imagery",
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community.",
  },
  {
    id: "chs",
    value: "Maritime Chart Service",
    attribution: "Government of Canada",
  },
];

function SettingsWindow(props) {
  const [interpType, setInterpType] = useState(props.mapSettings.interpType);
  const [interpNeighbours, setInterpNeighbours] = useState(
    props.mapSettings.interpNeighbours
  );
  const [interpRadius, setInterpRadius] = useState(
    props.mapSettings.interpRadius
  );
  const [showBathy, setShowBathy] = useState(props.mapSettings.bathymetry);
  const [bathyOpacity, setBathyOpacity] = useState(
    props.mapSettings.mapBathymetryOpacity
  );
  const [bathyContour, setBathyContour] = useState(
    props.mapSettings.bathyContour
  );
  const [topoRelief, setTopoRelief] = useState(
    props.mapSettings.topoShadedRelief
  );

  const basemapOptions = BASEMAPS.map((basemap) => {
    return (
      <option key={`${basemap.id}-option`} value={basemap.id}>
        {basemap.value}
      </option>
    );
  });

  const handleInterpChange = () => {
    let newNeighbours = Number(interpNeighbours);
    newNeighbours = newNeighbours > 50 ? 50 : newNeighbours;
    newNeighbours = newNeighbours < 1 ? 1 : newNeighbours;

    let newRadius = Number(interpRadius);
    newRadius = newRadius > 100 ? 100 : newRadius;
    newRadius = newRadius < 5 ? 5 : newRadius;

    props.updateMapSettings("interpType", interpType);
    props.updateMapSettings("interpNeighbours", newNeighbours);
    props.updateMapSettings("interpRadius", newRadius);

    setInterpNeighbours(newNeighbours);
    setInterpRadius(newRadius);
  };

  const handleBathyChange = () => {
    let newOpacity = Number(bathyOpacity);
    newOpacity = newOpacity > 1 ? 1 : newOpacity;
    newOpacity = newOpacity < 0 ? 0 : newOpacity;

    props.updateMapSettings("bathymetry", showBathy);
    props.updateMapSettings("mapBathymetryOpacity", newOpacity);
    props.updateMapSettings("bathyContour", bathyContour);
    props.updateMapSettings("topoShadedRelief", topoRelief);

    setBathyOpacity(newOpacity);
  };

  return (
    <>
      <Card>
        <Card.Header>{__("Map")}</Card.Header>
        <Card.Body className="settings-card">
          <InputGroup>
            <Form.Label>{__("Projection")}</Form.Label>
            <Form.Select
              value={props.mapSettings.projection}
              onChange={(e) => {
                props.updateMapSettings("projection", e.target.value);
              }}
            >
              <option value="EPSG:3857">{"Global"}</option>
              <option value="EPSG:32661">{"Arctic"}</option>
              <option value="EPSG:3031">{"Antarctic"}</option>
            </Form.Select>
          </InputGroup>
          <InputGroup>
            <Form.Label>{__("Basemap")}</Form.Label>
            <Form.Select
              value={props.mapSettings.basemap}
              onChange={(e) => {
                props.updateMapSettings("basemap", e.target.value);
              }}
            >
              {basemapOptions}
            </Form.Select>
          </InputGroup>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header>{__("Colour Interpolation")}</Card.Header>
        <Card.Body className="settings-card">
          <InputGroup>
            <Form.Label>{__("Method")}</Form.Label>
            <Form.Select
              value={interpType}
              onChange={(e) => setInterpType(e.target.value)}
            >
              <option value="gaussian">{"Gaussian Weighting (Default)"}</option>
              <option value="bilinear">{"Bilinear"}</option>
              <option value="inverse">{"Inverse Square"}</option>
              <option value="nearest">{"Nearest Neighbour"}</option>
            </Form.Select>
          </InputGroup>

          <InputGroup>
            <Form.Label>{__("Sampling Radius (km)")}</Form.Label>
            <input
              type="number"
              value={interpRadius}
              min={5}
              max={100}
              onChange={(e) => setInterpRadius(e.target.value)}
            />
          </InputGroup>

          <InputGroup>
            <Form.Label>{__("Nearest Neighbours")}</Form.Label>
            <input
              type="number"
              min={1}
              max={50}
              value={interpNeighbours}
              onChange={(e) => setInterpNeighbours(e.target.value)}
            />
          </InputGroup>

          <Button
            variant="primary"
            className="center-block"
            onClick={handleInterpChange}
          >
            <Icon icon="check" />
            {__("Apply")}
          </Button>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header>{__("Bathymetry")}</Card.Header>
        <Card.Body className="settings-card">
          <Form.Check
            type="checkbox"
            id="bathy-checkbox"
            label="Show Bathymetry Contours"
            onChange={(e) => setShowBathy(e.target.checked)}
            checked={showBathy}
          />

          <InputGroup>
            <Form.Label>{__("Bathymetry Opacity")}</Form.Label>
            <input
              type="number"
              min={0.0}
              max={1.0}
              step={0.05}
              value={bathyOpacity}
              onChange={(e) => setBathyOpacity(e.target.value)}
            />
          </InputGroup>

          <InputGroup>
            <Form.Label>{__("Bathymetry Layer")}</Form.Label>
            <Form.Select
              onChange={(e) => setBathyContour(e.target.value)}
              value={bathyContour}
            >
              <option value="etopo1">{"ETOPO1"}</option>
            </Form.Select>
          </InputGroup>

          <Form.Check
            type="checkbox"
            id="topoShadedRelief"
            label={__("Topography Shaded Relief")}
            checked={topoRelief}
            onChange={(e) => setTopoRelief(e.target.checked)}
          />
          <Button
            variant="primary"
            className="center-block"
            onClick={handleBathyChange}
          >
            <Icon icon="check" />
            {__("Apply")}
          </Button>
        </Card.Body>
      </Card>
    </>
  );
}

export default withTranslation()(SettingsWindow);
