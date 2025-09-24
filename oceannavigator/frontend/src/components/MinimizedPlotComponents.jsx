import React from "react";
import Button from "react-bootstrap/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faExpand } from "@fortawesome/free-solid-svg-icons";
import PropTypes from "prop-types";
import { withTranslation } from "react-i18next";

import { getPlotTitle } from "./OceanNavigator.jsx";

const MinimizedPlotBar = ({ minimizedPlots, onRestore, onClose, t }) => {
  if (!minimizedPlots?.length) return null;

  return (
    <div className="minimized-plots-container">
      {minimizedPlots.map((plot) => (
        <div key={plot.id} className="minimized-plot-bar">
          <div className="minimized-plot-content">
            <span
              className="minimized-plot-title"
              onClick={() => onRestore(plot.id)}
              style={{ cursor: "pointer" }}
              title={t ? t("Click to restore") : "Click to restore"}
            >
              {getPlotTitle(plot.plotData)}
            </span>
            <div className="minimized-plot-actions">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => onRestore(plot.id)}
                title={t ? t("Restore") : "Restore"}
              >
                <FontAwesomeIcon icon={faExpand} />
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => onClose(plot.id)}
                title={t ? t("Close") : "Close"}
              >
                <FontAwesomeIcon icon={faXmark} />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

MinimizedPlotBar.propTypes = {
  minimizedPlots: PropTypes.array,
  onRestore: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
};

export default withTranslation()(MinimizedPlotBar);