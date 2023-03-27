import React, { useState, useRef } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDrawPolygon,
  faTableList,
  faGear,
  faKeyboard,
  faSatelliteDish,
  faInfo,
} from "@fortawesome/free-solid-svg-icons";

import { Button, OverlayTrigger, Tooltip } from "react-bootstrap";

function MapTools(props) {
  const mapToolsRef = useRef(null);

  const handleDrawing = () => {
    if (!props.uiSettings.showDrawingTools) {
      props.updateUI({ showDrawingTools: true, showObservationTools: false });
      props.action("startDrawing");
    } else {
      props.updateUI({ showDrawingTools: false, showObservationTools: false });
      props.action("stopDrawing");
    }
  };

  const handleEnterPoints = () => {
    props.updateUI({ modalType: "enterCoords", showModal: true });
  };

  const handlePresetFeatures = () => {
    props.updateUI({ modalType: "presetFeatures", showModal: true });
  };

  const handleObservations = () => {
    if (!props.uiSettings.showObservationTools) {
      props.updateUI({ showDrawingTools: false, showObservationTools: true });
    } else {
      props.updateUI({ showDrawingTools: false, showObservationTools: false });
    }
  };

  const handleSettings = () => {
    props.updateUI({ modalType: "settings", showModal: true });
  };

  return (
    <>
      <div className="MapTools" ref={mapToolsRef}>
        <Button className="tool-button" onClick={handleDrawing}>
          <FontAwesomeIcon icon={faDrawPolygon} />
        </Button>
        <Button className="tool-button" onClick={handleEnterPoints}>
          <FontAwesomeIcon icon={faKeyboard} />
        </Button>
        <Button className="tool-button" onClick={handlePresetFeatures}>
          <FontAwesomeIcon icon={faTableList} />
        </Button>
        <Button className="tool-button">
          <FontAwesomeIcon
            icon={faSatelliteDish}
            onClick={handleObservations}
          />
        </Button>
        <Button className="tool-button">
          <FontAwesomeIcon icon={faGear} onClick={handleSettings} />
        </Button>
        <Button className="tool-button">
          <FontAwesomeIcon icon={faInfo} />
        </Button>
      </div>
    </>
  );
}

export default MapTools;
