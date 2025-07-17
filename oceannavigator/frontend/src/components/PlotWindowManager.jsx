// Fixed PlotWindowManager.jsx - Modal-style overlays with sidebar
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

// Left Sidebar for Minimized Plots - Always Visible
const PlotSidebar = ({ plotWindows, restorePlotWindow, closePlotWindow }) => {
  const minimizedWindows = plotWindows.filter(w => w.minimized);
  const activeWindows = plotWindows.filter(w => !w.minimized);
  
  // Always show sidebar if there are any plot windows
  if (plotWindows.length === 0) return null;

  return (
    <div
      className="plot-sidebar"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: '60px',
        backgroundColor: '#343a40',
        borderRight: '1px solid #dee2e6',
        zIndex: 1001, // Higher than modal backdrop
        display: 'flex',
        flexDirection: 'column',
        padding: '10px 0',
        boxShadow: '2px 0 5px rgba(0,0,0,0.1)'
      }}
    >
      {/* Active Windows Indicators */}
      {activeWindows.map((window, index) => (
        <div
          key={`active-${window.id}`}
          className="plot-sidebar-item active"
          style={{
            margin: '5px 8px',
            padding: '8px 4px',
            backgroundColor: '#007bff',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '40px',
            position: 'relative',
            border: '2px solid #007bff',
            transition: 'all 0.2s ease'
          }}
          onClick={() => minimizePlotWindow(window.id)}
          title={`Minimize: ${window.title}`}
        >
          <div
            style={{
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold',
              textAlign: 'center',
              wordBreak: 'break-word',
              lineHeight: '1.2'
            }}
          >
            {index + 1}
          </div>
          <Button
            variant="link"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              closePlotWindow(window.id);
            }}
            style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: '#dc3545',
              border: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: 'white'
            }}
          >
            <FontAwesomeIcon icon={faXmark} />
          </Button>
        </div>
      ))}

      {/* Separator */}
      {activeWindows.length > 0 && minimizedWindows.length > 0 && (
        <div
          style={{
            height: '1px',
            backgroundColor: '#6c757d',
            margin: '10px 8px'
          }}
        />
      )}

      {/* Minimized Windows */}
      {minimizedWindows.map((window) => (
        <div
          key={`minimized-${window.id}`}
          className="plot-sidebar-item minimized"
          style={{
            margin: '5px 8px',
            padding: '8px 4px',
            backgroundColor: '#6c757d',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '40px',
            position: 'relative',
            border: '2px solid #6c757d',
            transition: 'all 0.2s ease'
          }}
          onClick={() => restorePlotWindow(window.id)}
          title={`Restore: ${window.title}`}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#5a6268';
            e.currentTarget.style.borderColor = '#5a6268';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#6c757d';
            e.currentTarget.style.borderColor = '#6c757d';
          }}
        >
          <div
            style={{
              color: 'white',
              fontSize: '10px',
              fontWeight: 'bold',
              textAlign: 'center',
              wordBreak: 'break-word',
              lineHeight: '1.2',
              maxWidth: '100%'
            }}
          >
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
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: '#dc3545',
              border: 'none',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: 'white'
            }}
          >
            <FontAwesomeIcon icon={faXmark} />
          </Button>
        </div>
      ))}

      {/* Plot Count Badge */}
      {plotWindows.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#28a745',
            color: 'white',
            borderRadius: '12px',
            padding: '4px 8px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}
        >
          {plotWindows.length}
        </div>
      )}
    </div>
  );
};

// Enhanced Hook with New Logic
const usePlotWindowManager = () => {
  const [plotWindows, setPlotWindows] = useState([]);
  const [nextZIndex, setNextZIndex] = useState(1000);

  const createPlotWindow = (id, title, component, options = {}) => {
    // Check if window with same ID already exists
    const existingWindow = plotWindows.find(w => w.id === id);
    if (existingWindow) {
      // If exists, just restore it
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
    closePlotWindow,
    minimizePlotWindow,
    restorePlotWindow,
    bringToFront
  };
};

export { PlotWindowManager, PlotSidebar, usePlotWindowManager };