import React, { useState } from "react";
import { Button, ToggleButton } from "react-bootstrap";
import { faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { withTranslation } from "react-i18next";

function DrawingTools(props) {
  const [vectorType, setVectorType] = useState(props.vectorType);

  const radios = [
    { name: __("Point"), value: "point" },
    { name: __("Line"), value: "line" },
    { name: __("Area"), value: "area" },
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

  const handleSave = () => {
    props.action("saveFeature");
  };


  const handleClose = () => {
    props.updateUI({ showDrawingTools: false });
    props.action("stopDrawing");
  };

  const handlePlot = () => {
    props.action("selectPoints");
    props.updateUI({ modalType: vectorType, showModal: true });
  };

  const plotDisabled =
    (props.vectorType === "point" && props.vectorCoordinates.length < 1) ||
    (props.vectorType === "line" && props.vectorCoordinates.length < 2) ||
    (props.vectorType === "area" && props.vectorCoordinates.length < 3);

  return (
    <div className={"drawing-tools"}>
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

      <Button
        className="plot-button"
        onClick={handlePlot}
        disabled={plotDisabled}
      >
        {__("Plot")}
      </Button>
      <Button className="plot-button" onClick={handleClear}>
      {__("Clear")}
      </Button>

      <Button className="undo-button" onClick={handleUndo}>
        <FontAwesomeIcon icon={faRotateLeft} />
      </Button>
      <Button className="save-button" onClick={handleSave}>
        {__("Save")}
      </Button>
      <Button className="close-button" onClick={handleClose}>
        {__("Close")}
      </Button>
    </div>
  );
}

export default withTranslation()(DrawingTools);
