/* eslint react/no-deprecated: 0 */

import React from "react";
import {Button, ButtonToolbar, Form} from "react-bootstrap";
// import NumericInput from "react-numeric-input";
import PropTypes from "prop-types";

import { withTranslation } from "react-i18next";
// const stringify = require("fast-stable-stringify");

const axios = require('axios');

class Range extends React.Component {

  constructor(props) {
    super(props);

    // Track if mounted to prevent no-op errors with the Ajax callbacks.
    this._mounted = false;

    // Parse scale tuple
    let scale = this.props.state;
    if (typeof this.props.state === "string" || this.props.state instanceof String) {
      scale = this.props.state.split(",");
    }
    const min = parseFloat(scale[0]);
    const max = parseFloat(scale[1]);

    this.state = {
      auto: this.props.auto,
      min: min,
      max: max,
    };

    // Function bindings
    this.updateParent = this.updateParent.bind(this);
    this.keyPress = this.keyPress.bind(this);
    this.autoChanged = this.autoChanged.bind(this);
    this.handleDefaultButton = this.handleDefaultButton.bind(this);
    this.getAutoScale = this.getAutoScale.bind(this);
  }

  componentDidMount() {
    this._mounted = true;
  }

  componentWillUnmount() {
    this._mounted = false;
  }

  componentWillReceiveProps(nextProps) {
    if (JSON.stringify(this.props) !== JSON.stringify(nextProps)) {

      let scale = nextProps.state;
      if (typeof scale === "string" || scale instanceof String) {
        scale = scale.split(",");
      }
      if (scale.length > 1) {
        this.setState({
          min: parseFloat(scale[0]),
          max: parseFloat(scale[1]),
        });
      }
    }
  }

  updateParent() {
    clearTimeout(this.timeout);
    
    const range = this.state.min.toString() + "," + this.state.max.toString() + (this.state.auto ? ",auto" : "");
    
    this.timeout = setTimeout(this.props.onUpdate, 250, this.props.id, range);
  }

  changed(key, value) {
    clearTimeout(this.timeout);
    
    let state = {};
    state[key] = value;
    this.setState(state);
    
    this.timeout = setTimeout(this.updateParent, 1000);
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
    if (typeof this.props.state === "string" || this.props.state instanceof String) {
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
    axios.get(this.props.autourl).then(function (data) {
      if (this._mounted) {
        this.props.onUpdate(this.props.id, [data.min, data.max]);
      }
    })
    .catch (function (r, status, err) {
      if (this._mounted) {
        console.error(this.props.autourl, status, err.toString());
      }
    })
    .bind(this);
  }

  render() {
    const auto = (
      <Form.Check>
        <input type='checkbox' id={this.props.id + "_auto"} checked={this.state.auto} onChange={this.autoChanged.bind(this)} />
        {"Auto Range"}
      </Form.Check>
    );

    let autobuttons = <div></div>;
    if (this.props.autourl) {
      autobuttons = (
        <ButtonToolbar style={{ display: "inline-block", "float": "right" }}>
          <Button name='default' onClick={this.handleDefaultButton}>{"Default"}</Button>
          <Button name='auto' variant="primary" onClick={this.getAutoScale}>{"Auto"}</Button>
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
                <label htmlFor={this.props.id + "_min"}>{"Min:"}</label>
              </td>
              <td>
                <input 
                  type="number"
                  value={this.state.min}
                  onChange={(n, s) => this.changed("min", n)}
                  step={0.1}
                  precision={4}
                  onBlur={this.updateParent}
                  disabled={this.state.auto}
                  onKeyPress={this.keyPress}
                />
              </td>
            </tr>
            <tr>
              <td>
                <label htmlFor={this.props.id + "_max"}>{"Max:"}</label>
              </td>
              <td>
              <input 
                  type="number"
                  value={this.state.max}
                  onChange={(n, s) => this.changed("max", n)}
                  step={0.1}
                  precision={4}
                  onBlur={this.updateParent}
                  disabled={this.state.auto}
                  onKeyPress={this.keyPress}
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
  state: PropTypes.oneOfType([PropTypes.string, PropTypes.array]).isRequired,
  autourl: PropTypes.string,
};

export default withTranslation()(Range);
