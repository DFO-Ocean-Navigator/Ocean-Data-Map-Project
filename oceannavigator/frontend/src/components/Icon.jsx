import React from "react";
import FontAwesome from "react-fontawesome";
import PropTypes from "prop-types";

require("font-awesome/scss/font-awesome.scss");

export default class Icon extends React.Component {

  // Only update if the requested icon changes.
  // This normally doesn't happen so we should
  // prevent each instance from re-rendering
  // ~30 times for no reason.
  shouldComponentUpdate(nextProps, nextState) {
    return nextProps.icon !== this.props.icon;
  }

  render() {
    return (
      <span className='Icon' title={this.props.alt}>
        <FontAwesome name={this.props.icon} />
        <span className="alt"> {this.props.alt}</span>
      </span>
    );
  }
}

//***********************************************************************
Icon.propTypes = {
  alt: PropTypes.string,
  icon: PropTypes.string.isRequired,
};

