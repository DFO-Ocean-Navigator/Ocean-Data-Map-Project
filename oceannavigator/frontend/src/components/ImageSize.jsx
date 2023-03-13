import React from "react";
// import NumericInput from "react-numeric-input";
import PropTypes from "prop-types";

import { withTranslation } from "react-i18next";

class ImageSize extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      width: 12,
      height: 7.5,
      dpi: 144,
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
      width: this.state.width,
      height: this.state.height,
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
    const _inches = _("inches");
    return (
      <div className="ImageSize">
        <h1 onClick={this.show.bind(this)}>{this.props.title}</h1>
        <table>
          <tbody>
            <tr>
              <td>
                <label htmlFor={this.props.id + "_width"}>{_("Width:")}</label>
              </td>
              <td>
                <input
                  id={this.props.id + "_width"}
                  type="number"
                  value={this.state.width}
                  onChange={(n, s) => this.changed("width", n)}
                  step={0.25}
                  precision={2}
                />
                {/* <NumericInput
                  id={this.props.id + "_width"}
                  step={0.25}
                  value={this.state.width}
                  precision={2}
                  onChange={(n, s) => this.changed("width", n)}
                  format={(num) => { return `${num} ${_inches}`; }}
                /> */}
              </td>
            </tr>
            <tr>
              <td>
                <label htmlFor={this.props.id + "_height"}>
                  {_("Height:")}
                </label>
              </td>
              <td>
                <input
                  id={this.props.id + "_height"}
                  type="number"
                  value={this.state.width}
                  onChange={(n, s) => this.changed("height", n)}
                  step={0.25}
                  precision={2}
                />
                {/* <NumericInput
                  id={this.props.id + "_height"}
                  step={0.25}
                  value={this.state.height}
                  precision={2}
                  onChange={(n, s) => this.changed("height", n)}
                  format={(num) => { return `${num} ${_inches}`; }}
                /> */}
              </td>
            </tr>
            <tr>
              <td>
                <label htmlFor={this.props.id + "_dpi"}>{_("DPI:")}</label>
              </td>
              <td>
                <input
                  id={this.props.id + "_dpi"}
                  type="number"
                  value={this.state.dpi}
                  onChange={(n, s) => this.changed("dpi", n)}
                  step={1}
                  precision={0}
                />
                {/* <NumericInput
                  id={this.props.id + "_dpi"}
                  step={1}
                  value={this.state.dpi}
                  precision={0}
                  onChange={(n, s) => this.changed("dpi", n)}
                /> */}
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

export default withTranslation()(ImageSize);
