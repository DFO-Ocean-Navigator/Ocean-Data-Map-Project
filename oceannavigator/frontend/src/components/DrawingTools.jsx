import React, { useState } from "react";
import { Button, ToggleButton } from "react-bootstrap";
import { faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

function DrawingTools(props) {
  const [drawingType, setDrawingType] = useState("point")

  const radios = [
    { name: "Point", value: "point" },
    { name: "Line", value: "line" },
    { name: "Area", value: "area" },
  ];

  const handleRadio = (e) => {
    let type = e.currentTarget.value;
    setDrawingType(type)
    props.action("drawingType", type);
  };

  const handleClear = () => {
    props.action("clearPoints");
  };

  const handleUndo = () => {
    props.action("undoPoints");
  };

  const handleCancel = () => {
    props.updateUI("showDrawingTools", !props.uiSettings.showDrawingTools);
    props.action("stopDrawing");
  };

  const handlePlot = () => {
    props.updateUI("modalType", drawingType);
  };

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
            checked={props.drawingType === radio.value}
            onChange={handleRadio}
          >
            {radio.name}
          </ToggleButton>
        ))}
      </div>

      <Button className="plot-button" onClick={handlePlot}>Plot</Button>
      <Button className="plot-button" onClick={handleClear}>
        Clear
      </Button>

      <Button className="undo-button" onClick={handleUndo}>
        <FontAwesomeIcon icon={faRotateLeft} />
      </Button>
      <Button className="cancel-button" onClick={handleCancel}>
        Cancel
      </Button>
    </div>
  );
}

export default DrawingTools;
