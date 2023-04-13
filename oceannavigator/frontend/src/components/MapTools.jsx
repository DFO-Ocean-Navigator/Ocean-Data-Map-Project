import React from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDrawPolygon,
  faTableList,
  faGear,
  faKeyboard,
  faSatelliteDish,
  faInfo,
  faRotateLeft,
  faChartLine,
} from "@fortawesome/free-solid-svg-icons";

import Button from "react-bootstrap/Button";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

function MapTools(props) {
  const handleDrawing = () => {
    if (!props.uiSettings.showDrawingTools) {
      props.updateUI({ showDrawingTools: true, showObservationTools: false });
      props.action("startDrawing");
    } else {
      props.updateUI({ showDrawingTools: false, showObservationTools: false });
      props.action("stopDrawing");
    }
  };

  const handleObservations = () => {
    if (!props.uiSettings.showObservationTools) {
      props.updateUI({ showDrawingTools: false, showObservationTools: true });
    } else {
      props.updateUI({ showDrawingTools: false, showObservationTools: false });
    }
  };

  const handleShowModal = (type) => {
    props.updateUI({ modalType: type, showModal: true });
  };

  return (
    <div className="MapTools">
      <OverlayTrigger
        key="draw-overlay"
        placement="left"
        overlay={<Tooltip id={"draw-tooltip"}>Draw Point Coordinates</Tooltip>}
      >
        <Button
          key="draw-button"
          className="tool-button"
          onClick={handleDrawing}
        >
          <FontAwesomeIcon icon={faDrawPolygon} />
        </Button>
      </OverlayTrigger>

      <OverlayTrigger
        key="enter-overlay"
        placement="left"
        overlay={
          <Tooltip id={"enter-tooltip"}>Enter Point Coordinates</Tooltip>
        }
      >
        <Button
          key="enter-button"
          className="tool-button"
          onClick={() => handleShowModal("enterCoords")}
        >
          <FontAwesomeIcon icon={faKeyboard} />
        </Button>
      </OverlayTrigger>

      <OverlayTrigger
        key="preset-overlay"
        placement="left"
        overlay={<Tooltip id={"preset-tooltip"}>Preset Features</Tooltip>}
      >
        <Button
          key="preset-button"
          className="tool-button"
          onClick={() => handleShowModal("presetFeatures")}
        >
          <FontAwesomeIcon icon={faTableList} />
        </Button>
      </OverlayTrigger>

      <OverlayTrigger
        key="obs-overlay"
        placement="left"
        overlay={<Tooltip id={"obs-tooltip"}>Observations</Tooltip>}
      >
        <Button key="obs-button" className="tool-button">
          <FontAwesomeIcon
            icon={faSatelliteDish}
            onClick={handleObservations}
          />
        </Button>
      </OverlayTrigger>

      <OverlayTrigger
        key="plot-overlay"
        placement="left"
        overlay={<Tooltip id={"plot-tooltip"}>Plot</Tooltip>}
      >
        <Button key="plot-button" className="tool-button">
          <FontAwesomeIcon
            icon={faChartLine}
            onClick={() => props.action("plot")}
          />
        </Button>
      </OverlayTrigger>

      <OverlayTrigger
        key="reset-overlay"
        placement="left"
        overlay={<Tooltip id={"reset-tooltip"}>Reset Map</Tooltip>}
      >
        <Button key="reset-button" className="tool-button">
          <FontAwesomeIcon
            icon={faRotateLeft}
            onClick={() => props.action("resetMap")}
          />
        </Button>
      </OverlayTrigger>

      <OverlayTrigger
        key="settings-overlay"
        placement="left"
        overlay={<Tooltip id={"settings-tooltip"}>Settings</Tooltip>}
      >
        <Button key="settings-button" className="tool-button">
          <FontAwesomeIcon
            icon={faGear}
            onClick={() => handleShowModal("settings")}
          />
        </Button>
      </OverlayTrigger>

      <OverlayTrigger
        key="info-overlay"
        placement="left"
        overlay={<Tooltip id={"info-tooltip"}>Info/Help</Tooltip>}
      >
        <Button key="info-button" className="tool-button">
          <FontAwesomeIcon
            icon={faInfo}
            onClick={() => {
              console.log("clicked");
              handleShowModal("info-help");
            }}
          />
        </Button>
      </OverlayTrigger>
    </div>
  );
}

export default MapTools;
