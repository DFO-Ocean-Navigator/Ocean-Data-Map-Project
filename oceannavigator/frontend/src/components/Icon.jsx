import React from "react";
import FontAwesome from "react-fontawesome";

require("font-awesome/scss/font-awesome.scss");

class Icon extends React.Component {
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

export default Icon;

