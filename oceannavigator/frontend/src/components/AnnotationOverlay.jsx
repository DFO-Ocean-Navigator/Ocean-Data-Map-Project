import React from "react";
import Overlay from "ol/Overlay.js";

/**
 * Creates and manages annotation overlays on the map
 */
export class AnnotationOverlayManager {
  constructor(map) {
    this.map = map;
    this.overlays = [];
  }

  addAnnotationLabel = (text, coord) => {
    const el = document.createElement("div");
    el.className = "annotation-box";
    
    const closeBtn = document.createElement("span");
    closeBtn.className = "annotation-close";
    closeBtn.innerHTML = "×";
    el.appendChild(closeBtn);
    
    const textNode = document.createTextNode(text);
    el.insertBefore(textNode, closeBtn);

    const overlay = new Overlay({
      element: el,
      position: coord,
      positioning: "bottom-left",
      offset: [0, -30],
    });
    
    this.map.addOverlay(overlay);
    this.overlays.push(overlay);
    
    // Setup dragging functionality
    this._setupDragging(el, overlay);
    
    // Setup close button
    this._setupCloseButton(closeBtn, overlay);
    
    return overlay;
  };

  _setupDragging = (element, overlay) => {
    let dragging = false;
    let startPixel;

    element.addEventListener("mousedown", (evt) => {
      dragging = true;
      startPixel = [evt.clientX, evt.clientY];
      evt.stopPropagation();
    });

    const handleMouseMove = (evt) => {
      if (!dragging) return;
      
      const deltaX = evt.clientX - startPixel[0];
      const deltaY = evt.clientY - startPixel[1];
      startPixel = [evt.clientX, evt.clientY];

      const currPixel = this.map.getPixelFromCoordinate(overlay.getPosition());
      const newPixel = [currPixel[0] + deltaX, currPixel[1] + deltaY];
      const newCoord = this.map.getCoordinateFromPixel(newPixel);
      overlay.setPosition(newCoord);
    };

    const handleMouseUp = () => {
      dragging = false;
    };

    // Add event listeners to window for global mouse events
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    // Store cleanup functions on the overlay for later removal
    overlay._cleanup = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  };

  _setupCloseButton = (closeBtn, overlay) => {
    closeBtn.addEventListener("click", (evt) => {
      this.removeOverlay(overlay);
      evt.stopPropagation();
    });
  };

  removeOverlay = (overlay) => {
    this.map.removeOverlay(overlay);
    this.overlays = this.overlays.filter((o) => o !== overlay);
    
    // Clean up event listeners
    if (overlay._cleanup) {
      overlay._cleanup();
    }
  };

  undoLastAnnotation = () => {
    const lastOverlay = this.overlays.pop();
    if (lastOverlay) {
      this.map.removeOverlay(lastOverlay);
      if (lastOverlay._cleanup) {
        lastOverlay._cleanup();
      }
    }
  };

  clearAllAnnotations = () => {
    this.overlays.forEach((overlay) => {
      this.map.removeOverlay(overlay);
      if (overlay._cleanup) {
        overlay._cleanup();
      }
    });
    this.overlays = [];
  };

  getOverlays = () => {
    return [...this.overlays]; // Return a copy
  };

  // Cleanup method to call when component unmounts
  cleanup = () => {
    this.clearAllAnnotations();
  };
}