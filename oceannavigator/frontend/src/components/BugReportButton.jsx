import React from "react";
import { Button, OverlayTrigger, Tooltip } from "react-bootstrap";

import { faBug } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { withTranslation } from "react-i18next";

function BugReportButton(props) {
  const handleClick = () => {
    props.action("generatePermalink");
    props.updateUI({
      modalType: "report",
      showModal: true,
    });
  };

  return (
    <OverlayTrigger
      key="report-overlay"
      placement="bottom"
      overlay={<Tooltip id={"report-tooltip"}>{__("Report Bug")}</Tooltip>}
    >
      <Button onClick={handleClick} className="bug-report-button">
        <FontAwesomeIcon icon={faBug} />
      </Button>
    </OverlayTrigger>
  );
}

export default withTranslation()(BugReportButton);
