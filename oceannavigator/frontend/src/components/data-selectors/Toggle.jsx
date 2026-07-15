import React from "react";
import PropTypes from "prop-types";
import Form from "react-bootstrap/Form";
import { withTranslation } from "react-i18next";
import { useState } from "react";
import Accordion from "react-bootstrap/Accordion";

const Toggle = ({ id, title, dataset, onUpdate, variableImperialUnits, setVariableImperialUnits}) => {

//   const buildVariableImperialUnits = (dataset) => {
//   if (!dataset?.variable) {
//     return [
//       {
//         id: "all",
//         checked: false,
//         label: "All Variables",
//       },
//       {
//         id: "depth",
//         checked: false,
//         label: "Depth",
//       },
//     ];
//   }

//   const datasetVariables = Array.isArray(dataset.variable)
//     ? dataset.variable
//     : [dataset.variable];

//   return [
//     {
//       id: "all",
//       checked: false,
//       label: "All Variables",
//     },
//     {
//       id: "depth",
//       checked: false,
//       label: "Depth",
//     },
//     ...datasetVariables.map((variable) => ({
//       id: variable.id,
//       checked: false,
//       label: variable.value,
//     })),
//   ];
// };

//   const [variableImperialUnits, setVariableImperialUnits] = useState(
//     buildVariableImperialUnits(dataset)
//   );

  const updateVariableImperialUnits = (var_id, checked) => {
    setVariableImperialUnits((prev) => {
      if (var_id === "all") {
        return Object.fromEntries(
          Object.entries(prev).map(([id, item]) => [
            id,
            {
              ...item,
              checked,
            },
          ])
        );
      }

      if (!prev[var_id]) {
        return prev;
      }

      const updated = {
        ...prev,
        [var_id]: {
          ...prev[var_id],
          checked,
        },
      };

      const variables = Object.values(updated).filter(
        (item) => item.id !== "all"
      );

      const allVariablesChecked =
        variables.length > 0 &&
        variables.every((item) => item.checked);

      return {
        ...updated,
        all: {
          ...updated.all,
          checked: allVariablesChecked,
        },
      };
    });
  };

  const handleChange = (e, var_id) => {
    const isChecked = e.target.checked;

    updateVariableImperialUnits(var_id, isChecked);
    onUpdate("unitSelection", variableImperialUnits);
  };

  return (
    <Accordion>
      <Accordion.Item eventKey={id}>
        <Accordion.Header>
          <div
            className="d-flex align-items-center gap-2"
            //onClick={(e) => e.stopPropagation()}
          >
            {/* <Form.Check
              type="checkbox"
              id={id}
              checked={checked}
              onChange={handleChange}
            /> */}
            <span>{title}</span>
          </div>
        </Accordion.Header>

        <Accordion.Body>
        {Object.entries(variableImperialUnits).map(([variableId, item]) => (
          <Form.Check
            key={variableId}
            id={variableId}
            type="checkbox"
            checked={item.checked}
            onChange={(e) => handleChange(e, variableId)}
            label={item.label}
          />
        ))}
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
};


Toggle.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  dataset: PropTypes.object.isRequired,
  onUpdate: PropTypes.func.isRequired,
  variableImperialUnits: PropTypes.object.isRequired,
  setImperialVariables: PropTypes.func.isRequired,
};

export default withTranslation()(Toggle);