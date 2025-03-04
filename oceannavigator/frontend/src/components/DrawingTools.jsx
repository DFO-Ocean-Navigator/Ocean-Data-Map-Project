import React from "react";
import { Button, ToggleButton } from "react-bootstrap";
import { faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { withTranslation } from "react-i18next";

function DrawingTools(props) {
  const radios = [
    { name: __("Point"), value: "Point" },
    { name: __("Line"), value: "LineString" },
    { name: __("Area"), value: "Polygon" },
  ];

  const handleRadio = (e) => {
    let type = e.currentTarget.value;
    props.action("featureType", type);
  };

  const handleClear = () => {
    props.action("clearFeatures");
  };

  const handleUndo = () => {
    props.action("undoMapFeature");
  };

  const handleClose = () => {
    props.updateUI({ showDrawingTools: false });
    props.action("stopFeatureDraw");
  };

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
            checked={props.featureType === radio.value}
            onChange={handleRadio}
          >
            {radio.name}
          </ToggleButton>
        ))}
      </div>
      <Button className="plot-button" onClick={handleClear}>
        {__("Clear")}
      </Button>
      <Button className="undo-button" onClick={handleUndo}>
        <FontAwesomeIcon icon={faRotateLeft} />
      </Button>
      <Button className="close-button" onClick={handleClose}>
        {__("Close")}
      </Button>
    </div>
  );
}

export default withTranslation()(DrawingTools);
