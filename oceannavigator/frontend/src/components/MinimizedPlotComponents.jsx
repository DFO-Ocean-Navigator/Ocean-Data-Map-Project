import React, { useState, forwardRef, useImperativeHandle } from "react";
import Button from "react-bootstrap/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faExpand } from "@fortawesome/free-solid-svg-icons";
import PropTypes from "prop-types";

const MinimizedPlotBar = forwardRef(({ activePlotsRef }, ref) => {
  const [minimizedPlots, setMinimizedPlots] = useState([]);

  useImperativeHandle(ref, () => ({
    addPlot: (plot) => {
      setMinimizedPlots((prev) => {
        if (prev.some(p => p.id === plot.id)) {
          return prev;
        }
        return [...prev, plot];
      });
    },
    
    removePlot: (plotId) => {
      setMinimizedPlots((prev) => prev.filter((plot) => plot.id !== plotId));
    },
    
    clearAll: () => {
      setMinimizedPlots([]);
    },
    
    checkAndRestoreIfExists: (plotId) => {
      const exists = minimizedPlots.some(plot => plot.id === plotId);
      if (exists) {
        handleRestore(plotId);
        return true;
      }
      return false;
    }
  }), [minimizedPlots]);

  const handleRestore = (plotId) => {
    const plotToRestore = minimizedPlots.find((plot) => plot.id === plotId);
    if (plotToRestore) {
      setMinimizedPlots((prev) => prev.filter((plot) => plot.id !== plotId));
      activePlotsRef.current?.restorePlot(plotToRestore);
    }
  };

  const handleClose = (plotId) => {
    setMinimizedPlots((prev) => prev.filter((plot) => plot.id !== plotId));
  };

  if (!minimizedPlots?.length) return null;

  return (
    <div className="minimized-plots-container">
      {minimizedPlots.map((plot) => (
        <div key={plot.id} className="minimized-plot-bar">
          <div className="minimized-plot-content">
            <span
              className="minimized-plot-title"
              onClick={() => handleRestore(plot.id)}
              style={{ cursor: "pointer" }}
              title="Click to restore"
            >
              {plot.title}
            </span>
            <div className="minimized-plot-actions">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => handleRestore(plot.id)}
                title="Restore"
              >
                <FontAwesomeIcon icon={faExpand} />
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => handleClose(plot.id)}
                title="Close"
              >
                <FontAwesomeIcon icon={faXmark} />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

MinimizedPlotBar.propTypes = {
  activePlotsRef: PropTypes.object.isRequired,
};

export default MinimizedPlotBar;