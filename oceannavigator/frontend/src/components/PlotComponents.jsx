import React from "react";
import Button from "react-bootstrap/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faMinus } from "@fortawesome/free-solid-svg-icons";
import { withTranslation } from "react-i18next";
import PointWindow from "./PointWindow.jsx";
import LineWindow from "./LineWindow.jsx";
import AreaWindow from "./AreaWindow.jsx";
import TrackWindow from "./TrackWindow.jsx";
import Class4Window from "./Class4Window.jsx";

import { formatLatLon, getPlotTitle } from "./OceanNavigator.jsx";

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
        />
      );
    case "Polygon":
      return <AreaWindow {...commonProps} />;
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

const ActivePlotsContainer = ({
  activePlots,
  onMinimize,
  onClose,
  t,
  // Props needed for createPlotComponent
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
}) => {
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
            <h5 className="plot-window-title">{getPlotTitle(plot.plotData)}</h5>
            <div className="plot-window-controls">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => onMinimize(plot.id)}
                title={t ? t("Minimize") : "Minimize"}
              >
                <FontAwesomeIcon icon={faMinus} />
              </Button>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => onClose(plot.id)}
                title={t ? t("Close") : "Close"}
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
};

export default withTranslation()(ActivePlotsContainer);
