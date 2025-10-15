import React, { useState } from "react";
import { Accordion, Card, Row, Col } from "react-bootstrap";
import ComboBox from "../ComboBox.jsx";
import CheckBox from "../lib/CheckBox.jsx";
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
  const [size, setSize] = useState(init.size || "10x7");
  const [dpi, setDpi] = useState(init.dpi || 144);
  const [models, setModels] = useState(init.models || []);

  const plot_query = {
    type: "class4",
    class4type,
    dataset,
    forecast: forecast === "Best Estimate" ? "best" : forecast,
    class4id: plotData.id,
    showmap,
    climatology,
    error,
    size,
    dpi,
    models,
  };

  const error_options = [
    { id: "none", value: _("None") },
    { id: "observation", value: _("Value - Observation") },
    { id: "climatology", value: _("Value - Climatology") },
  ];
  //multi-select handler
  const handleModelsUpdate = (_, value) => {
    const newModel =
      Array.isArray(value) && value[0]
        ? Array.isArray(value[0])
          ? value[0][0]
          : value[0]
        : null;

    if (newModel) {
      setModels((prev) =>
        prev.includes(newModel)
          ? prev.filter((m) => m !== newModel)
          : [...prev, newModel]
      );
    }
  };

  const handleErrorUpdate = (_, value) => {
    setError(
      Array.isArray(value)
        ? value[0] || "none"
        : typeof value === "object" && value
        ? value.id || value.value || "none"
        : value || "none"
    );
  };
  return (
    <div className="Class4Window Window">
      <Row>
        <Col lg={2}>
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
                onUpdate={handleModelsUpdate}
                url={`/api/v2.0/class4/models/${class4type}?id=${plotData.id}`}
                title={_("Additional Models")}
              />
              <ComboBox
                id="error"
                state={error}
                def=""
                data={error_options}
                title={_("Show Error")}
                onUpdate={handleErrorUpdate}
              />
              <Accordion>
                <Accordion.Header>{_("Plot Options")}</Accordion.Header>
                <Accordion.Body>
                  <ImageSize
                    id="size"
                    state={size}
                    onUpdate={(_, value) => setSize(value)}
                    title={_("Saved Image Size")}
                  />
                </Accordion.Body>
              </Accordion>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={10}>
          <PlotImage
            query={plot_query}
            permlink_subquery={{
              forecast,
              showmap,
              climatology,
              error,
              size,
              dpi,
              models,
            }}
            action={action}
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
