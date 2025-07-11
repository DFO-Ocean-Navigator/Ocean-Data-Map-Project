import React from "react";
import ComboBox from "./ComboBox.jsx";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

const QuiverSelector = ({ state, dataset, id, title, children, onUpdate }) => {
  const { t: _ } = useTranslation();

  // Mirror your old onUpdate method
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

  // Preload translation keys (same as your _("...") calls)
  _("Colourmap");
  _("Show Magnitude");
  _("No");
  _("Length");
  _("Colour");

  return (
    <div className="QuiverSelector input">
      <ComboBox
        id="variable"
        state={state.variable}
        def=""
        onUpdate={handleUpdate}
        url={`/api/v2.0/dataset/${dataset}/variables?vectors_only=True`}
        title={title}
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
        {/* Uncomment and adapt these ComboBoxes exactly as you had them */}
        {/*
        <ComboBox
          id="magnitude"
          state={state.magnitude}
          onUpdate={handleUpdate}
          def="length"
          title={_("Show Magnitude")}
          data={[
            { id: "none",   value: _("No") },
            { id: "length", value: _("Length") },
            { id: "color",  value: _("Colour") },
          ]}
        />
        */}
        <div
          style={{
            display: state.magnitude === "color" ? "block" : "none",
          }}
        >
          {/* your nested colormap ComboBox, if you need it */}
        </div>
      </div>
    </div>
  );
};

QuiverSelector.propTypes = {
  id:       PropTypes.string.isRequired,
  dataset:  PropTypes.string.isRequired,
  title:    PropTypes.string,
  state:    PropTypes.shape({
    variable:  PropTypes.string,
    magnitude: PropTypes.string,
    colormap:  PropTypes.string,
  }).isRequired,
  onUpdate: PropTypes.func.isRequired,
  children: PropTypes.node,
};

export default QuiverSelector;

