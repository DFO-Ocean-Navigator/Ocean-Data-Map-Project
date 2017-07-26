import React from "react";
import NumericInput from "react-numeric-input";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");

export default class ImageSize extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      width: 10,
      height: 7.5,
      dpi: 72,
    };
  }

  show(e) {
    const p = $(e.target.parentNode);
    if (p.hasClass("collapsed")) {
      p.removeClass("collapsed");
    } else {
      p.addClass("collapsed");
    }
    p.children("div").slideToggle("fast");
  }

  changed(key, value) {
    const newstate = {
      "width": this.state.width,
      "height": this.state.height,
    };

    newstate[key] = value;
    this.setState(newstate);
    if (key == "width" || key == "height") {
      this.props.onUpdate("size", newstate.width + "x" + newstate.height);
    } else if (key == "dpi") {
      this.props.onUpdate("dpi", value);
    }
  }

  render() {
    _("inches");
    return ( 
      <div className='Size input'>
        <h1 onClick={this.show.bind(this)}>{this.props.title}</h1>
        <table>
          <tbody>
            <tr>
              <td><label htmlFor={this.props.id + "_width"}>{_("Width:")}</label></td>
              <td>
                <NumericInput
                  id={this.props.id + "_width"}
                  step={0.25}
                  value={this.state.width}
                  precision={2}
                  onChange={(n, s) => this.changed("width", n)}
                  format={(num) => {return num + " " + _("inches");}}
                />
              </td>
            </tr>
            <tr>
              <td><label htmlFor={this.props.id + "_height"}>{_("Height:")}</label></td>
              <td>
                <NumericInput
                  id={this.props.id + "_height"}
                  step={0.25}
                  value={this.state.height}
                  precision={2}
                  onChange={(n, s) => this.changed("height", n)}
                  format={(num) => {return num + " " + _("inches");}}
                />
              </td>
            </tr>
            <tr>
              <td><label htmlFor={this.props.id + "_dpi"}>{_("DPI:")}</label></td>
              <td>
                <NumericInput
                  id={this.props.id + "_dpi"}
                  step={1}
                  value={this.state.dpi}
                  precision={0}
                  onChange={(n, s) => this.changed("dpi", n)}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
}

//***********************************************************************
ImageSize.propTypes = {
  id: PropTypes.string,
  title: PropTypes.string,
  onUpdate: PropTypes.func,
};
