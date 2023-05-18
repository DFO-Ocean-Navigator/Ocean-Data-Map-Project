import React from "react";
import FontAwesome from "react-fontawesome";
import PropTypes from "prop-types";

// require("font-awesome/scss/font-awesome.scss");

export default class Icon extends React.PureComponent {

  constructor(props) {
    super(props);
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

