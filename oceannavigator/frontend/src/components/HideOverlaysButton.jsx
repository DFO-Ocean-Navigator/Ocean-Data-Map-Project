import { Button, OverlayTrigger, Tooltip } from "react-bootstrap";
import { Eye, EyeSlash } from "react-bootstrap-icons";
import { useTranslation } from "react-i18next";

function HideOverlaysToggle({ showOverlays, onChange }) {
  const { t, _ } = useTranslation();

  return (
    <OverlayTrigger
      placement="bottom"
      overlay={<Tooltip id="overlays-tooltip">{t("Display Overlays")}</Tooltip>}
    >
      <Button
        id="overlays-toggle"
        className="hide-overlays-button"
        onClick={() => onChange(!showOverlays)}
      >
        {showOverlays ? <Eye /> : <EyeSlash />}
      </Button>
    </OverlayTrigger>
  );
}

export default HideOverlaysToggle;
