import React from "react";
import ComboBox from "./ComboBox.jsx";
import CheckBox from "./lib/CheckBox.jsx";
import PropTypes from "prop-types";

import { withTranslation } from "react-i18next";

class ContourSelector extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      levels: "-10,0,10",
    };

    // Function bindings
    this.onUpdate = this.onUpdate.bind(this);
    this.levelsChanged = this.levelsChanged.bind(this);
    this.updateLevels = this.updateLevels.bind(this);
    this.onUpdateAuto = this.onUpdateAuto.bind(this);
  }

  onUpdate(key, value) {
    if (!Array.isArray(key)) {
      key = [key];
      value = [value];
    }

    const state = {};
    for (let i = 0; i < key.length; i++) {
      if (!this.props.state.hasOwnProperty(key[i])) {
        continue;
      }
      state[key[i]] = value[i];
    }
    const newState = {...this.props.state, ...state};
    this.props.onUpdate(this.props.id, newState);
  }

  levelsChanged(e) {
    clearTimeout(this.timeout);
    this.setState({
      levels: e.target.value,
    });
    this.timeout = setTimeout(this.updateLevels, 500);
  }

  updateLevels() {
    clearTimeout(this.timeout);
    this.onUpdate("levels", this.state.levels);
  }

  onUpdateAuto(key, value) {
    if (value) {
      this.onUpdate("levels", "auto");
    } else {
      this.updateLevels();
    }
  }

  render() {
    const auto = this.props.state.levels === "auto";
    _("Crosshatch");
    _("Colourmap");
    _("Show Legend");
    _("Auto Levels");
    return (
      <div className="ContourSelector input">
        <ComboBox
          id="variable"
          state={this.props.state.variable}
          def=""
          onUpdate={this.onUpdate}
          url={`/api/v2.0/dataset/${this.props.dataset}/variables`} 
          title={this.props.title}
        >
          {this.props.children}
        </ComboBox>
        <div
          className="sub"
          style={{
            display:
              this.props.state.variable == "none" ||
              this.props.state.variable == ""
                ? "none"
                : "block",
          }}
        >
          <CheckBox
            key="hatch"
            id="hatch"
            state={this.props.state.hatch}
            onUpdate={this.onUpdate}
            title={_("Crosshatch")}
          ></CheckBox>
          <div style={{ display: this.props.state.hatch ? "none" : "block" }}>
            <ComboBox
              key="colormap"
              id="colormap"
              state={this.props.state.colormap}
              def=""
              onUpdate={this.onUpdate}
              url="/api/v2.0/plot/colormaps"
              title={_("Colourmap")}
            >
              There are several colourmaps available. This tool tries to pick an
              appropriate default based on the variable type (Default For
              Variable). If you want to use any of the others, they are all
              selectable.
              <img src="/api/v2.0/plot/colormaps.png/" />
            </ComboBox>
          </div>
          <CheckBox
            key="legend"
            id="legend"
            checked={this.props.state.legend}
            onUpdate={this.onUpdate}
            title={_("Show Legend")}
          ></CheckBox>
          <h1>{_("Levels")}</h1>
          <CheckBox
            key="autolevels"
            id="autolevels"
            state={auto}
            onUpdate={this.onUpdateAuto}
            title={_("Auto Levels")}
          ></CheckBox>
          <input
            type="text"
            style={{ display: this.state.autolevels ? "none" : "inline-block" }}
            value={this.state.levels}
            onChange={this.levelsChanged}
            onBlur={this.updateLevels}
          />
        </div>
      </div>
    );
  }
}

//***********************************************************************
ContourSelector.propTypes = {
  state: PropTypes.object,
  legend: PropTypes.bool,
  onUpdate: PropTypes.func,
  id: PropTypes.string,
};

export default withTranslation()(ContourSelector);
