import Overlay from "ol/Overlay.js";

export class AnnotationOverlayManager {
  constructor(primaryMap, secondaryMap = null) {
    this.maps = [primaryMap, secondaryMap].filter(Boolean);
    this.annotations = new Map();
    this.nextId = 1;
  }

  setSecondaryMap = (map) => {
    this.maps = [this.maps[0], map].filter(Boolean);
    this.annotations.forEach(({ overlays, ...data }) => {
      if (map && overlays.length === 1) {
        overlays.push(this._createOverlay(data));
        map.addOverlay(overlays[1]);
      } else if (!map && overlays[1]) {
        this.maps[0].removeOverlay(overlays[1]);
        overlays[1].getElement().remove();
        overlays.pop();
      }
    });
  };

  addAnnotationLabel = (text, coord) => {
    const id = this.nextId++;
    const data = { id, text, position: coord, direction: 0 };
    const overlays = this.maps.map(() => this._createOverlay(data));

    overlays.forEach((overlay, i) => this.maps[i]?.addOverlay(overlay));
    this.annotations.set(id, { ...data, overlays });
    return data;
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
      element: el,
      position,
      positioning: "bottom-center",
      offset: [0, -10],
    });

    el.querySelector(".annotation-close").addEventListener("click", () => {
      this.removeAnnotationById(id);
    });

    this._addDrag(el, overlay, id);
    return overlay;
  };

  _rotateArrow = (id) => {
    const annotation = this.annotations.get(id);
    if (!annotation) return;

    annotation.direction = (annotation.direction + 1) % 4;
    annotation.overlays.forEach((overlay) => {
      const arrow = overlay.getElement().querySelector(".annotation-arrow");
      arrow.className = `annotation-arrow arrow-${annotation.direction}`;
    });
  };

  _addDrag = (el, overlay, id) => {
    let dragging = false,
      start,
      hasMoved = false;

    el.onmousedown = (e) => {
      if (e.target.className === "annotation-close") return;
      dragging = true;
      hasMoved = false;
      start = [e.clientX, e.clientY];
      el.style.cursor = "move";
      e.stopPropagation();
    };

    const move = (e) => {
      if (!dragging) return;
      const [dx, dy] = [e.clientX - start[0], e.clientY - start[1]];
      // if mouse moved more than 3 pixels (indicates drag, not click)
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMoved = true;
      }
      start = [e.clientX, e.clientY];

      const pos = overlay.getPosition();
      const map = this.maps.find((m) =>
        m.getOverlays().getArray().includes(overlay)
      );
      const pixel = map.getPixelFromCoordinate(pos);
      const newPos = map.getCoordinateFromPixel([pixel[0] + dx, pixel[1] + dy]);

      this._sync(id, newPos);
    };

    const up = (e) => {
      if (!dragging) return;
      dragging = false;
      el.style.cursor = "";
      if (!hasMoved && e.target.className !== "annotation-close") {
        this._rotateArrow(id);
      }
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    overlay._cleanup = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      el.remove();
    };
  };

  _sync = (id, position) => {
    const annotation = this.annotations.get(id);
    if (!annotation) return;
    annotation.position = position;
    annotation.overlays.forEach((overlay) => overlay.setPosition(position));
  };

  removeAnnotationById = (id) => {
    const annotation = this.annotations.get(id);
    if (!annotation) return;

    annotation.overlays.forEach((overlay, i) => {
      this.maps[i]?.removeOverlay(overlay);
      overlay._cleanup();
    });
    this.annotations.delete(id);
  };

  undoLastAnnotation = () => {
    const lastId = Math.max(...this.annotations.keys());
    this.removeAnnotationById(lastId);
  };

  clearAllAnnotations = () => {
    [...this.annotations.keys()].forEach((id) => this.removeAnnotationById(id));
  };

  getAnnotations = () =>
    [...this.annotations.values()].map(({ overlays, ...data }) => data);

  cleanup = () => this.clearAllAnnotations();
}
