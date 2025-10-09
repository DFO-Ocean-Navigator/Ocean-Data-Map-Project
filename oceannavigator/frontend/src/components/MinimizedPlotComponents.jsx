import React from "react";
import Button from "react-bootstrap/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faExpand } from "@fortawesome/free-solid-svg-icons";
import PropTypes from "prop-types";

const MinimizedPlotBar = ({ plotData, action }) => {

  const handleRestore = (plot) => {
    action("updatePlot", { ...plot, active: true });
  };

  const handleClose = (plot) => {
    action("closePlot", plot);
  };

  let minimizedPlots = plotData?.filter((plot) => !plot.active);

  return minimizedPlots.length > 0 ? (
    <div className="minimized-plots-container">
      {minimizedPlots.map((plot) => (
        <div key={plot.id} className="minimized-plot-bar">
          <div className="minimized-plot-content">
            <span
              className="minimized-plot-title"
              onClick={() => handleRestore(plot)}
              style={{ cursor: "pointer" }}
              title="Click to restore"
            >
              {plot.title}
            </span>
            <div className="minimized-plot-actions">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => handleRestore(plot)}
                title="Restore"
              >
                <FontAwesomeIcon icon={faExpand} />
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => handleClose(plot)}
                title="Close"
              >
                <FontAwesomeIcon icon={faXmark} />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  ) : null;
};

MinimizedPlotBar.propTypes = {
  plotData: PropTypes.array.isRequired,
};

export default MinimizedPlotBar;
