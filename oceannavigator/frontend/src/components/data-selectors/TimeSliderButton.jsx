import React from "react";
import Button from "react-bootstrap/Button";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

function TimeSliderButton(props) {
  return (
    <OverlayTrigger
      placement="top"
      overlay={<Tooltip>{props.tooltipText}</Tooltip>}
    >
      <span>
        <Button
          className="slider-button"
          onClick={props.onClick}
          disabled={props.disabled}
        >
          {props.icon}
        </Button>
      </span>
    </OverlayTrigger>
  );
}

export default TimeSliderButton;
