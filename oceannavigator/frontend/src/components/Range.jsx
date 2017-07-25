import React from "react";
import {Button, ButtonToolbar, Checkbox} from "react-bootstrap";
import NumericInput from "react-numeric-input";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");

export default class Range extends React.Component {

  constructor(props) {
    super(props);

    // Parse scale tuple
    var scale = this.props.state;
    if (typeof (this.props.state.split) === "function") {
      scale = this.props.state.split(",");
    }
    var min = parseFloat(scale[0]);
    var max = parseFloat(scale[1]);

    this.state = {
      auto: this.props.auto,
      min: min,
      max: max,
    };
  }

  updateParent() {
    clearTimeout(this.timeout);
    const range = this.state.min.toString() + "," + this.state.max.toString() + (this.state.auto ? ",auto" : "");
    this.props.onUpdate(this.props.id, range);
  }

  componentWillReceiveProps(nextProps) {
    var scale = nextProps.state;
    if (typeof (scale.split) === "function") {
      scale = scale.split(",");
    }
    if (scale.length > 1) {
      this.setState({
        min: parseFloat(scale[0]),
        max: parseFloat(scale[1]),
      });
    }
  }

  changed(key, value) {
    clearTimeout(this.timeout);
    var state = {};
    state[key] = value;
    this.setState(state);
    this.timeout = setTimeout(this.updateParent.bind(this), 500);
  }

  keyPress(e) {
    const key = e.which || e.keyCode;
    if (key == 13) {
      this.updateParent();
      return false;
    } else {
      return true;
    }
  }

  autoChanged(e) {
    this.setState({
      auto: e.target.checked
    });

    var scale = this.props.state;
    if (typeof (this.props.state.split) === "function") {
      scale = this.props.state.split(",");
    }

    if (e.target.checked) {
      this.props.onUpdate(this.props.id, scale[0] + "," + scale[1] + ",auto");
    } else {
      this.props.onUpdate(this.props.id, scale[0] + "," + scale[1]);
    }
  }

  handleDefaultButton() {
    this.props.onUpdate(this.props.id, this.props.default_scale);
  }

  getAutoScale() {
    $.ajax({
      url: this.props.autourl,
      dataType: "json",
      cache: false,
      success: function (data) {
        this.props.onUpdate(this.props.id, data.min + "," + data.max);
      }.bind(this),
      error: function (r, status, err) {
        console.error(this.props.autourl, status, err.toString());
      }
    });
  }

  render() {
    const auto = (
      <Checkbox>
        <input type='checkbox' id={this.props.id + "_auto"} checked={this.state.auto} onChange={this.autoChanged.bind(this)} />
        {_("Auto Range")}
      </Checkbox>
    );

    var autobuttons = <div></div>;
    if (this.props.autourl) {
      autobuttons = (
        <ButtonToolbar style={{ "display": "inline-block", "float": "right" }}>
          <Button name='default' onClick={this.handleDefaultButton.bind(this)}>{_("Default")}</Button>
          <Button name='auto' bsStyle="primary" onClick={this.getAutoScale.bind(this)}>{_("Auto")}</Button>
        </ButtonToolbar>
      );
    }

    return (
      <div className='Range input'>
        <h1>{this.props.title}</h1>
        {this.props.auto ? auto : null}
        <table style={{ "display": this.state.auto ? "none" : "table" }}>
          <tbody>
            <tr>
              <td>
                <label htmlFor={this.props.id + "_min"}>{_("Min:")}</label>
              </td>
              <td>
                <NumericInput
                  value={this.state.min}
                  onChange={(n, s) => this.changed("min", n)}
                  step={0.1}
                  precision={3}
                  onBlur={this.updateParent.bind(this)}
                  disabled={this.state.auto}
                  onKeyPress={this.keyPress.bind(this)}
                />
              </td>
            </tr>
            <tr>
              <td>
                <label htmlFor={this.props.id + "_max"}>{_("Max:")}</label>
              </td>
              <td>
                <NumericInput
                  value={this.state.max}
                  onChange={(n, s) => this.changed("max", n)}
                  step={0.1}
                  precision={3}
                  onBlur={this.updateParent.bind(this)}
                  disabled={this.state.auto}
                  onKeyPress={this.keyPress.bind(this)}
                />
              </td>
            </tr>
          </tbody>
        </table>
        {autobuttons}
      </div>
    );
  }
}

//***********************************************************************
Range.propTypes = {
  id: PropTypes.string,
  auto: PropTypes.bool,
  title: PropTypes.string,
  onUpdate: PropTypes.func,
  default_scale: PropTypes.array,
  state: PropTypes.string,
  autourl: PropTypes.string
};
