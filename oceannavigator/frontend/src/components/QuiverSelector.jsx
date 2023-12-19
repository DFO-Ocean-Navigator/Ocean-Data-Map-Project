import React from "react";
import ComboBox from "./ComboBox.jsx";
import PropTypes from "prop-types";

import { withTranslation } from "react-i18next";

class QuiverSelector extends React.Component {
  constructor(props) {
    super(props);
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

  render() {
    _("Colourmap");
    _("Show Magnitude");
    _("No");
    _("Length");
    _("Colour");
    return (
      <div className="QuiverSelector input">
        <ComboBox
          id="variable"
          state={this.props.state.variable}
          def=""
          onUpdate={this.onUpdate.bind(this)}
          url={`/api/v2.0/dataset/${this.props.dataset}/variables?vectors_only=True`}
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
          {/* <ComboBox
            key="magnitude"
            id="magnitude"
            state={this.props.state.magnitude}
            onUpdate={this.onUpdate.bind(this)}
            def="length"
            title={_("Show Magnitude")}
            data={[
              { id: "none", value: _("No") },
              { id: "length", value: _("Length") },
              { id: "color", value: _("Colour") },
            ]}
          /> */}
          <div
            style={{
              display: this.props.state.magnitude == "color" ? "block" : "none",
            }}
          >
            {/* <ComboBox
              key="colormap"
              id="colormap"
              state={this.props.state.colormap}
              def="default"
              onUpdate={this.onUpdate.bind(this)}
              url="/api/v2.0/plot/colormaps"
              title={_("Colourmap")}
            >
              There are several colourmaps available. This tool tries to pick an
              appropriate default based on the variable type (Default For
              Variable). If you want to use any of the others, they are all
              selectable.
              <img src="/plot/colormaps.png/" />
            </ComboBox> */}
          </div>
        </div>
      </div>
    );
  }
}

//***********************************************************************
QuiverSelector.propTypes = {
  state: PropTypes.object,
  colormap: PropTypes.string,
  variable: PropTypes.string,
  magnitude: PropTypes.string,
  onUpdate: PropTypes.func,
  id: PropTypes.string,
  key: PropTypes.string,
  def: PropTypes.string,
  dataset: PropTypes.func,
  title: PropTypes.

};

export default withTranslation()(QuiverSelector);


// def=""
// dataset={this.state.dataset_0.id}
// title={_("Arrows")}