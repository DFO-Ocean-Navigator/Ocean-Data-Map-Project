// PlotComponents.jsx
import React from "react";
import Button from "react-bootstrap/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faExpand, faMinus } from "@fortawesome/free-solid-svg-icons";

// format latitude and longitude
const formatLatLon = (lat, lon) => {
  lat = Math.max(-90, Math.min(90, lat));
  lon = lon > 180 ? lon - 360 : lon < -180 ? lon + 360 : lon;
  return `${Math.abs(lat).toFixed(4)} ${lat >= 0 ? "N" : "S"}, ${Math.abs(
    lon
  ).toFixed(4)} ${lon >= 0 ? "E" : "W"}`;
};

// Gets title of the window
export const getPlotTitle = (plotData) => {
  if (!plotData) return "Plot";
  const { type, coordinates, id, plotName } = plotData;

  if (plotName) return plotName;

  switch (type) {
    case "Point":
      return coordinates?.length
        ? `Point Plot - ${formatLatLon(coordinates[0][0], coordinates[0][1])}`
        : "Point Plot";
    case "LineString":
      return `Line Plot - ${coordinates?.length || 0} points`;
    case "Polygon":
      return `Area Plot - ${coordinates?.length || 0} vertices`;
    case "track":
      return id ? `Track Plot - ${id}` : "Track Plot";
    case "class4":
      return id ? `Class 4 Analysis - ${id}` : "Class 4 Analysis";
    default:
      return `${type} Plot`;
  }
};

// MinimizedPlotBar component
export const MinimizedPlotBar = ({ minimizedPlots, onRestore, onClose }) => {
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
              title="Click to restore"
            >
              {getPlotTitle(plot.plotData)}
            </span>
            <div className="minimized-plot-actions">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => onRestore(plot.id)}
                title="Restore"
              >
                <FontAwesomeIcon icon={faExpand} />
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => onClose(plot.id)}
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
};

// ActivePlotsContainer component
export const ActivePlotsContainer = ({ activePlots, onMinimize, onClose }) => {
  if (!activePlots?.length) return null;

  return (
    <div
      className={`active-plots-container ${
        activePlots.length === 2 ? "side-by-side" : "single-plot"
      }`}
    >
      {activePlots.map((plot) => (
        <div
          key={plot.id}
          className={`active-plot-window ${
            activePlots.length === 2 ? "half-width" : "full-width"
          }`}
        >
          <div className="plot-window-header">
            <h5 className="plot-window-title">{getPlotTitle(plot.plotData)}</h5>
            <div className="plot-window-controls">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => onMinimize(plot.id)}
                title="Minimize"
              >
                <FontAwesomeIcon icon={faMinus} />
              </Button>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => onClose(plot.id)}
                title="Close"
              >
                <FontAwesomeIcon icon={faXmark} />
              </Button>
            </div>
          </div>
          <div className="plot-window-content">{plot.component}</div>
        </div>
      ))}
    </div>
  );
};
