import React from "react";
import { Button, OverlayTrigger, Tooltip } from "react-bootstrap";

import { faLink } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { useTranslation } from "react-i18next";

export default function LinkButton(props) {
  const { t, i18n } = useTranslation();

  return (
    <OverlayTrigger
      key="link-overlay"
      placement="bottom"
      overlay={<Tooltip id={"link-tooltip"}>{t("Get Link")}</Tooltip>}
    >
      <Button
        onClick={() => {
          props.action("permalink");
        }}
        className="link-button"
      >
        <FontAwesomeIcon icon={faLink} />
      </Button>
    </OverlayTrigger>
  );
}
