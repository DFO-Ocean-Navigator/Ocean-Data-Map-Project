import React, { useState } from "react";
import { Accordion, Card, Row, Col, Nav } from "react-bootstrap";
import ComboBox from "../ComboBox.jsx";
import CheckBox from "../lib/CheckBox.jsx";
import SelectBox from "../lib/SelectBox.jsx";
import ImageSize from "../ImageSize.jsx";
import PlotImage from "./PlotImage.jsx";
import PropTypes from "prop-types";
import { withTranslation } from "react-i18next";

const Class4Window = ({
  dataset,
  class4type,
  plotData,
  init = {},
  action,
  t: _,
}) => {
  const [forecast, setForecast] = useState(init.forecast || "best");
  const [showmap, setShowmap] = useState(init.showmap || false);
  const [climatology, setClimatology] = useState(init.climatology || false);
  const [error, setError] = useState(init.error || "none");
  const [plotSize, setPlotSize] = useState(init?.size || "10x7");
  const [plotDpi, setPlotDpi] = useState(init?.dpi || 144);
  const [models, setModels] = useState(init.models || []);

  const handleErrorUpdate = (_, value) => {
    setError(
      Array.isArray(value)
        ? value[0] || "none"
        : typeof value === "object" && value
          ? value.id || value.value || "none"
          : value || "none",
    );
  };

  const updatePlotSize = (key, value) => {
    if (key === "size") {
      setPlotSize(value);
    } else if (key === "dpi") {
      setPlotDpi(value);
    }
  };

  const plotQuery = {
    class4type,
    dataset,
    forecast: forecast,
    class4id: plotData.id,
    showmap,
    climatology,
    error,
    models,
  };

  const permlink_subquery = {
    forecast,
    showmap,
    climatology,
    error,
    size: plotSize,
    dpi: plotDpi,
    models,
  };

  const error_options = [
    { id: "none", value: _("None") },
    { id: "observation", value: _("Value - Observation") },
    { id: "climatology", value: _("Value - Climatology") },
  ];

  return (
    <div className="Class4Window">
      <Nav variant="tabs" activeKey={1}>
        <Nav.Item>
          <Nav.Link eventKey={1} disabled>
            {_("Class4")}
          </Nav.Link>
        </Nav.Item>
      </Nav>
      <Row className="plot-window-container">
        <Col className="settings-col" lg={2}>
          <Card>
            <Card.Header>{_("Class 4 Settings")}</Card.Header>
            <Card.Body>
              <ComboBox
                id="forecast"
                state={forecast}
                def=""
                url={`/api/v2.0/class4/forecasts/${class4type}?id=${plotData.id}`}
                title={_("Forecast")}
                onUpdate={(_, value) => setForecast(value)}
              />
              <CheckBox
                id="showmap"
                checked={showmap}
                onUpdate={(_, value) => setShowmap(value)}
                title={_("Show Location")}
              >
                {_("showmap_help")}
              </CheckBox>
              <CheckBox
                id="climatology"
                checked={climatology}
                onUpdate={(_, value) => setClimatology(value)}
                title={_("Show Climatology")}
              >
                {_("climatology_help")}
              </CheckBox>
              <ComboBox
                id="models"
                state={models}
                multiple
                onUpdate={(_, value) => setModels(value)}
                url={`/api/v2.0/class4/models/${class4type}?id=${plotData.id}`}
                title={_("Additional Models")}
              />
              <SelectBox
                id="error"
                selected={error}
                options={error_options}
                label={_("Show Error")}
                onChange={handleErrorUpdate}
              />
              <Accordion>
                <Accordion.Header>{_("Plot Options")}</Accordion.Header>
                <Accordion.Body>
                  <ImageSize
                    id="size"
                    onUpdate={updatePlotSize}
                    title={_("Saved Image Size")}
                  />
                </Accordion.Body>
              </Accordion>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={10} className="plot-col">
          <PlotImage
            plotType="class4"
            query={plotQuery}
            permlink_subquery={permlink_subquery}
            featureId={plotData.id}
            action={action}
            size={plotSize}
            dpi={plotDpi}
          />
        </Col>
      </Row>
    </div>
  );
};
//***********************************************************************
Class4Window.propTypes = {
  dataset: PropTypes.string.isRequired,
  class4type: PropTypes.string.isRequired,
  plotData: PropTypes.object.isRequired,
  init: PropTypes.object,
  action: PropTypes.func,
  t: PropTypes.func.isRequired,
};

export default withTranslation()(Class4Window);
