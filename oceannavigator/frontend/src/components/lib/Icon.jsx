import React from "react";
import FontAwesome from "react-fontawesome";
import PropTypes from "prop-types";
import { withTranslation } from "react-i18next";

const Icon = ({ icon, alt = "", t: _ }) => (
  <span className="Icon" title={alt}>
    <FontAwesome name={icon} />
    {alt && <span className="alt"> {alt}</span>}
  </span>
);

Icon.propTypes = {
  icon: PropTypes.string.isRequired,
  alt: PropTypes.string,
  t: PropTypes.func.isRequired,
};

export default withTranslation()(Icon);