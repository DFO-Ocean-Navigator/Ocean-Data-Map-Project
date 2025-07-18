// PlotWindowManager.jsx with Top Horizontal Panel
import React, { useState, useRef, useEffect } from 'react';
import { Modal, Button, ButtonGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWindowMinimize, faWindowRestore, faXmark, faWindowMaximize, faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';

const PlotWindowManager = ({ 
  plotWindows, 
  updatePlotWindow, 
  closePlotWindow, 
  minimizePlotWindow, 
  restorePlotWindow,
  children 
}) => {
  const activeWindows = plotWindows.filter(w => !w.minimized);
  
  const renderModalPlots = () => {
    if (activeWindows.length === 0) return null;
    
    // Create backdrop
    const backdrop = (
      <div
        key="backdrop"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 998,
        }}
      />
    );

    // Modal container style
    const getModalStyle = (index, total) => {
      const baseWidth = total === 1 ? '90vw' : '45vw';
      const baseHeight = '85vh';
      const leftOffset = total === 1 ? '50%' : (index === 0 ? '25%' : '75%');
      
      return {
        position: 'fixed',
        top: '50%',
        left: leftOffset,
        transform: 'translate(-50%, -50%)',
        width: baseWidth,
        height: baseHeight,
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
        zIndex: 999 + index,
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #dee2e6',
        overflow: 'hidden'
      };
    };

    const modals = activeWindows.map((window, index) => (
      <div
        key={window.id}
        style={getModalStyle(index, activeWindows.length)}
      >
        {/* Window Header */}
        <div
          className="plot-window-header"
          style={{
            padding: '1rem 1.5rem',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #dee2e6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0
          }}
        >
          <h5 className="mb-0" style={{ fontSize: '1.1rem', fontWeight: 600, color: '#495057' }}>
            {window.title}
          </h5>
          
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
        <div
          className="plot-window-content"
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 0,
            backgroundColor: 'white'
          }}
        >
          {window.component}
        </div>
      </div>
    ));

    return [backdrop, ...modals];
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
  const minimizedWindows = plotWindows.filter(w => w.minimized);
  const activeWindows = plotWindows.filter(w => !w.minimized);
  
  if (minimizedWindows.length === 0) return null;

  return (
    <div
      className="plot-top-panel"
      style={{
        position: 'fixed',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'auto',
        maxWidth: '80vw',
        backgroundColor: 'transparent',
        padding: '0',
        borderRadius: '0',
        border: 'none',
        boxShadow: 'none',
        zIndex: 1001,
        backdropFilter: 'none',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        overflow: 'hidden'
      }}
    >
      {/* Active plots indicator */}
      {activeWindows.length > 0 && (
        <>
          <div
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              borderRadius: '12px',
              padding: '4px 8px',
              fontSize: '12px',
              fontWeight: 'bold',
              minWidth: '20px',
              textAlign: 'center'
            }}
          >
            {activeWindows.length}
          </div>
          <div
            style={{
              width: '1px',
              height: '20px',
              backgroundColor: '#dee2e6',
            }}
          />
        </>
      )}

      {/* Minimized Windows List */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '8px',
          alignItems: 'center',
          overflow: 'hidden'
        }}
      >
        {minimizedWindows.map((window) => (
          <div
            key={`minimized-${window.id}`}
            className="plot-top-item"
            style={{
              padding: '6px 12px',
              backgroundColor: '#2476AA',
              borderRadius: '4px',
              border: '1px solid #dee2e6',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '16px',
              fontWeight: '500',
              color: 'white',
              transition: 'all 0.2s ease',
              minWidth: '200px',
              maxWidth: '300px',
              whiteSpace: 'nowrap'
            }}
            onClick={() => restorePlotWindow(window.id)}
            title={`Restore: ${window.title}`}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0056b3';
              e.currentTarget.style.borderColor = '#007bff';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#2476AA';
              e.currentTarget.style.borderColor = '#dee2e6';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap',
              flex: 1
            }}>
              {window.title.split(' - ')[0]}
            </div>
            <Button
              variant="link"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                closePlotWindow(window.id);
              }}
              style={{
                padding: '2px',
                fontSize: '10px',
                color: '#dc3545',
                lineHeight: 1,
                minWidth: 'auto',
                width: '16px',
                height: '16px'
              }}
            >
              <FontAwesomeIcon icon={faXmark} />
            </Button>
          </div>
        ))}
      </div>

      {/* Total count badge */}
      <div
        style={{
          backgroundColor: '#007bff',
          color: 'white',
          borderRadius: '12px',
          padding: '4px 8px',
          fontSize: '12px',
          fontWeight: 'bold',
          minWidth: '20px',
          textAlign: 'center'
        }}
      >
        {plotWindows.length}
      </div>
    </div>
  );
};

// Enhanced Hook with Data Synchronization
const usePlotWindowManager = () => {
  const [plotWindows, setPlotWindows] = useState([]);
  const [nextZIndex, setNextZIndex] = useState(1000);

  const createPlotWindow = (id, title, component, options = {}) => {
    // Check if window with same ID already exists
    const existingWindow = plotWindows.find(w => w.id === id);
    if (existingWindow) {
      // If exists, just restore it and update component
      updatePlotWindow(id, { component });
      restorePlotWindow(id);
      return existingWindow;
    }

    const defaultOptions = {
      minimized: false,
      zIndex: nextZIndex
    };

    const newWindow = {
      id,
      title,
      component,
      ...defaultOptions,
      ...options
    };

    setPlotWindows(prev => [...prev, newWindow]);
    setNextZIndex(prev => prev + 1);
    return newWindow;
  };

  const updatePlotWindow = (id, updates) => {
    setPlotWindows(prev => 
      prev.map(window => 
        window.id === id ? { ...window, ...updates } : window
      )
    );
  };

  const updateAllPlotWindows = (updates) => {
    setPlotWindows(prev => 
      prev.map(window => ({ ...window, ...updates }))
    );
  };

  // New function to update plot component when data changes
  const updatePlotComponent = (id, newComponent) => {
    updatePlotWindow(id, { component: newComponent });
  };

  const closePlotWindow = (id) => {
    setPlotWindows(prev => prev.filter(window => window.id !== id));
  };

  const minimizePlotWindow = (id) => {
    updatePlotWindow(id, { minimized: true });
  };

  const restorePlotWindow = (id) => {
    const activeWindows = plotWindows.filter(w => !w.minimized);
    
    // If we already have 2 active windows, minimize the oldest one
    if (activeWindows.length >= 2) {
      const oldestActive = activeWindows[0];
      updatePlotWindow(oldestActive.id, { minimized: true });
    }
    
    updatePlotWindow(id, { 
      minimized: false, 
      zIndex: nextZIndex 
    });
    setNextZIndex(prev => prev + 1);
  };

  const bringToFront = (id) => {
    updatePlotWindow(id, { zIndex: nextZIndex });
    setNextZIndex(prev => prev + 1);
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
    bringToFront
  };
};

export { PlotWindowManager, PlotSidePanel, usePlotWindowManager };