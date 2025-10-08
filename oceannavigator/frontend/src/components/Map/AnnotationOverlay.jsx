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
      id: `annotation_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      element,
      position,
      positioning: "bottom-center",
      offset: [0, -10],
    });

    this.text = text;
    this.linkedOverlay = linkedOverlay;
    this.arrowDirection = 0;
    
    // Cache DOM elements
    this.box = element.querySelector(".annotation-box");
    this.arrow = element.querySelector(".annotation-arrow");
    this.closeBtn = element.querySelector(".annotation-close");
    
    // Single event listener 
    this.handleEvents = this.handleEvents.bind(this);
    element.addEventListener("mousedown", this.handleEvents);
    element.addEventListener("click", this.handleEvents);
  }

  handleEvents(e) {
    const { type, target, clientX, clientY } = e;
    
    if (target === this.closeBtn) {
      if (type === "click") this.delete();
      return;
    }

    if (type === "click" && !this.isDragging) {
      this.rotateArrow();
    } else if (type === "mousedown") {
      this.startDrag(e);
    }
  }

  rotateArrow() {
    this.arrowDirection = (this.arrowDirection + 1) % 4;
    this.updateArrow(this.arrow, this.arrowDirection);
    
    if (this.linkedOverlay?.getElement) {
      this.linkedOverlay.arrowDirection = this.arrowDirection;
      this.updateArrow(
        this.linkedOverlay.getElement().querySelector(".annotation-arrow"),
        this.arrowDirection
      );
    }
  }

  updateArrow(arrow, direction) {
    if (arrow) arrow.className = `annotation-arrow arrow-${direction}`;
  }

  startDrag({ clientX, clientY }) {
    let start = [clientX, clientY];
    this.isDragging = false;
    this.getElement().style.cursor = "move";

    const handleMove = (e) => {
      const [dx, dy] = [e.clientX - start[0], e.clientY - start[1]];
      
      if (!this.isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        this.isDragging = true;
      }
      
      if (this.isDragging) {
        const map = this.getMap();
        const pixel = map.getPixelFromCoordinate(this.getPosition());
        const newPos = map.getCoordinateFromPixel([pixel[0] + dx, pixel[1] + dy]);
        
        this.setPosition(newPos);
        this.linkedOverlay?.setPosition(newPos);
      }
      
      start = [e.clientX, e.clientY];
    };

    const handleUp = () => {
      this.getElement().style.cursor = "";
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      setTimeout(() => this.isDragging = false, 10);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  }

  linkOverlay(map) {
    this.linkedOverlay = new AnnotationOverlay(this.text, this.getPosition(), this);
    this.linkedOverlay.arrowDirection = this.arrowDirection;
    this.updateArrow(
      this.linkedOverlay.getElement().querySelector(".annotation-arrow"),
      this.arrowDirection
    );
    map.addOverlay(this.linkedOverlay);
  }

  unlinkOverlay() {
    if (this.linkedOverlay) {
      this.linkedOverlay.getMap()?.removeOverlay(this.linkedOverlay);
      this.linkedOverlay = null;
    }
  }

  delete() {
    const map = this.getMap();
    if (map) {
      map.removeOverlay(this);
    }
    if (this.linkedOverlay) {
      this.linkedOverlay.getMap()?.removeOverlay(this.linkedOverlay);
    }
    
    this.cleanup();
  }

  cleanup() {
    this.getElement().removeEventListener("mousedown", this.handleEvents);
    this.getElement().removeEventListener("click", this.handleEvents);
    this.getElement().remove();
  }
}