import ToggleButton from "react-bootstrap/ToggleButton";
import ToggleButtonGroup from "react-bootstrap/ToggleButtonGroup";
import { Eye, EyeSlash } from "react-bootstrap-icons";

function HideOverlaysToggle({ showOverlays, onChange }) {
  return (
    <ToggleButtonGroup
      type="checkbox"
      value={showOverlays ? "overlays" : null}
      onChange={(values) => onChange(values.includes("overlays"))}
      className="toggle-group"
    >
      <ToggleButton
        id="overlays-toggle"
        value="overlays"
        title={showOverlays ? "Hide overlays" : "Show overlays"}
        className="toggle-btn"
      >
        {showOverlays ? <EyeSlash /> : <Eye />}
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

export default HideOverlaysToggle;
