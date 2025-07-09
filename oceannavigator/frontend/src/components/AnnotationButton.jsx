import React from "react";
import { Button, OverlayTrigger, Tooltip } from "react-bootstrap";

import { faPencil } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { withTranslation } from "react-i18next";

function AnnotationButton(props) {
  const isActive = props.uiSettings.annotationMode === true;

  const handleToggle = () => {
    if (!isActive) {
      props.updateUI({ annotationMode: true, showModal: false });
      props.action("enableAnnotationMode");
    } else {
      props.updateUI({ annotationMode: false });
      props.action("disableAnnotationMode");
    }
  };

  return (
    <OverlayTrigger
      key="annotation-overlay"
      placement="bottom"
      overlay={
        <Tooltip id={"annotation-tooltip"}>{__("Add Map Annotation")}</Tooltip>
      }
    >
      <Button
        onClick={handleToggle}
        className={`annotation-button ${isActive ? "active" : ""}`}
      >
        <FontAwesomeIcon icon={faPencil} />
      </Button>
    </OverlayTrigger>
  );
}

export default withTranslation()(AnnotationButton);
