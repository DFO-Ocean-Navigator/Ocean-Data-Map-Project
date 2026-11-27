import React, { useContext } from "react";
import { Button, ToggleButton } from "react-bootstrap";
import { faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { useTranslation } from "react-i18next";

import { MapToolsContext } from "../contexts/MapContext";

export default function DrawingTools(props) {
  const { setDrawActive, drawFeatureType, setDrawFeatureType } =
    useContext(MapToolsContext);
  const { t } = useTranslation();

  const radios = [
    { name: t("Point"), value: "Point" },
    { name: t("Line"), value: "LineString" },
    { name: t("Area"), value: "Polygon" },
  ];

  const handleRadio = (e) => {
    let type = e.currentTarget.value;
    setDrawFeatureType(type);
  };

  const handleClear = () => {
    props.action("clearFeatures");
  };

  const handleUndo = () => {
    props.action("undoMapFeature");
  };

  const handleClose = () => {
    props.updateUI({ showDrawingTools: false });
    setDrawActive(false);
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
            checked={drawFeatureType === radio.value}
            onChange={handleRadio}
          >
            {radio.name}
          </ToggleButton>
        ))}
      </div>
      <Button className="plot-button" onClick={handleClear}>
        {t("Clear")}
      </Button>
      <Button className="undo-button" onClick={handleUndo}>
        <FontAwesomeIcon icon={faRotateLeft} />
      </Button>
      <Button className="close-button" onClick={handleClose}>
        {t("Close")}
      </Button>
    </div>
  );
}
