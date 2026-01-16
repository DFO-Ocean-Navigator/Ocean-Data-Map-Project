import React, { useEffect } from "react";
import PropTypes from "prop-types";

import SelectBox from "../lib/SelectBox.jsx";
import { useGetDatasetVariables } from "../../remote/queries.js";

import { withTranslation } from "react-i18next";

function variableSelector({
  id,
  dataset,
  updateDataset,
  updateQueryStatus,
  hasDepth = false,
  multipleVariables = false,
  horizontalLayout = false,
  t,
}) {
  let variables = useGetDatasetVariables(dataset);
  if (hasDepth) {
    variables.data = variables.data.filter((v) => {
      return v.two_dimensional === false;
    });
  }

  useEffect(() => {
    if (variables.data.length > 0) {
      const variableIds = Array.isArray(dataset.variable)
        ? dataset.variable.map((v) => {
            return v.id;
          })
        : [dataset.variable.id];

      let nextVariable = variables.data.filter((v) =>
        variableIds.includes(v.id)
      );

      if (nextVariable.length === 0) {
        // current variable not in new dataset - select first variable
        updateVariable("variable", variables.data[0].id);
      } else {
        let datasetVariable = !Array.isArray(dataset.variable)
          ? [dataset.variable]
          : dataset.variable;
        if (JSON.stringify(nextVariable) !== JSON.stringify(datasetVariable)) {
          // overwrite variable with data from new dataset if different
          updateVariable(
            "variable",
            nextVariable.map((v) => v.id)
          );
        }
      }
    }
    updateQueryStatus("variables", variables.status);
  }, [dataset, variables.status]);

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
      let variableIds = Array.from(value).map((o) => o.value);
      variable = variables.data.filter((v) => variableIds.includes(v.id));
    } else if (Array.isArray(value)) {
      variable = variables.data.filter((v) => value.includes(v.id));
      !multipleVariables && (variable = variable[0]);
    } else {
      // single variable selected
      variable = variables.data.find((v) => v.id === value);
    }

    updateDataset(key, variable, dataset.variable?.updateParent);
  };

  // Work-around for when someone selected a plot that requires
  // 3D variables, but the selected dataset doesn't have any LOL.
  // This check prevents a white-screen crash.
  const stillHasVariablesToShow = variables.data.length > 0;

  let selected;
  if (Array.isArray(dataset.variable)) {
    selected = dataset.variable.map((v) => v.id);
    !multipleVariables && (selected = selected[0]);
  } else {
    selected = dataset.variable.id;
    multipleVariables && (selected = [selected]);
  }

  return (
    <>
      {stillHasVariablesToShow && (
        <SelectBox
          id={`dataset-selector-variable-selector-${id}`}
          name={t("variable")}
          label={t("Variable")}
          placeholder={t("Variable")}
          options={variables.data}
          onChange={updateVariable}
          selected={selected}
          multiple={multipleVariables}
          loading={variables.isLoading}
          horizontalLayout={horizontalLayout}
        />
      )}
      {/* {axisRange && axisRangeSelectors} */}
    </>
  );
}

//***********************************************************************
variableSelector.propTypes = {
  id: PropTypes.string.isRequired,
  dataset: PropTypes.object.isRequired,
  updateDataset: PropTypes.func.isRequired,
  updateQueryStatus: PropTypes.func.isRequired,
  hasDepth: PropTypes.bool,
  multipleVariables: PropTypes.bool,
  axisRange: PropTypes.object,
  updateAxisRange: PropTypes.func,
  horizontalLayout: PropTypes.bool,
  t: PropTypes.func.isRequired,
};

export default withTranslation()(variableSelector);
