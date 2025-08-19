// AnnotationOverlay.jsx (compact + smooth)
import Overlay from "ol/Overlay.js";
import { unByKey } from "ol/Observable";
import DragPan from "ol/interaction/DragPan";

export class AnnotationOverlayManager {
  constructor(primaryMap, onUpdateAnnotation = null) {
    this.maps = [primaryMap].filter(Boolean);
    this.onUpdateAnnotation = onUpdateAnnotation;
    // id -> { id, text, position, direction, overlays: [] }
    this.annotations = new Map();
  }

  setSecondaryMap = (map) => {
    const prevSecond = this.maps[1];
    this.maps = [this.maps[0], map].filter(Boolean);
    if (!map || prevSecond === map) return;

    // Mirror overlays for existing annotations onto the new map
    this.annotations.forEach((entry) => {
      const ov = this._createOverlay({
        id: entry.id,
        text: entry.text,
        position: entry.position,
        direction: entry.direction,
      });
      map.addOverlay(ov);
      entry.overlays.push(ov);
    });
  };

  createAnnotationOverlays = ({ id, text, position, direction = 0 }) => {
    let entry = this.annotations.get(id);
    if (!entry) {
      entry = { id, text, position, direction, overlays: [] };
      this.annotations.set(id, entry);
    } else {
      if (text != null) entry.text = text;
      if (position != null) entry.position = position;
      if (direction != null) entry.direction = direction;
    }

    const overlays = this.maps.map((map) => {
      const ov = this._createOverlay({
        id: entry.id,
        text: entry.text,
        position: entry.position,
        direction: entry.direction,
      });
      map.addOverlay(ov);
      return ov;
    });

    entry.overlays.push(...overlays);
    return overlays;
  };

  _createOverlay = ({ id, text, position, direction = 0 }) => {
    const el = document.createElement("div");
    el.innerHTML = `
      <div class="annotation-box">
        <button class="annotation-close">×</button>
        <div class="annotation-text">${text}</div>
        <div class="annotation-arrow arrow-${direction}"></div>
      </div>
    `;

    const overlay = new Overlay({
      id: `annotation_${id}`,
      element: el,
      position,
      positioning: "bottom-center",
      offset: [0, -10],
      // allow map to receive pointer events for smooth pointerdrag
      stopEvent: false,
    });

    // Close: remove on clicked map; if compare is open, remove twin(s) too
    el.querySelector(".annotation-close").addEventListener("click", (e) => {
      e.stopPropagation();
      const map = overlay.getMap();
      if (overlay._cleanup) overlay._cleanup();
      if (map) map.removeOverlay(overlay);

      const entry = this.annotations.get(id);
      if (entry) {
        // remove other twins if second map is present
        if (this.maps.length > 1) {
          entry.overlays
            .filter((o) => o !== overlay)
            .forEach((o) => {
              if (o._cleanup) o._cleanup();
              const m = o.getMap();
              if (m) m.removeOverlay(o);
            });
        }
        entry.overlays = entry.overlays.filter((o) => o !== overlay);
        if (!entry.overlays.length) this.annotations.delete(id);
      }
    });

    // Drag/click (click = rotate, drag = move), using OL pointer events
    this._addDrag(el, overlay, id);
    return overlay;
  };

  _addDrag = (el, overlay, id) => {
    let dragging = false;
    let hasMoved = false;
    let dragKeys = [];
    let lastCoord = null;
    let disabledPans = [];

    const enableDragPan = (map, on) => {
      map.getInteractions().forEach((i) => {
        if (i instanceof DragPan) i.setActive(on);
      });
    };

    el.onmousedown = (e) => {
      if (e.target.className === "annotation-close") return;
      const map = this.maps.find((m) =>
        m.getOverlays().getArray().includes(overlay)
      );
      if (!map) return;

      dragging = true;
      hasMoved = false;
      el.style.cursor = "move";

      // disable map panning while dragging overlay to prevent background scroll
      enableDragPan(map, false);

      // seed lastCoord from the mousedown event
      lastCoord = map.getCoordinateFromPixel(map.getEventPixel(e));

      // smooth drag with OL pointer events
      const kDrag = map.on("pointerdrag", (evt) => {
        if (!dragging) return;
        const entry = this.annotations.get(id);
        if (!entry || !lastCoord) return;

        const dx = evt.coordinate[0] - lastCoord[0];
        const dy = evt.coordinate[1] - lastCoord[1];
        if (Math.abs(dx) > 0 || Math.abs(dy) > 0) hasMoved = true;

        // move this overlay and its twins
        const newPos = [overlay.getPosition()[0] + dx, overlay.getPosition()[1] + dy];
        entry.position = newPos;
        entry.overlays.forEach((o) => o.setPosition(newPos));

        if (this.onUpdateAnnotation) this.onUpdateAnnotation(id, { position: newPos });
        lastCoord = evt.coordinate;
      });

      const kUp = map.on("pointerup", () => {
        dragging = false;
        el.style.cursor = "";
        dragKeys.forEach(unByKey);
        dragKeys = [];
        enableDragPan(map, true);

        // rotation if it was a click (no move)
        if (!hasMoved) this._rotateArrow(id);
      });

      dragKeys.push(kDrag, kUp);
      e.stopPropagation();
      e.preventDefault();
    };

    // per-overlay cleanup
    overlay._cleanup = () => {
      dragKeys.forEach(unByKey);
      dragKeys = [];
      el.remove();
    };
  };

  _rotateArrow = (id) => {
    const entry = this.annotations.get(id);
    if (!entry) return;
    entry.direction = (entry.direction + 1) % 4;
    entry.overlays.forEach((ov) => {
      const arrow = ov.getElement().querySelector(".annotation-arrow");
      if (arrow) arrow.className = `annotation-arrow arrow-${entry.direction}`;
    });
  };

  // optional: call on unmount
  cleanup = () => {
    this.annotations.forEach((entry) => {
      entry.overlays.forEach((ov) => {
        if (ov._cleanup) ov._cleanup();
        const m = ov.getMap();
        if (m) m.removeOverlay(ov);
      });
    });
    this.annotations.clear();
  };
}
