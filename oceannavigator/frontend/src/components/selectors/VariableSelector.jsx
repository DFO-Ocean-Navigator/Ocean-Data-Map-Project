import React, { useEffect } from "react";
import PropTypes from "prop-types";

import AxisRange from "../AxisRange.jsx";
import SelectBox from "../lib/SelectBox.jsx";
import { useGetDatasetVariables } from "../../remote/queries.js";

import { withTranslation } from "react-i18next";

function variableSelector({
  id,
  dataset,
  updateDataset,
  updateQueryState,
  hasDepth = false,
  multipleVariables = false,
  showAxisRange = false,
  horizontalLayout = false,
  t,
}) {
  const variables = useGetDatasetVariables(dataset);

  useEffect(() => {
    updateQueryState("variables", variables.isLoading, variables.isError);
  }, [variables.isLoading, variables.isError]);

  useEffect(() => {
    if (variables.data.length > 0) {
      // dataset changed - current variable not in new dataset:
      const variableIds = variables.data.map((v) => {
        return v.id;
      });
      let datasetHasVar = Array.isArray(dataset.variable)
        ? (datasetHasVar = dataset.variable.every((v) =>
            variableIds.includes(v.id)
          ))
        : variableIds.includes(dataset.variable.id);

      if (!datasetHasVar) {
        updateVariable("variable", variables.data[0].id);
      }
    }
  }, [dataset]);

  useEffect(() => {
    // handle multiple variable changes
    if (multipleVariables && !Array.isArray(dataset.variable)) {
      updateDataset("variable", [dataset.variable]);
    } else if (!multipleVariables && Array.isArray(dataset.variable)) {
      updateDataset("variable", dataset.variable[0]);
    }
  }, [multipleVariables]);

  const updateVariable = (key, value) => {
    let variable;
    if (value instanceof HTMLCollection) {
      // multiple variables
      let variableIds = Array.from(value).map((o) => o.value);
      variable = variables.data.filter((v) => variableIds.includes(v.id));
    } else {
      // single variable selected
      variable = variables.data.find((v) => v.id === value);
    }
    updateDataset("variable", variable);
  };

  const updateAxisRange = (key, value) => {
    let variable;
    if (multipleVariables) {
      variable = [...dataset.variable];
      let idx = variable.findIndex((v) => v.id === value[0]);
      variable[idx].axisRange = value[1];
    } else {
      variable = { ...dataset.variable, axisRange: value[1] };
    }
    updateDataset("variable", variable);
  };

  let variableOptions = [];
  if (hasDepth) {
    variableOptions = variables.data.filter((v) => {
      return v.two_dimensional === false;
    });
  } else {
    variableOptions = variables.data;
  }

  let axisRange = [];
  if (showAxisRange) {
    let axisVariables = Array.isArray(dataset.variable)
      ? dataset.variable
      : [dataset.variable];
    for (let variable of axisVariables) {
      let range = (
        <AxisRange
          key={variable.id + "_axis_range"}
          id={variable.id + "_axis_range"}
          title={variable.value + " Range"}
          variable={variable}
          range={variable.axisRange || variable.scale}
          onUpdate={updateAxisRange}
        />
      );
      axisRange.push(range);
    }
  }

  // Work-around for when someone selected a plot that requires
  // 3D variables, but the selected dataset doesn't have any LOL.
  // This check prevents a white-screen crash.
  const stillHasVariablesToShow = variableOptions.length > 0;

  let selected;
  if (Array.isArray(dataset.variable)) {
    selected = dataset.variable.map((v) => v.id);
  } else {
    selected = multipleVariables ? [dataset.variable.id] : dataset.variable.id;
  }

  return (
    <>
      {stillHasVariablesToShow && (
        <SelectBox
          id={`dataset-selector-variable-selector-${id}`}
          name={t("variable")}
          label={t("Variable")}
          placeholder={t("Variable")}
          options={variableOptions}
          onChange={updateVariable}
          selected={selected}
          multiple={multipleVariables}
          loading={variables.isLoading}
          horizontalLayout={horizontalLayout}
        />
      )}
      {showAxisRange && axisRange}
    </>
  );
}

//***********************************************************************
variableSelector.propTypes = {
  id: PropTypes.string.isRequired,
  dataset: PropTypes.object.isRequired,
  updateDataset: PropTypes.func.isRequired,
  updateQueryState: PropTypes.func.isRequired,
  hasDepth: PropTypes.bool,
  multipleVariables: PropTypes.bool,
  horizontalLayout: PropTypes.bool,
  t: PropTypes.func.isRequired,
};

export default withTranslation()(variableSelector);
