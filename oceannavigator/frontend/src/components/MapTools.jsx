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

import { Button, Modal, OverlayTrigger, Tooltip } from "react-bootstrap";
import EnterCoordsModal from "./EnterCoordsModal.jsx";

function MapTools(props) {
  const mapToolsRef = useRef(null);
  const [showPlotButtons, setShowPlotButtons] = useState(false);
  const [showEnterPointsModal, setShowEnterPointsModal] = useState(false);

  const startDrawing = () => {
    props.updateUI("showDrawingTools", !props.uiSettings.showDrawingTools);
    props.action("draw");
  };

  const handleEnterPoints = () => {
    setShowEnterPointsModal(!showEnterPointsModal);
  };

  // const enterCoordsModal = showEnterPointsModal ? (
  //   <EnterCoordsModal handleClose={handleEnterPoints} />
  // ) : null;

  return (
    <>
      <div className="MapTools" ref={mapToolsRef}>
        <Button className="tool-button" onClick={startDrawing}>
          <FontAwesomeIcon icon={faDrawPolygon} />
        </Button>
        <Button className="tool-button" onClick={handleEnterPoints}>
          <FontAwesomeIcon icon={faKeyboard} />
        </Button>
        <Button className="tool-button">
          <FontAwesomeIcon icon={faTableList} />
        </Button>
        <Button className="tool-button">
          <FontAwesomeIcon icon={faSatelliteDish} />
        </Button>
        <Button className="tool-button">
          <FontAwesomeIcon icon={faGear} />
        </Button>
        <Button className="tool-button">
          <FontAwesomeIcon icon={faInfo} />
        </Button>
      </div>
      {/* {enterCoordsModal} */}
    </>
  );
}

export default MapTools;
