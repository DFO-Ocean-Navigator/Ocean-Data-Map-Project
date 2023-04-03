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

import Button from "react-bootstrap/Button";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

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
        <OverlayTrigger
          key={"draw-overlay"}
          placement="left"
          container={mapToolsRef}
          overlay={
            <Tooltip id={"draw-tooltip"}>Draw Point Coordinates</Tooltip>
          }
        >
          <Button className="tool-button" onClick={handleDrawing}>
            <FontAwesomeIcon icon={faDrawPolygon} />
          </Button>
        </OverlayTrigger>

        <OverlayTrigger
          key={"enter-overlay"}
          placement="left"
          container={mapToolsRef}
          overlay={
            <Tooltip id={"enter-tooltip"}>Enter Point Coordinates</Tooltip>
          }
        >
          <Button className="tool-button" onClick={handleEnterPoints}>
            <FontAwesomeIcon icon={faKeyboard} />
          </Button>
        </OverlayTrigger>

        <OverlayTrigger
          key={"preset-overlay"}
          placement="left"
          container={mapToolsRef}
          overlay={<Tooltip id={"preset-tooltip"}>Preset Features</Tooltip>}
        >
          <Button className="tool-button" onClick={handlePresetFeatures}>
            <FontAwesomeIcon icon={faTableList} />
          </Button>
        </OverlayTrigger>

        <OverlayTrigger
          key={"obs-overlay"}
          placement="left"
          container={mapToolsRef}
          overlay={<Tooltip id={"obs-tooltip"}>Observations</Tooltip>}
        >
          <Button className="tool-button">
            <FontAwesomeIcon
              icon={faSatelliteDish}
              onClick={handleObservations}
            />
          </Button>
        </OverlayTrigger>

        <OverlayTrigger
          key={"settings-overlay"}
          placement="left"
          container={mapToolsRef}
          overlay={<Tooltip id={"settings-tooltip"}>Settings</Tooltip>}
        >
          <Button className="tool-button">
            <FontAwesomeIcon icon={faGear} onClick={handleSettings} />
          </Button>
        </OverlayTrigger>

        <OverlayTrigger
          key={"info-overlay"}
          placement="left"
          container={mapToolsRef}
          overlay={<Tooltip id={"info-tooltip"}>Info/Help</Tooltip>}
        >
          <Button className="tool-button">
            <FontAwesomeIcon icon={faInfo} />
          </Button>
        </OverlayTrigger>
      </div>
    </>
  );
}

export default MapTools;
