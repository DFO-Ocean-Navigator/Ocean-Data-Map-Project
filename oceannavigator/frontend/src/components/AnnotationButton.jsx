import React from "react";
import { Button, OverlayTrigger, Tooltip } from "react-bootstrap";

import { faPencil } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { useTranslation } from "react-i18next";

export default function AnnotationButton(props) {
  const { t, i18n } = useTranslation();

  const handleClick = () => {
    props.updateUI({
      modalType: "annotation",
      showModal: true,
    });
  };

  return (
    <OverlayTrigger
      key="annotation-overlay"
      placement="bottom"
      overlay={
        <Tooltip id={"annotation-tooltip"}>{t("Add Map Annotation")}</Tooltip>
      }
    >
      <Button onClick={handleClick} className="annotation-button">
        <FontAwesomeIcon icon={faPencil} />
      </Button>
    </OverlayTrigger>
  );
}
