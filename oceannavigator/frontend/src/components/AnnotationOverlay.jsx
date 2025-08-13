import React from "react";
import ReactDOM from "react-dom/client";
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
    const container = document.createElement("div");
    container.className = "annotation-container";

    const root = ReactDOM.createRoot(container);
    root.render(
      <div className="annotation-box">
        <button
          className="annotation-close"
          onClick={() => this.removeOverlayByContainer(container)}
        >
          ×
        </button>
        <div className="annotation-text">{text}</div>
      </div>
    );

    const overlay = new Overlay({
      element: container,
      position: coord,
      positioning: "bottom-left",
      offset: [0, -30],
    });

    this.map.addOverlay(overlay);
    this.overlays.push(overlay);
    this._setupDragging(container, overlay);

    // Keep only what you actually need later
    overlay._reactRoot = root;

    return overlay;
  };

  _setupDragging = (element, overlay) => {
    let dragging = false;
    let startPixel;

    element.addEventListener("mousedown", (evt) => {
      if (evt.target.closest(".annotation-close")) return;
      dragging = true;
      startPixel = [evt.clientX, evt.clientY];
      evt.stopPropagation();
      element.style.cursor = "move";
      element.classList.add("dragging");
    });

    const handleMouseMove = (evt) => {
      if (!dragging) return;
      const dx = evt.clientX - startPixel[0];
      const dy = evt.clientY - startPixel[1];
      startPixel = [evt.clientX, evt.clientY];
      const curr = this.map.getPixelFromCoordinate(overlay.getPosition());
      const next = [curr[0] + dx, curr[1] + dy];
      overlay.setPosition(this.map.getCoordinateFromPixel(next));
    };

    const handleMouseUp = () => {
      if (!dragging) return;
      dragging = false;
      element.style.cursor = "";
      element.classList.remove("dragging");
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    overlay._cleanup = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  };

  removeOverlayByContainer = (container) => {
    const overlay = this.overlays.find((o) => o.getElement() === container);
    if (overlay) this.removeOverlay(overlay);
  };

  removeOverlay = (overlay) => {
    this.map.removeOverlay(overlay);
    this.overlays = this.overlays.filter((o) => o !== overlay);
    overlay._reactRoot?.unmount();
    overlay._cleanup?.();
  };

  undoLastAnnotation = () => {
    const last = this.overlays[this.overlays.length - 1];
    if (last) this.removeOverlay(last);
  };

  clearAllAnnotations = () => {
    const all = [...this.overlays];
    all.forEach(this.removeOverlay);
  };

  getOverlays = () => [...this.overlays];
}
