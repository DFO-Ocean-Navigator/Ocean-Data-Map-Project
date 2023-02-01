import React, { useState } from "react";
import { Button, ToggleButton } from "react-bootstrap";
import { faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

function DrawingTools(props) {
  const [radioValue, setRadioValue] = useState("1");

  const radios = [
    { name: "Point", value: "1" },
    { name: "Line", value: "2" },
    { name: "Area", value: "3" },
  ];

  return (
    <div className="drawing-tools">
      <div>
        {radios.map((radio, idx) => (
          <ToggleButton
            className="plot-toggle"
            key={idx}
            id={`radio-${idx}`}
            type="radio"
            name="radio"
            value={radio.value}
            checked={radioValue === radio.value}
            onChange={(e) => setRadioValue(e.currentTarget.value)}
          >
            {radio.name}
          </ToggleButton>
        ))}
      </div>

      <Button className="plot-button">Plot</Button>
      <Button className="cancel-button">Cancel</Button>
      <Button className="undo-button">
        <FontAwesomeIcon icon={faRotateLeft} />
      </Button>
    </div>
  );
}

export default DrawingTools;
