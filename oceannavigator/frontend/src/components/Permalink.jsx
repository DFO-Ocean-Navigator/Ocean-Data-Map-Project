import React, { useState, useRef } from "react";
import { Button, Card, Form, Row, Col } from "react-bootstrap";
import Icon from "./lib/Icon.jsx";
import PropTypes from "prop-types";
import { withTranslation } from "react-i18next";

const Permalink = ({ generatePermLink, compareDatasets, t: _ }) => {
  const textareaRef = useRef(null);

  // Default options
  const [options, setOptions] = useState({
    dataset0: true,
    dataset1: !!compareDatasets,
    mapSettings: true,
    featureType: true,
    vectorid: true,
    time: true,
  });

  const handleChange = (e) => {
    const { name, checked } = e.target;
    setOptions((opts) => ({ ...opts, [name]: checked }));
  };

  const copyPermalink = () => {
    if (textareaRef.current) {
      textareaRef.current.select();
      try {
        document.execCommand("copy");
      } catch {
        alert(_("Please manually copy the selected text."));
      }
    }
  };

  return (
    <div className="PermaLink">
      <Col>
        <Row>
          <textarea
            ref={textareaRef}
            readOnly
            value={generatePermLink(options)}
            className="form-control"
          />
        </Row>
        <Row>
          <Button
            variant="primary"
            className="pull-right"
            onClick={copyPermalink}
          >
            <Icon icon="copy" /> {_("Copy")}
          </Button>
        </Row>
        <br />
        <Card variant="warning">
          <Card.Header>{_("Select which features to share:")}</Card.Header>
          <Card.Body>
            <Form.Check
              type="checkbox"
              name="dataset0"
              checked={options.dataset0}
              onChange={handleChange}
              label={_("Dataset (Primary/Left Map)")}
            />
            {compareDatasets && (
              <Form.Check
                type="checkbox"
                name="dataset1"
                checked={options.dataset1}
                onChange={handleChange}
                label={_("Dataset (Right Map)")}
              />
            )}
            <Form.Check
              type="checkbox"
              name="mapSettings"
              checked={options.mapSettings}
              onChange={handleChange}
              label={_("Map Settings")}
            />
            <Form.Check
              type="checkbox"
              name="featureType"
              checked={options.featureType}
              onChange={handleChange}
              label={_("Feature Type")}
            />
            <Form.Check
              type="checkbox"
              name="vectorid"
              checked={options.vectorid}
              onChange={handleChange}
              label={_("Vector ID")}
            />
            <Form.Check
              type="checkbox"
              name="time"
              checked={options.time}
              onChange={handleChange}
              label={_("Time")}
            />
          </Card.Body>
        </Card>
      </Col>
    </div>
  );
};

Permalink.propTypes = {
  generatePermLink: PropTypes.func.isRequired,
  compareDatasets: PropTypes.bool,
  t: PropTypes.func.isRequired,
};

export default withTranslation()(Permalink);