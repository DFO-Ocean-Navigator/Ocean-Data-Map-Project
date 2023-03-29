import React from "react";
import { Button, Form } from "react-bootstrap";
import PropTypes from "prop-types";

import Icon from "./lib/Icon.jsx";

import { withTranslation } from "react-i18next";

class AxisRange extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      auto: true,
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
    this.props.onUpdate("variable_range", [
      this.props.variable,
      [this.state.min, this.state.max],
    ]);
  }

  changed(key, value) {
    clearTimeout(this.timeout);

    let state = {};
    state[key] = value;
    this.setState(state);

    this.timeout = setTimeout(this.updateParent, 500);
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
      auto: e.target.checked,
    });
    if (e.target.checked) {
      this.props.onUpdate("variable_range", [this.props.variable, null]);
    } else {
      this.updateParent();
    }
  }

  handleResetButton() {
    clearTimeout(this.timeout);

    this.setState({
      min: this.props.range[0],
      max: this.props.range[1],
    });

    this.timeout = setTimeout(this.updateParent, 500);
  }

  render() {
    return (
      <div className="axis-range">
        <h1>{this.props.title}</h1>
        <Form.Check
            type="checkbox"
            id={this.props.id + "_auto"}
            checked={this.state.auto}
            onChange={this.autoChanged.bind(this)}
            label={_("Auto")}
          />
        <table className="range-table">
          <tbody>
            <tr>
              <td>
                <input
                  className="range-input"
                  type="number"
                  value={this.state.min}
                  onChange={(n, s) => this.changed("min", n)}
                  step={0.1}
                  disabled={this.state.auto}
                />
              </td>
              <td>
                <input
                  className="range-input"
                  type="number"
                  value={this.state.max}
                  onChange={(n, s) => this.changed("max", n)}
                  step={0.1}
                  disabled={this.state.auto}
                />
              </td>
              <td>
                <Button name="default" onClick={this.handleResetButton}>
                  <Icon icon="undo" alt={_("Reset")} />
                </Button>
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
  variable: PropTypes.string,
  range: PropTypes.array,
  onUpdate: PropTypes.func,
};

export default withTranslation()(AxisRange);
