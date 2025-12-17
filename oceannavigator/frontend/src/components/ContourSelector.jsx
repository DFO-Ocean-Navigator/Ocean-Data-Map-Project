import React, { useState, useCallback } from "react";
import ComboBox from "./ComboBox.jsx";
import CheckBox from "./lib/CheckBox.jsx";
import PropTypes from "prop-types";
import { withTranslation } from "react-i18next";

const ContourSelector = ({
  state,
  dataset,
  id,
  subquery,
  title,
  children,
  onUpdate,
  t: _,
}) => {
  // Internal levels state
  const [levels, setLevels] = useState(state.levels || "-10,0,10");
  const auto = state.levels === "auto";
  const [typingTimeout, setTypingTimeout] = useState(null);

  // Helper to merge state
  const handleUpdate = useCallback(
    (keys, values) => {
      const ks = Array.isArray(keys) ? keys : [keys];
      const vs = Array.isArray(values) ? values : [values];
      const patch = {};
      ks.forEach((k, i) => {
        if (state.hasOwnProperty(k)) patch[k] = vs[i];
      });
      onUpdate(id, { ...state, ...patch });
    },
    [id, onUpdate, state]
  );

  // Debounced levels change
  const levelsChanged = (e) => {
    const val = e.target.value;
    setLevels(val);
    if (typingTimeout) clearTimeout(typingTimeout);
    setTypingTimeout(
      setTimeout(() => {
        handleUpdate("levels", val);
      }, 500)
    );
  };

  const updateLevels = () => {
    if (typingTimeout) clearTimeout(typingTimeout);
    handleUpdate("levels", levels);
  };

  const onUpdateAuto = (key, checked) => {
    if (checked) {
      handleUpdate("levels", "auto");
    } else {
      const manualLevels = levels !== "auto" ? levels : "-10,0,10";
      setLevels(manualLevels);
      handleUpdate("levels", manualLevels);
    }
  };

  // Render
  return (
    <div className="ContourSelector input">
      <ComboBox
        id="variable"
        state={state.variable}
        subquery={subquery}
        onUpdate={handleUpdate}
        url={`/api/v2.0/dataset/${dataset}/variables`}
        title={title}
      >
        {children}
      </ComboBox>

      <div
        className="sub"
        style={{
          display:
            state.variable === "none" ||
            state.variable === "" ||
            !state.variable
              ? "none"
              : "block",
        }}
      >
        <CheckBox
          id="hatch"
          checked={state.hatch}
          onUpdate={handleUpdate}
          title={_("Crosshatch")}
        />

        {!state.hatch && (
          <ComboBox
            id="colormap"
            state={state.colormap}
            def=""
            onUpdate={handleUpdate}
            url="/api/v2.0/plot/colormaps"
            title={_("Colourmap")}
          >
            {_(
              "There are several colourmaps available. This tool tries to pick an appropriate default based on the variable type (Default For Variable). If you want to use any of the others, they are all selectable."
            )}
            <img src="/api/v2.0/plot/colormaps.png/" alt="colormaps" />
          </ComboBox>
        )}

        <CheckBox
          id="legend"
          checked={state.legend}
          onUpdate={handleUpdate}
          title={_("Show Legend")}
        />

        <h1>{_("Levels")}</h1>
        <CheckBox
          id="autolevels"
          checked={auto}
          onUpdate={onUpdateAuto}
          title={_("Auto Levels")}
        />

        {!auto && (
          <input
            type="text"
            value={levels}
            onChange={levelsChanged}
            onBlur={updateLevels}
          />
        )}
      </div>
    </div>
  );
};

ContourSelector.propTypes = {
  state: PropTypes.object.isRequired,
  dataset: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  subquery: PropTypes.bool,
  title: PropTypes.string,
  children: PropTypes.node,
  onUpdate: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
};

export default withTranslation()(ContourSelector);
