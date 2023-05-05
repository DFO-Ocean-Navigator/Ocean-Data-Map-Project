import React, { useState } from "react";
import ToggleButton from "react-bootstrap/ToggleButton";
import ToggleButtonGroup from "react-bootstrap/ToggleButtonGroup";

import { withTranslation } from "react-i18next";

function ToggleLanguage(props) {
  const [currentLanguage, setCurrentLanguage] = useState(props.i18n.language);

  const toggleUpdate = (newLang) => {
    setCurrentLanguage(newLang);
    props.i18n.changeLanguage(newLang);
  };

  if (!props.i18n.language) {
    toggleUpdate("en-CA")
  }

  return (
    <ToggleButtonGroup
      type="radio"
      name="lang-group"
      value={currentLanguage}
      onChange={toggleUpdate}
      className="toggle-group"
    >
      <ToggleButton id="en-btn" value={"en-CA"} className="toggle-btn">
        En
      </ToggleButton>
      <ToggleButton id="fr-btn" value={"fr"} className="toggle-btn">
        Fr
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

export default withTranslation()(ToggleLanguage);
