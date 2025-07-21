// PlotWindowManager.jsx with All Styles in CSS
import React, { useState, useRef, useEffect } from "react";
import { Modal, Button, ButtonGroup } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faWindowMinimize,
  faWindowRestore,
  faXmark,
  faWindowMaximize,
  faMinus,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";

const PlotWindowManager = ({
  plotWindows,
  updatePlotWindow,
  closePlotWindow,
  minimizePlotWindow,
  restorePlotWindow,
  children,
}) => {
  const activeWindows = plotWindows.filter((w) => !w.minimized);

  const renderModalPlots = () => {
    if (activeWindows.length === 0) return null;

    const modals = activeWindows.map((window, index) => (
      <div
        key={window.id}
        className={`plot-modal-container ${
          activeWindows.length === 1
            ? "plot-modal-single"
            : index === 0
            ? "plot-modal-left"
            : "plot-modal-right"
        }`}
        style={{ zIndex: 999 + index }}
      >
        {/* Window Header */}
        <div className="plot-window-header">
          <h5 className="plot-window-title">{window.title}</h5>

          <ButtonGroup size="sm">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => minimizePlotWindow(window.id)}
              title="Minimize"
            >
              <FontAwesomeIcon icon={faMinus} />
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => closePlotWindow(window.id)}
              title="Close"
            >
              <FontAwesomeIcon icon={faXmark} />
            </Button>
          </ButtonGroup>
        </div>

        {/* Window Content */}
        <div className="plot-window-content">{window.component}</div>
      </div>
    ));

    return [...modals];
  };

  return (
    <>
      {renderModalPlots()}
      {children}
    </>
  );
};

// Top Horizontal Panel for Minimized Plots
const PlotSidePanel = ({ plotWindows, restorePlotWindow, closePlotWindow }) => {
  const minimizedWindows = plotWindows.filter((w) => w.minimized);
  const activeWindows = plotWindows.filter((w) => !w.minimized);

  if (minimizedWindows.length === 0) return null;

  return (
    <div className="plot-top-panel">
      {/* Minimized Windows List */}
      <div className="plot-minimized-container">
        {minimizedWindows.map((window) => (
          <div
            key={`minimized-${window.id}`}
            className="plot-top-item"
            onClick={() => restorePlotWindow(window.id)}
            title={`Restore: ${window.title}`}
          >
            <div className="plot-item-text">{window.title.split(" - ")[0]}</div>
            <Button
              variant="link"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                closePlotWindow(window.id);
              }}
              className="plot-close-btn"
            >
              <FontAwesomeIcon icon={faXmark} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};


const usePlotWindowManager = () => {
  const [plotWindows, setPlotWindows] = useState([]);
  const [nextZIndex, setNextZIndex] = useState(1000);

  const createPlotWindow = (id, title, component, options = {}) => {
    // Check if window with same ID already exists
    const existingWindow = plotWindows.find((w) => w.id === id);
    if (existingWindow) {
      // If exists, just restore it and update component
      updatePlotWindow(id, { component });
      restorePlotWindow(id);
      return existingWindow;
    }

    const defaultOptions = {
      minimized: false,
      zIndex: nextZIndex,
    };

    const newWindow = {
      id,
      title,
      component,
      ...defaultOptions,
      ...options,
    };

    setPlotWindows((prev) => [...prev, newWindow]);
    setNextZIndex((prev) => prev + 1);
    return newWindow;
  };

  const updatePlotWindow = (id, updates) => {
    setPlotWindows((prev) =>
      prev.map((window) =>
        window.id === id ? { ...window, ...updates } : window
      )
    );
  };

  const updateAllPlotWindows = (updates) => {
    setPlotWindows((prev) => prev.map((window) => ({ ...window, ...updates })));
  };

  // New function to update plot component when data changes
  const updatePlotComponent = (id, newComponent) => {
    updatePlotWindow(id, { component: newComponent });
  };

  const closePlotWindow = (id) => {
    setPlotWindows((prev) => prev.filter((window) => window.id !== id));
  };

  const minimizePlotWindow = (id) => {
    updatePlotWindow(id, { minimized: true });
  };

  const restorePlotWindow = (id) => {
    const activeWindows = plotWindows.filter((w) => !w.minimized);

    // If we already have 2 active windows, minimize the oldest one
    if (activeWindows.length >= 2) {
      const oldestActive = activeWindows[0];
      updatePlotWindow(oldestActive.id, { minimized: true });
    }

    updatePlotWindow(id, {
      minimized: false,
      zIndex: nextZIndex,
    });
    setNextZIndex((prev) => prev + 1);
  };

  const bringToFront = (id) => {
    updatePlotWindow(id, { zIndex: nextZIndex });
    setNextZIndex((prev) => prev + 1);
  };

  return {
    plotWindows,
    createPlotWindow,
    updatePlotWindow,
    updateAllPlotWindows,
    updatePlotComponent,
    closePlotWindow,
    minimizePlotWindow,
    restorePlotWindow,
    bringToFront,
  };
};

export { PlotWindowManager, PlotSidePanel, usePlotWindowManager };
