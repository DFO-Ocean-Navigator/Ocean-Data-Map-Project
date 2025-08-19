import Overlay from "ol/Overlay.js";

export class AnnotationOverlay extends Overlay {
  constructor(text, position, linkedOverlay) {
    const element = document.createElement("div");
    element.innerHTML = `
      <div class="annotation-box">
        <button class="annotation-close">×</button>
        <div class="annotation-text">${text}</div>
      </div>
    `;

    element.querySelector(".annotation-close").addEventListener("click", () => {
      this.delete();
    });

    super({
      id: `annotation_${Date.now() + Math.random()}`,
      element: element,
      position: position,
      positioning: "bottom-center",
      offset: [0, -10],
    });

    this.addDrag = this.addDrag.bind(this);
    this.linkOverlay = this.linkOverlay.bind(this);
    this.unlinkOverlay = this.unlinkOverlay.bind(this);
    this.delete = this.delete.bind(this);
    this.cleanup = this.cleanup.bind(this);

    this.addDrag(element);
    this.text = text
    this.linkedOverlay = linkedOverlay;
  }

  addDrag(element) {
    let dragging = false,
      start,
      hasMoved = false;

    element.onmousedown = (e) => {
      if (e.target.className === "annotation-close") return;
      dragging = true;
      hasMoved = false;
      start = [e.clientX, e.clientY];
      element.style.cursor = "move";
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

      const pos = this.getPosition();
      const map = this.getMap();
      const pixel = map.getPixelFromCoordinate(pos);
      const newPos = map.getCoordinateFromPixel([pixel[0] + dx, pixel[1] + dy]);
      this.setPosition(newPos);
      if (this.linkedOverlay) {
        this.linkedOverlay.setPosition(newPos)
      }
    };

    const up = (e) => {
      if (!dragging) return;
      dragging = false;
      element.style.cursor = "";
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  linkOverlay(map) {
    this.linkedOverlay = new AnnotationOverlay(this.text, this.getPosition(), this)
    map.addOverlay(this.linkedOverlay)
  }

  unlinkOverlay() {
    this.linkedOverlay = null;
  }

  delete(){
    this.getMap().removeOverlay(this)
    if (this.linkedOverlay) {
      this.linkedOverlay.getMap().removeOverlay(this.linkedOverlay)
    }
  }

  cleanup() {
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", up);
    this.getElement().remove();
  }
}
