/* eslint react/no-deprecated: 0 */

import React from "react";
import { Button, Checkbox } from "react-bootstrap";
import NumericInput from "react-numeric-input";
import PropTypes from "prop-types";

import Icon from "./lib/Icon.jsx";

import { withTranslation } from "react-i18next";

class AxisRange extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      auto: false,
      min: this.props.range[0],
      max: this.props.range[1],
    };

    // Function bindings
    this.updateParent = this.updateParent.bind(this);
    this.keyPress = this.keyPress.bind(this);
    this.autoChanged = this.autoChanged.bind(this);
    this.handleResetButton = this.handleResetButton.bind(this);
    this.updateParent = this.updateParent.bind(this);
  }


  updateParent() {
    this.props.onUpdate("variable_scale", [this.props.index, [this.state.min, this.state.max]]);
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
    if (e.target.checked) {
      this.props.onUpdate("variable_scale", [this.props.index, null]);
    } else {
      this.updateParent();
    }
  }

  handleResetButton() {
    this.setState({
      min: this.props.range[0],
      max: this.props.range[1],
    });
  }

  render() {
    return (
      <div className='Range input'>
        <h1>{this.props.title}</h1>
        <Checkbox>
          <input type='checkbox' id={this.props.id + "_auto"} checked={this.state.auto} onChange={this.autoChanged.bind(this)} />
          {_("Auto")}
        </Checkbox>
        <table>
          <tbody>
            <tr>
              <td>
                <NumericInput
                  value={this.state.min}
                  onChange={(n, s) => this.changed("min", n)}
                  step={0.1}
                  precision={2}
                  onBlur={this.updateParent}
                  disabled={this.state.auto}
                  onKeyPress={this.keyPress}
                />
              </td>
              <td>
                <NumericInput
                  value={this.state.max}
                  onChange={(n, s) => this.changed("max", n)}
                  step={0.1}
                  precision={2}
                  onBlur={this.updateParent}
                  disabled={this.state.auto}
                  onKeyPress={this.keyPress}
                />
              </td>
              <td>
                <Button name='default' onClick={this.handleResetButton}><Icon icon='undo' alt={_("Reset")} /></Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
}

//***********************************************************************
AxisRange.propTypes = {
  id: PropTypes.string,
  title: PropTypes.string,
  range: PropTypes.array,
  onUpdate: PropTypes.func,
  index: propTypes.number,
};

export default withTranslation()(AxisRange);
