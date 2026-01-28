import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { Form } from "react-bootstrap";
import Slider from "rc-slider";

import ComboBox from "../lib/ComboBox.jsx";
import { useGetDatasetVariables } from "../../remote/queries.js";

import { withTranslation } from "react-i18next";

const MODEL_CLASSES_WITH_QUIVER = Object.freeze(["Mercator"]);

function QuiverSelector({
  id,
  dataset,
  updateDataset,
  horizontalLayout,
  enabled = true,
  t,
}) {
  const quiverVariables = useGetDatasetVariables(dataset, enabled, true);

  useEffect(() => {
    const variableIds = quiverVariables.data.map((v) => {
      return v.id;
    });
    if (
      dataset.quiverVariable !== "none" &&
      variableIds.length > 0 &&
      (!variableIds.includes(dataset.quiverVariable) ||
        !MODEL_CLASSES_WITH_QUIVER.includes(dataset.model_class))
    ) {
      updateDataset("quiverVariable", "none");
    }
  }, [dataset]);

  const updateQuiver = (key, value) => {
    updateDataset(key, value);
  };

  let quiverOptions = [{ id: "none", value: "None" }];
  if (MODEL_CLASSES_WITH_QUIVER.includes(dataset.model_class)) {
    quiverOptions = [...quiverOptions, ...quiverVariables.data];
  }

  return (
    <div className="quiver-selector">
      <ComboBox
        key={`${id}-quiver-selector`}
        id="quiverVariable"
        label={t("Quiver")}
        placeholder={t("Quiver Variable")}
        options={quiverOptions}
        onChange={updateQuiver}
        selected={dataset.quiverVariable}
        horizontalLayout={horizontalLayout}
      />

      <Form.Label className="quiver-slider-label">Quiver Density</Form.Label>
      <Slider
        className="quiver-slider"
        range
        allowCross={false}
        min={-1}
        max={1}
        marks={{
          "-1": "-",
          0: "",
          1: "+",
        }}
        defaultValue={dataset.quiverDensity}
        onChange={(x) => updateQuiver("quiverDensity", parseInt(x))}
      />
    </div>
  );
}

//***********************************************************************
QuiverSelector.propTypes = {
  dataset: PropTypes.object.isRequired,
  updateDataset: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
};

export default withTranslation()(QuiverSelector);
