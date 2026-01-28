import React, { useEffect } from "react";
import PropTypes from "prop-types";

import ComboBox from "../ComboBox.jsx";
import { useGetDatasetDepths } from "../../remote/queries.js";

import { withTranslation } from "react-i18next";

function DepthSelector({
  id,
  dataset,
  updateDataset,
  updateQueryStatus,
  showAllDepths,
  horizontalLayout = false,
  enabled = true,
  t,
}) {
  const depths = useGetDatasetDepths(dataset, enabled);

  useEffect(() => {
    updateQueryStatus(
      "depths",
      depths.status
    );
  }, [depths.status]);

  const updateDepth = (key, value) => {
    updateDataset("depth", value);
  };

  return depths.data.length > 0 ? (
    <ComboBox
      key={`${id}-depth-selector`}
      id="depth"
      label={t("Depth")}
      placeholder={t("Depth")}
      options={
        showAllDepths ? depths.data : depths.data.filter((d) => d.id !== "all")
      }
      onChange={updateDepth}
      selected={
        depths.data.filter((d) => {
          let depth = parseInt(dataset.depth);
          if (isNaN(depth)) {
            // when depth == "bottom" or "all"
            depth = dataset.depth;
          }
          return d.id === depth;
        })[0].id
      }
      horizontalLayout={horizontalLayout}
    />
  ) : null;
}

//***********************************************************************
DepthSelector.propTypes = {
  id: PropTypes.string.isRequired,
  dataset: PropTypes.object.isRequired,
  updateDataset: PropTypes.func.isRequired,
  updateQueryStatus: PropTypes.func.isRequired,
  showAllDepths: PropTypes.bool,
  horizontalLayout: PropTypes.bool,
  enabled: PropTypes.bool,
  t: PropTypes.func.isRequired,
};

export default withTranslation()(DepthSelector);
