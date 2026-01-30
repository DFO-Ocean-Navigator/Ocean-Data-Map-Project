import React from "react";
import ComboBox from "../lib/ComboBox.jsx";
import PropTypes from "prop-types";

import { useGetDatasetVariables } from "../../remote/queries.js";
import { withTranslation } from "react-i18next";

const AreaQuiverSelector = ({
  state,
  subquery,
  dataset,
  id,
  title,
  children,
  onUpdate,
  t: _,
}) => {

  const variables = useGetDatasetVariables(dataset, true, true);

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
        subquery={subquery}
        options={variables.data}
        onChange={handleUpdate}
        label={title}
        includeNone={true}
        alwaysShow={true}
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
  dataset: PropTypes.object.isRequired,
  title: PropTypes.string,
  subquery: PropTypes.bool,
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
