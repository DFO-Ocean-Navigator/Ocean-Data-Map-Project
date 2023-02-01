import React, { useState } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { Button } from "react-bootstrap";

function MapTools(props) {
  const [showPlotButtons, setShowPlotButtons] = useState(false);

  const showButtons = () => {
    props.updateUI("showDrawingTools", !props.uiSettings.showDrawingTools);
  };

  return (
    <div className="MapTools">
      <Button className="tool-button" onClick={showButtons}>
        <FontAwesomeIcon icon="diagram-project" />
      </Button>
      <Button className="tool-button">
        <FontAwesomeIcon icon="keyboard" />
      </Button>
      <Button className="tool-button">
        <FontAwesomeIcon icon="table-list" />
      </Button>
      <Button className="tool-button">
        <FontAwesomeIcon icon="satellite-dish" />
      </Button>
      <Button className="tool-button">
        <FontAwesomeIcon icon="gear" />
      </Button>
      <Button className="tool-button">
        <FontAwesomeIcon icon="info" />
      </Button>
    </div>
  );
}

export default MapTools;
