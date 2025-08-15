import React, { useState } from "react";
import { Accordion, Card, Row, Col } from "react-bootstrap";
import ComboBox from "./ComboBox.jsx";
import CheckBox from "./lib/CheckBox.jsx";
import ImageSize from "./ImageSize.jsx";
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

  const onLocalUpdate = (key, value) => {
    switch (key) {
      case "forecast":
        return setForecast(value);
      case "showmap":
        return setShowmap(value);
      case "climatology":
        return setClimatology(value);
      case "error":
        return setError(value);
      case "size":
        return setSize(value);
      case "dpi":
        return setDpi(value);
      case "models":
        return setModels(value);
      default:
        return;
    }
  };

  const plot_query = {
    type: "class4",
    class4type,
    dataset,
    forecast,
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
                url={`/api/v2.0/class4/forecasts/${class4type}?id=${plotData.id}`}
                title={_("Forecast")}
                onUpdate={onLocalUpdate}
              />
              <CheckBox
                id="showmap"
                checked={showmap}
                onUpdate={onLocalUpdate}
                title={_("Show Location")}
              >
                {_("showmap_help")}
              </CheckBox>
              <CheckBox
                id="climatology"
                checked={climatology}
                onUpdate={onLocalUpdate}
                title={_("Show Climatology")}
              >
                {_("climatology_help")}
              </CheckBox>
              <ComboBox
                id="models"
                state={models}
                multiple
                url={`/api/v2.0/class4/models/${class4type}?id=${plotData.id}`}
                title={_("Additional Models")}
                onUpdate={onLocalUpdate}
              />
              <ComboBox
                id="error"
                state={error}
                data={error_options}
                title={_("Show Error")}
                onUpdate={onLocalUpdate}
              />
              <Accordion>
                <Accordion.Header>{_("Plot Options")}</Accordion.Header>
                <Accordion.Body>
                  <ImageSize
                    id="size"
                    state={size}
                    onUpdate={onLocalUpdate}
                    title={_("Saved Image Size")}
                  />
                </Accordion.Body>
              </Accordion>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={10} className="plot-col">
          <PlotImage
            query={plot_query} // For image saving link.
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
