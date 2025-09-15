import React from "react";
import FontAwesome from "react-fontawesome";
import PropTypes from "prop-types";

const Icon = ({ icon, alt = "" }) => (
  <span className="Icon" title={alt}>
    <FontAwesome name={icon} />
    {alt && <span className="alt"> {alt}</span>}
  </span>
);

Icon.propTypes = {
  icon: PropTypes.string.isRequired,
  alt: PropTypes.string,
};

export default Icon;
