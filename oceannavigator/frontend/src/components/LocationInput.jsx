import React from "react";
import NumericInput from "react-numeric-input";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");

export default class LocationInput extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      latitude: parseFloat(this.props.state[0][0]),
      longitude: parseFloat(this.props.state[0][1]),
    };

    // Function bindings
    this.updateParent = this.updateParent.bind(this);
    this.keyPress = this.keyPress.bind(this);
  }

  updateParent() {
    clearTimeout(this.timeout);
    this.props.onUpdate(
        this.props.id,
        [[this.state.latitude, this.state.longitude]]
    );
  }

  keyPress(e) {
    var key = e.which || e.keyCode;
    if (key == 13) {
      this.updateParent();
      return false;
    } else {
      return true;
    }
  }

  changed(key, value) {
    clearTimeout(this.timeout);
    var state = {};
    state[key] = value;
    this.setState(state);
    this.timeout = setTimeout(this.updateParent, 500);
  }

  render() {
    return (
      <div key={this.props.url} className='LocationInput input'>
        <h1>
          {this.props.title}
        </h1>

        <table>
          <tbody>
            <tr>
              <td>
                <label htmlFor={this.props.id + "_lat"}>{_("Lat:")}</label>
              </td>
              <td>
                <NumericInput
                  value={this.state.latitude}
                  precision={4}
                  step={0.01}
                  onChange={(n,s) => this.changed("latitude", n)}
                  onBlur={this.updateParent}
                  onKeyPress={this.keyPress}
                  id={this.props.id + "_lat"}
                />
              </td>
            </tr>
            <tr>
              <td>
                <label htmlFor={this.props.id + "_lon"}>{_("Lon:")}</label>
              </td>
              <td>
                <NumericInput
                  value={this.state.longitude}
                  precision={4}
                  step={0.01}
                  onChange={(n,s) => this.changed("longitude", n)}
                  onBlur={this.updateParent}
                  onKeyPress={this.keyPress}
                  id={this.props.id + "_lon"}
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
LocationInput.propTypes = {
  id: PropTypes.string,
  title: PropTypes.string,
  onUpdate: PropTypes.func,
  state: PropTypes.array,
};
