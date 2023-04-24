import React, { useState } from "react";
import { Button, ToggleButton } from "react-bootstrap";
import { faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

function DrawingTools(props) {
  const [vectorType, setVectorType] = useState(props.vectorType);

  const radios = [
    { name: "Point", value: "point" },
    { name: "Line", value: "line" },
    { name: "Area", value: "area" },
  ];

  const handleRadio = (e) => {
    let type = e.currentTarget.value;
    setVectorType(type);
    props.action("vectorType", type);
  };

  const handleClear = () => {
    props.action("clearPoints");
  };

  const handleUndo = () => {
    props.action("undoPoints");
  };

  const handleClose = () => {
    props.updateUI({ showDrawingTools: false });
    props.action("stopDrawing");
  };

  const handlePlot = () => {
    props.action("selectPoints");
    props.updateUI({ modalType: vectorType, showModal: true });
  };

  return (
    <div className={`drawing-tools ${props.compareDatasets? "compare" : ""}`}>
      <div>
        {radios.map((radio, idx) => (
          <ToggleButton
            className="plot-toggle"
            key={idx}
            id={`radio-${idx}`}
            type="radio"
            name="radio"
            value={radio.value}
            checked={props.vectorType === radio.value}
            onChange={handleRadio}
          >
            {radio.name}
          </ToggleButton>
        ))}
      </div>

      <Button className="plot-button" onClick={handlePlot}>
        Plot
      </Button>
      <Button className="plot-button" onClick={handleClear}>
        Clear
      </Button>

      <Button className="undo-button" onClick={handleUndo}>
        <FontAwesomeIcon icon={faRotateLeft} />
      </Button>
      <Button className="close-button" onClick={handleClose}>
        Close
      </Button>
    </div>
  );
}

export default DrawingTools;
