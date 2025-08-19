import Overlay from "ol/Overlay.js";

export class AnnotationOverlay extends Overlay {
  constructor(text, position, linkedOverlay = null) {
    const element = document.createElement("div");
    element.className = "annotation-container";
    element.innerHTML = `
      <div class="annotation-box">
        <button class="annotation-close">×</button>
        <div class="annotation-text">${text}</div>
        <div class="annotation-arrow arrow-0"></div>
      </div>
    `;

    super({
      id: `annotation_${Date.now() + Math.random()}`,
      element: element,
      position: position,
      positioning: "bottom-center",
      offset: [0, -10],
    });

    this.text = text;
    this.linkedOverlay = linkedOverlay;
    this.isDragging = false;
    this.arrowDirection = 0;

    const annotationBox = element.querySelector(".annotation-box");
    const arrow = element.querySelector(".annotation-arrow");

    annotationBox.addEventListener("click", (e) => {
      if (e.target.className === "annotation-close") return;
      if (this.isDragging) return;

      this.arrowDirection = (this.arrowDirection + 1) % 4;
      arrow.className = `annotation-arrow arrow-${this.arrowDirection}`;

      if (this.linkedOverlay && this.linkedOverlay.getElement) {
        this.linkedOverlay.arrowDirection = this.arrowDirection;
        const linkedArrow = this.linkedOverlay
          .getElement()
          .querySelector(".annotation-arrow");
        if (linkedArrow) {
          linkedArrow.className = `annotation-arrow arrow-${this.arrowDirection}`;
        }
      }
    });

    element.querySelector(".annotation-close").addEventListener("click", () => {
      this.delete();
    });

    this.addDrag = this.addDrag.bind(this);
    this.linkOverlay = this.linkOverlay.bind(this);
    this.unlinkOverlay = this.unlinkOverlay.bind(this);
    this.delete = this.delete.bind(this);
    this.cleanup = this.cleanup.bind(this);

    this.addDrag(element);
  }

  addDrag(element) {
    let dragging = false,
      start,
      hasMoved = false;

    element.onmousedown = (e) => {
      if (e.target.className === "annotation-close") return;
      dragging = true;
      hasMoved = false;
      this.isDragging = false;
      start = [e.clientX, e.clientY];
      element.style.cursor = "move";
      e.stopPropagation();
    };

    const move = (e) => {
      if (!dragging) return;
      const [dx, dy] = [e.clientX - start[0], e.clientY - start[1]];
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMoved = true;
        this.isDragging = true;
      }
      start = [e.clientX, e.clientY];

      const pos = this.getPosition();
      const map = this.getMap();
      const pixel = map.getPixelFromCoordinate(pos);
      const newPos = map.getCoordinateFromPixel([pixel[0] + dx, pixel[1] + dy]);
      this.setPosition(newPos);
      if (this.linkedOverlay) {
        this.linkedOverlay.setPosition(newPos);
      }
    };

    const up = (e) => {
      if (!dragging) return;
      dragging = false;
      element.style.cursor = "";

      setTimeout(() => {
        this.isDragging = false;
      }, 10);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  linkOverlay(map) {
    this.linkedOverlay = new AnnotationOverlay(
      this.text,
      this.getPosition(),
      this
    );

    if (this.linkedOverlay) {
      this.linkedOverlay.arrowDirection = this.arrowDirection;
      const linkedArrow = this.linkedOverlay
        .getElement()
        .querySelector(".annotation-arrow");
      if (linkedArrow) {
        linkedArrow.className = `annotation-arrow arrow-${this.arrowDirection}`;
      }
    }

    map.addOverlay(this.linkedOverlay);
  }

  unlinkOverlay() {
    if (this.linkedOverlay) {
      this.linkedOverlay.getMap().removeOverlay(this.linkedOverlay);
      this.linkedOverlay = null;
    }
  }

  delete() {
    const map = this.getMap();
    if (map) {
      map.removeOverlay(this);

      if (window.annotationOverlays) {
        const index = window.annotationOverlays.indexOf(this);
        if (index > -1) {
          window.annotationOverlays.splice(index, 1);
        }
      }
    }

    if (this.linkedOverlay) {
      const linkedMap = this.linkedOverlay.getMap();
      if (linkedMap) {
        linkedMap.removeOverlay(this.linkedOverlay);
      }
    }
  }

  cleanup() {
    window.removeEventListener("mousemove", this.move);
    window.removeEventListener("mouseup", this.up);
    this.getElement().remove();
  }
}
