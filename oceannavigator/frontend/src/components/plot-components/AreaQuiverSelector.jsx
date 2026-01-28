import React from "react";
import ComboBox from "../lib/ComboBox.jsx";
import PropTypes from "prop-types";
import { withTranslation } from "react-i18next";

const AreaQuiverSelector = ({
  state,
  dataset,
  id,
  title,
  children,
  onUpdate,
  t: _,
}) => {
  const handleUpdate = (key, value) => {
    const keys = Array.isArray(key) ? key : [key];
    const vals = Array.isArray(value) ? value : [value];
    const patch = {};

    keys.forEach((k, i) => {
      if (state.hasOwnProperty(k)) {
        patch[k] = vals[i];
      }
    });

    onUpdate(id, { ...state, ...patch });
  };

  return (
    <div className="QuiverSelector input">
      <ComboBox
        key="variable"
        id="variable"
        selected={state.variable}
        onChange={handleUpdate}
        url={`/api/v2.0/dataset/${dataset}/variables?vectors_only=True`}
        label={title}
        includeNone={true}
      >
        {children}
      </ComboBox>

      <div
        className="sub"
        style={{
          display:
            state.variable === "none" || state.variable === ""
              ? "none"
              : "block",
        }}
      >
        <div
          style={{
            display: state.magnitude === "color" ? "block" : "none",
          }}
        ></div>
      </div>
    </div>
  );
};

//***********************************************************************
AreaQuiverSelector.propTypes = {
  id: PropTypes.string.isRequired,
  dataset: PropTypes.string.isRequired,
  title: PropTypes.string,
  state: PropTypes.shape({
    variable: PropTypes.string,
    magnitude: PropTypes.string,
    colormap: PropTypes.string,
  }).isRequired,
  onUpdate: PropTypes.func.isRequired,
  children: PropTypes.node,
  t: PropTypes.func.isRequired,
};

export default withTranslation()(AreaQuiverSelector);
