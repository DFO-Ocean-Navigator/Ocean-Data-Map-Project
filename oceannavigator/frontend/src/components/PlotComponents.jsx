import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import Button from "react-bootstrap/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faMinus } from "@fortawesome/free-solid-svg-icons";
import PropTypes from "prop-types";
import PointWindow from "./PointWindow.jsx";
import LineWindow from "./LineWindow.jsx";
import AreaWindow from "./AreaWindow.jsx";
import TrackWindow from "./TrackWindow.jsx";
import Class4Window from "./Class4Window.jsx";
import { formatLatLon } from "./OceanNavigator.jsx";

// Generate plot title from plotData
export function getPlotTitle(plotData) {
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
}

// Create plot component
const createPlotComponent = (plotData, plotId, props) => {
  const {
    mapRef,
    dataset0,
    dataset1,
    mapSettings,
    names,
    updateDataset0,
    updateDataset1,
    subquery,
    action,
    compareDatasets,
    setCompareDatasets,
    class4Type,
    swapViews,
  } = props;

  const { type } = plotData;
  const commonProps = {
    plotData,
    dataset_0: dataset0,
    dataset_1: dataset1,
    mapSettings,
    names,
    updateDataset0,
    updateDataset1,
    init: subquery,
    action,
    dataset_compare: compareDatasets,
    setCompareDatasets,
    key: plotId,
    swapViews,
  };

  switch (type) {
    case "Point":
      return <PointWindow {...commonProps} updateDataset={updateDataset0} />;
    case "LineString":
      const line_distance =
        mapRef.current?.getLineDistance?.(plotData.coordinates) || 0;
      return (
        <LineWindow
          {...commonProps}
          line_distance={line_distance}
          onUpdate={updateDataset0}
          swapViews={swapViews}
        />
      );
    case "Polygon":
      return <AreaWindow {...commonProps} swapViews={swapViews} />;
    case "track":
      return (
        <TrackWindow
          {...commonProps}
          dataset={dataset0}
          track={plotData.coordinates}
          onUpdate={updateDataset0}
        />
      );
    case "class4":
      return (
        <Class4Window
          dataset={dataset0.id}
          plotData={plotData}
          class4type={plotData.class4type || class4Type}
          init={subquery}
          action={action}
          key={plotId}
        />
      );
    default:
      return <div key={plotId}>Unknown plot type: {type}</div>;
  }
};

const ActivePlotsContainer = forwardRef(({
  newPlotData,
  onMinimizedPlotsChange,
  mapRef,
  dataset0,
  dataset1,
  mapSettings,
  names,
  updateDataset0,
  updateDataset1,
  subquery,
  action,
  compareDatasets,
  setCompareDatasets,
  class4Type,
  swapViews,
}, ref) => {
  const [activePlots, setActivePlots] = useState([]);
  const lastProcessedPlotRef = useRef(null);

  useImperativeHandle(ref, () => ({
    restorePlot: (restoredPlot) => {
      if (activePlots.some(plot => plot.id === restoredPlot.id)) {
        return;
      }

      setActivePlots((prev) => {
        const newActivePlots = [...prev];
        if (newActivePlots.length >= 2) {
          const oldestPlot = newActivePlots.shift();
          onMinimizedPlotsChange?.({ action: 'add', plot: oldestPlot });
        }
        return [...newActivePlots, restoredPlot];
      });
    },
    
    clearAllPlots: () => {
      setActivePlots([]);
      lastProcessedPlotRef.current = null;
      onMinimizedPlotsChange?.({ action: 'clearAll' });
    }
  }), [activePlots, onMinimizedPlotsChange]);

useEffect(() => {
  if (newPlotData?.type && newPlotData?.id) {
    const plotId = newPlotData.id;
    
        if (lastProcessedPlotRef.current === plotId) {
              return;
                  }

    // restores plot if it exists in the minimized window
    if (onMinimizedPlotsChange) {
      const shouldRestore = onMinimizedPlotsChange({ 
        action: 'checkExists', 
        plotId 
      });
      
      if (shouldRestore) {
        lastProcessedPlotRef.current = plotId;
        return;
      }
    }

    lastProcessedPlotRef.current = plotId;
    const plotTitle = getPlotTitle(newPlotData);

    const newActivePlot = {
      id: plotId,
      plotData: newPlotData,
      title: plotTitle,
    };

    setActivePlots((prev) => {
      const newActivePlots = [...prev];
      if (newActivePlots.length >= 2) {
        const oldestPlot = newActivePlots.shift();
        onMinimizedPlotsChange?.({ action: 'add', plot: oldestPlot });
      }
      return [...newActivePlots, newActivePlot];
    });
  }
}, [newPlotData, activePlots, onMinimizedPlotsChange]);

  const handleMinimize = (plotId) => {
    const plotToMinimize = activePlots.find((plot) => plot.id === plotId);
    if (plotToMinimize) {
      onMinimizedPlotsChange?.({ action: 'add', plot: plotToMinimize });
      setActivePlots((prev) => prev.filter((plot) => plot.id !== plotId));
    }
  };

  const handleClose = (plotId) => {
    setActivePlots((prev) => prev.filter((plot) => plot.id !== plotId));
    onMinimizedPlotsChange?.({ action: 'remove', plotId });
  };

  if (!activePlots?.length) return null;

  const createComponentProps = {
    mapRef,
    dataset0,
    dataset1,
    mapSettings,
    names,
    updateDataset0,
    updateDataset1,
    subquery,
    action,
    compareDatasets,
    setCompareDatasets,
    class4Type,
    swapViews,
  };

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
            <h5 className="plot-window-title">{plot.title}</h5>
            <div className="plot-window-controls">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => handleMinimize(plot.id)}
                title="Minimize"
              >
                <FontAwesomeIcon icon={faMinus} />
              </Button>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => handleClose(plot.id)}
                title="Close"
              >
                <FontAwesomeIcon icon={faXmark} />
              </Button>
            </div>
          </div>
          <div className="plot-window-content">
            {createPlotComponent(plot.plotData, plot.id, createComponentProps)}
          </div>
        </div>
      ))}
    </div>
  );
});

ActivePlotsContainer.propTypes = {
  newPlotData: PropTypes.object,
  onMinimizedPlotsChange: PropTypes.func.isRequired,
  mapRef: PropTypes.object.isRequired,
  dataset0: PropTypes.object.isRequired,
  dataset1: PropTypes.object.isRequired,
  mapSettings: PropTypes.object.isRequired,
  names: PropTypes.array,
  updateDataset0: PropTypes.func.isRequired,
  updateDataset1: PropTypes.func.isRequired,
  subquery: PropTypes.any,
  action: PropTypes.func.isRequired,
  compareDatasets: PropTypes.bool,
  setCompareDatasets: PropTypes.func.isRequired,
  class4Type: PropTypes.string,
};

export default ActivePlotsContainer;