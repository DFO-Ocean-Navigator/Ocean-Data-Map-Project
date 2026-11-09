import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { Form } from "react-bootstrap";
import Slider from "rc-slider";

import ComboBox from "../lib/ComboBox.jsx";
import { useGetDatasetVariables } from "../../remote/queries.js";

import { withTranslation } from "react-i18next";

const MODEL_CLASSES_WITH_QUIVER = Object.freeze(["Mercator"]);

function EddySelector({
  id,
  dataset,
  updateDataset,
  horizontalLayout,
  enabled = true,
  t,
}) {
  const eddyVariables = useGetDatasetVariables(dataset, enabled, false);

  useEffect(() => {
    const variableIds = eddyVariables.data.map((v) => {
      return v.id;
    });
    if (
      dataset.quiverVariable !== "none" &&
      variableIds.length > 0 &&
      (!variableIds.includes(dataset.quiverVariable) ||
        !MODEL_CLASSES_WITH_QUIVER.includes(dataset.model_class))
    ) {
      updateDataset("eddyVariable", "none");
    }
  }, [dataset]);

  const updateEddy = (key, value) => {
    updateDataset(key, value);
  };

  let eddyOptions = [{ id: "none", value: "None" }];
  if (MODEL_CLASSES_WITH_QUIVER.includes(dataset.model_class)) {
    eddyOptions = [...eddyOptions, ...eddyVariables.data];
  }

  return (
    <div className="eddy-selector">
      <ComboBox
        key={`${id}-eddy-selector`}
        id="eddyVariable"
        label={t("Eddy")}
        placeholder={t("Eddy Variable")}
        options={eddyOptions}
        onChange={updateEddy}
        selected={dataset.eddyVariable}
        horizontalLayout={horizontalLayout}
      />

      <Form.Label className="eddy-slider-label">Eddy Diameter</Form.Label>
      <Slider
        className="eddy-slider"
        range
        allowCross={false}
        min={100}
        max={500}
        marks={{
          100: "100",
          200: "200",
          300: "300",
          400: "400",
          500: "500"
        }}
        value={dataset.eddyDensity}
        onChange={(x) => updateEddy("eddyDiameter", parseInt(x))}
      />
    </div>
  );
}

//***********************************************************************
EddySelector.propTypes = {
  dataset: PropTypes.object.isRequired,
  updateDataset: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
};

export default withTranslation()(EddySelector);
