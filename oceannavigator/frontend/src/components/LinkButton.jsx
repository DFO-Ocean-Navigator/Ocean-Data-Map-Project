import React from "react";
import { Button, OverlayTrigger, Tooltip } from "react-bootstrap";

import { faLink } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { withTranslation } from "react-i18next";

function LinkButton(props) {
  return (
    <OverlayTrigger
      key="link-overlay"
      placement="bottom"
      overlay={<Tooltip id={"link-tooltip"}>{__("Get Link")}</Tooltip>}
    >
      <Button onClick={()=>{props.action("permalink");}} className="link-button">
        <FontAwesomeIcon icon={faLink} />
      </Button>
    </OverlayTrigger>
  );
}

export default withTranslation()(LinkButton);
