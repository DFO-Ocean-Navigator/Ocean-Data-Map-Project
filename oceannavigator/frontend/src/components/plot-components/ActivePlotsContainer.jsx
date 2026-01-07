import React from "react";
import Button from "react-bootstrap/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faMinus } from "@fortawesome/free-solid-svg-icons";
import PropTypes from "prop-types";

import PointWindow from "./PointWindow.jsx";
import LineWindow from "./LineWindow.jsx";
import AreaWindow from "./AreaWindow.jsx";
import TrackWindow from "./TrackWindow.jsx";
import Class4Window from "./Class4Window.jsx";

const ActivePlotsContainer = ({
  plotData,
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
  observationQuery,
  class4Type,
  swapViews,
}) => {

  const handleMinimize = (plot) => {
    let plots = [...plotData];
    const idx = plots.findIndex((prevPlot) => plot.id === prevPlot.id);
    plots[idx] = { ...plots[idx], active: false };
    action("updatePlots", plots);
  };

  const handleClose = (plot) => {
    action("closePlot", plot);
  };

  const createPlotComponent = (plot) => {
    switch (plot.type) {
      case "Point":
        return (
          <PointWindow
            dataset={dataset0}
            plotData={plot}
            mapSettings={mapSettings}
            updateDataset={updateDataset0}
            init={subquery}
            action={action}
            names={names}
          />
        );
      case "LineString":
        return (
          <LineWindow
            dataset0={dataset0}
            dataset1={dataset1}
            plotData={plot}
            mapSettings={mapSettings}
            names={names}
            onUpdate={updateDataset0}
            updateDataset0={updateDataset0}
            updateDataset1={updateDataset1}
            init={subquery}
            action={action}
            compareDatasets={compareDatasets}
            setCompareDatasets={setCompareDatasets}
            swapViews={swapViews}
          />
        );
      case "Polygon":
        return (
          <AreaWindow
            dataset0={dataset0}
            dataset1={dataset1}
            plotData={plot}
            mapSettings={mapSettings}
            names={names}
            updateDataset0={updateDataset0}
            updateDataset1={updateDataset1}
            init={subquery}
            action={action}
            compareDatasets={compareDatasets}
            setCompareDatasets={setCompareDatasets}
            swapViews={swapViews}
          />
        );
      case "Track":
        return (
          <TrackWindow
            dataset={dataset0}
            plotData={plot}
            observationQuery={observationQuery}
            names={names}
            onUpdate={updateDataset0}
            init={subquery}
            action={action}
          />
        );
      case "class4":
        return (
          <Class4Window
            dataset={dataset0.id}
            plotData={plot}
            class4type={plot.class4type || class4Type}
            init={subquery}
            action={action}
            key={plot.id}
          />
        );
    }
  };

  let activePlots = plotData.filter((plot) => plot.active);
  let plotComponents = activePlots.map((plot) => {
    let plotWindow = createPlotComponent(plot);
    return (
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
              onClick={() => handleMinimize(plot)}
              title="Minimize"
            >
              <FontAwesomeIcon icon={faMinus} />
            </Button>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => handleClose(plot)}
              title="Close"
            >
              <FontAwesomeIcon icon={faXmark} />
            </Button>
          </div>
        </div>
        <div className="plot-window-content">{plotWindow}</div>
      </div>
    );
  });

  return plotComponents.length > 0 ? (
    <div
      className={`active-plots-container ${
        plotComponents.length === 2 ? "side-by-side" : "single-plot"
      }`}
    >
      {plotComponents}
    </div>
  ) : null;
};

ActivePlotsContainer.propTypes = {
  plotData: PropTypes.array.isRequired,
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
  observationQuery: PropTypes.object,
  class4Type: PropTypes.string,
};

export default ActivePlotsContainer;
