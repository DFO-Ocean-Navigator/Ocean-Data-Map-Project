import React, { useState, useEffect } from "react";
import { Row, Button, OverlayTrigger, Tooltip, Form } from "react-bootstrap";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

const CustomPlotLabels = ({ id, title, plotTitle, updatePlotTitle }) => {
  const { t: _ } = useTranslation();
  const [userProvidedTitle, setUserProvidedTitle] = useState(plotTitle);

  // Sync state when plotTitle prop changes
  useEffect(() => {
    setUserProvidedTitle(plotTitle); //Holds user defined plot title
  }, [plotTitle]);

  //Updates new title value as user types
  //Changes stored title value
  const handleChange = (e) => {
    setUserProvidedTitle(e.target.value);
  };

  //Updates title on button click
  const handleSubmit = (e) => {
    if (e.target.id === id) {
      e.preventDefault();
    }
    updatePlotTitle(userProvidedTitle);
  };

  return (
    <div className="custom-plot-labels">
      <h1 className="plot-label-title">{title}</h1>
      <Row>
        <Form //Keeps everything in the same row
          id={id}
          onSubmit={handleSubmit}
          style={{ paddingLeft: "15px", paddingRight: "15px" }}
        >
          {/* Updated Plot Title Input Field*/}
          <Form.Control
            type="text"
            value={userProvidedTitle || ""}
            onChange={handleChange}
            placeholder={_("Default")}
            style={{ width: "83%" }}
          />
          {/* Update Plot Title Button */}
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

//***********************************************************************
CustomPlotLabels.propTypes = {
  id: PropTypes.string,
  title: PropTypes.string,
  plotTitle: PropTypes.string,
  updatePlotTitle: PropTypes.func.isRequired,
};

export default CustomPlotLabels;
