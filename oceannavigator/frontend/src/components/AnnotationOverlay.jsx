import Overlay from "ol/Overlay.js";

export class AnnotationOverlayManager {
  constructor(primaryMap, onUpdateAnnotation = null) {
    this.maps = [primaryMap];
    this.onUpdateAnnotation = onUpdateAnnotation;
  }

  setSecondaryMap = (map) => {
    this.maps = [this.maps[0], map].filter(Boolean);
  };

  createAnnotationOverlays = (annotationData) => {
    return this.maps.map(() => this._createOverlay(annotationData));
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

        if (this.onUpdateAnnotation) {
          this.onUpdateAnnotation(id, { position: newPos });
        }
      }
    };

    const up = (e) => {
      if (!dragging) return;
      dragging = false;
      el.style.cursor = "";
      if (!hasMoved && e.target.className !== "annotation-close") {
        if (this.onUpdateAnnotation) {
          this.onUpdateAnnotation(id, { _rotate: true });
        }
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