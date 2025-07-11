import React, { useState, useEffect } from "react";
import { Row, Button, OverlayTrigger, Tooltip, Form } from "react-bootstrap";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

const CustomPlotLabels = ({ id, title, plotTitle, updatePlotTitle }) => {
  const { t: _ } = useTranslation();
  const [userProvidedTitle, setUserProvidedTitle] = useState(plotTitle);

  // Sync state when plotTitle prop changes
  useEffect(() => {
    setUserProvidedTitle(plotTitle);
  }, [plotTitle]);

  const handleChange = e => {
    setUserProvidedTitle(e.target.value);
  };

  const handleSubmit = e => {
    if (e.target.id === id) {
      e.preventDefault();
    }
    updatePlotTitle(userProvidedTitle);
  };

  return (
    <div className="custom-plot-labels">
      <h1 className="plot-label-title">{title}</h1>
      <Row>
        <Form
          id={id}
          onSubmit={handleSubmit}
          style={{ paddingLeft: "15px", paddingRight: "15px" }}
        >
          <Form.Control
            type="text"
            value={userProvidedTitle || ""}
            onChange={handleChange}
            placeholder={_("Default")}
            style={{ width: "83%" }}
          />
          <OverlayTrigger
            placement="right"
            overlay={<Tooltip id="tooltip">{_("Apply Title")}</Tooltip>}
          >
            <Button onClick={handleSubmit}>Apply</Button>
          </OverlayTrigger>
        </Form>
      </Row>
    </div>
  );
};

CustomPlotLabels.propTypes = {
  id: PropTypes.string,
  title: PropTypes.string,
  plotTitle: PropTypes.string,
  updatePlotTitle: PropTypes.func.isRequired,
};

export default CustomPlotLabels;
