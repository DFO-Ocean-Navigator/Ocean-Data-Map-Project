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
  faBug,
} from "@fortawesome/free-solid-svg-icons";

import Button from "react-bootstrap/Button";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

import { withTranslation } from "react-i18next";

function MapTools(props) {
  const handleDrawing = () => {
    if (!props.uiSettings.showDrawingTools) {
      props.updateUI({
        showAnnotationTools: false,
        showDrawingTools: true,
        showObservationTools: false,
      });
      props.action("startFeatureDraw");
    } else {
      props.updateUI({
        showAnnotationTools: false,
        showDrawingTools: false,
        showObservationTools: false,
      });
      props.action("stopFeatureDraw");
    }
  };

  const handleObservations = () => {
    if (!props.uiSettings.showObservationTools) {
      props.updateUI({
        showAnnotationTools: false,
        showDrawingTools: false,
        showObservationTools: true,
      });
      props.action("stopFeatureDraw");
    } else {
      props.updateUI({
        showAnnotationTools: false,
        showDrawingTools: false,
        showObservationTools: false,
      });
      props.action("stopFeatureDraw");
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
        overlay={
          <Tooltip id={"draw-tooltip"}>{__("Draw Map Features")}</Tooltip>
        }
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
          <Tooltip id={"enter-tooltip"}>{__("Edit Map Features")}</Tooltip>
        }
      >
        <Button
          key="enter-button"
          className="tool-button"
          onClick={() => handleShowModal("editFeatures")}
        >
          <FontAwesomeIcon icon={faKeyboard} />
        </Button>
      </OverlayTrigger>

      <OverlayTrigger
        key="preset-overlay"
        placement="left"
        overlay={
          <Tooltip id={"preset-tooltip"}>{__("Preset Features")}</Tooltip>
        }
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
        overlay={<Tooltip id={"obs-tooltip"}>{__("Observations")}</Tooltip>}
      >
        <Button
          key="obs-button"
          className="tool-button"
          onClick={handleObservations}
        >
          <FontAwesomeIcon icon={faSatelliteDish} />
        </Button>
      </OverlayTrigger>

      <OverlayTrigger
        key="plot-overlay"
        placement="left"
        overlay={<Tooltip id={"plot-tooltip"}>{__("Plot")}</Tooltip>}
      >
        <Button
          key="plot-button"
          className="tool-button"
          onClick={() => props.action("plot")}
        >
          <FontAwesomeIcon icon={faChartLine} />
        </Button>
      </OverlayTrigger>

      <OverlayTrigger
        key="reset-overlay"
        placement="left"
        overlay={<Tooltip id={"reset-tooltip"}>{__("Reset Map")}</Tooltip>}
      >
        <Button
          key="reset-button"
          className="tool-button"
          onClick={() => props.action("resetMap")}
        >
          <FontAwesomeIcon icon={faRotateLeft} />
        </Button>
      </OverlayTrigger>

      <OverlayTrigger
        key="settings-overlay"
        placement="left"
        overlay={<Tooltip id={"settings-tooltip"}>{__("Settings")}</Tooltip>}
      >
        <Button
          key="settings-button"
          className="tool-button"
          onClick={() => handleShowModal("settings")}
        >
          <FontAwesomeIcon icon={faGear} />
        </Button>
      </OverlayTrigger>

      <OverlayTrigger
        key="info-overlay"
        placement="left"
        overlay={<Tooltip id={"info-tooltip"}>{__("Info/Help")}</Tooltip>}
      >
        <Button
          key="info-button"
          className="tool-button"
          onClick={() => handleShowModal("info-help")}
        >
          <FontAwesomeIcon icon={faInfo} />
        </Button>
      </OverlayTrigger>

      <OverlayTrigger
        key="report-overlay"
        placement="left"
        overlay={<Tooltip id={"report-tooltip"}>{__("Report Bug")}</Tooltip>}
      >
        <Button
          key="report-button"
          className="tool-button"
          onClick={() => {
            props.action("generatePermalink");
            handleShowModal("report");
          }}
        >
          <FontAwesomeIcon icon={faBug} />
        </Button>
      </OverlayTrigger>
    </div>
  );
}

export default withTranslation()(MapTools);
