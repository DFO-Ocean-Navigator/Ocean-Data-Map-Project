import React from "react";
import FontAwesome from "react-fontawesome";
import PropTypes from "prop-types";

require("font-awesome/scss/font-awesome.scss");

export default class Icon extends React.Component {
  render() {
    let alt = null;
    if (this.props.alt) {
      alt = <span className="alt"> {this.props.alt}</span>;
    }
    return (
      <span className='Icon' title={this.props.alt}>
        <FontAwesome name={this.props.icon} />
        {alt}
      </span>
    );
  }
}

//***********************************************************************
Icon.propTypes = {
  alt: PropTypes.string,
  icon: PropTypes.string,
};

