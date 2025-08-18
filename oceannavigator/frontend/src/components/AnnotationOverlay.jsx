import Overlay from "ol/Overlay.js";

export class AnnotationOverlayManager {
  constructor(primaryMap, onUpdateAnnotation = null) {
    this.maps = [primaryMap].filter(Boolean);
    this.annotations = new Map();
  }

  setSecondaryMap = (map) => {
    this.maps = [this.maps[0], map].filter(Boolean);
  };

  createAnnotationOverlays = (annotationData) => {
    // return this.maps.map(() => this._createOverlay(annotationData));
    const { id, direction = 0 } = annotationData;
 
    // Get or create the registry entry
    let entry = this.annotations.get(id);
    if (!entry) {
      entry = { id, direction, overlays: [] };
      this.annotations.set(id, entry);
    }
 
    // Always use the entry’s current direction so both maps stay in sync
    const overlays = this.maps.map(() =>
      this._createOverlay({ ...annotationData, direction: entry.direction })
    );
 
    // Track these overlays for future rotations/cleanup
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
    });

    el.querySelector(".annotation-close").addEventListener("click", () => {
            let map = overlay.getMap();
            map.removeOverlay(overlay);
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

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMoved = true;
      }
      start = [e.clientX, e.clientY];

      const pos = overlay.getPosition();
      const map = this.maps.find((m) =>
        m.getOverlays().getArray().includes(overlay)
      );
      if (map) {
        const pixel = map.getPixelFromCoordinate(pos);
        const newPos = map.getCoordinateFromPixel([pixel[0] + dx, pixel[1] + dy]);
        overlay.setPosition(newPos);
      }
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
}