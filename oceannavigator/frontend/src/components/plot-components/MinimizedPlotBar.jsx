import React from "react";
import Button from "react-bootstrap/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faExpand } from "@fortawesome/free-solid-svg-icons";
import PropTypes from "prop-types";

const MinimizedPlotBar = ({ plotData, action }) => {
  const handleRestore = (plot) => {
    // Count how many plots are currently active
    const activePlots = plotData.filter(p => p.active);
    
    let plots;
    if (activePlots.length < 2) {
      // If less than 2 plots are active, just activate this one
      plots = plotData.map((p) =>
        p.id === plot.id ? { ...p, active: true } : p
      );
    } else {
      // If 2 plots are already active, close the first active one and open this one
      const firstActivePlot = activePlots[0];
      plots = plotData.map((p) => {
        if (p.id === plot.id) {
          return { ...p, active: true };
        } else if (p.id === firstActivePlot.id) {
          return { ...p, active: false };
        }
        return p;
      });
    }
    
    action("updatePlots", plots);
  };

  const handleClose = (plot) => {
    action("closePlot", plot);
  };

  let plotTabs = plotData.map((plot) => {
    let active = plot.active ? "active" : "minimized";
    return (
      <div key={plot.id} className={`plot-tab ${active}`}>
        <div className="plot-tab-content">
          <span
            className={`plot-title ${active}`}
            onClick={() => handleRestore(plot)}
            style={{ cursor: "pointer" }}
            title="Click to restore"
          >
            {plot.title}
          </span>
          <div className={`plot-actions ${active}`}>
            <Button
              size="sm"
              onClick={() => handleRestore(plot)}
              title="Restore"
              disabled={plot.active}
            >
              <FontAwesomeIcon icon={faExpand} />
            </Button>
            <Button size="sm" onClick={() => handleClose(plot)} title="Close">
              <FontAwesomeIcon icon={faXmark} />
            </Button>
          </div>
        </div>
      </div>
    );
  });

  return plotData.length > 0 ? (
    <div className="minimized-plot-bar">{plotTabs}</div>
  ) : null;
};

MinimizedPlotBar.propTypes = {
  plotData: PropTypes.array.isRequired,
  action: PropTypes.func.isRequired,
};

export default MinimizedPlotBar;