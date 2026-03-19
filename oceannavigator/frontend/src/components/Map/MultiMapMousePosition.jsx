import EventType from "ol/pointer/EventType.js";
import { listen } from "ol/events.js";
import MousePosition from "ol/control/MousePosition.js";
import MapEventType from "ol/MapEventType.js";

class MultiMapMousePosition extends MousePosition {
  constructor() {
    super({
      projection: "EPSG:4326",
      coordinateFormat: function (c) {
        return "<div>" + c[1].toFixed(4) + ", " + c[0].toFixed(4) + "</div>";
      },
    });

    this.map0;
    this.map1;
  }

  handleMouseMove(event) {
    const px = this.map1?.getEventPixel(event);
    this.updateHTML_(px && px[0] >= 0 ? px : this.map0.getEventPixel(event));
  }

  setMap(map) {
    if (map) {
      this.map0 = map;
      this.map1 = null;
      super.setMap(map);
    }
  }

  setMap1(map) {
    this.map1 = map;
    const viewport = map.getViewport();

    this.listenerKeys.push(
      listen(viewport, EventType.POINTERMOVE, this.handleMouseMove, this)
    );
    this.listenerKeys.push(
      listen(map, MapEventType.POSTRENDER, this.render, this)
    );
    const target = this.target_ ?? map.getOverlayContainerStopEvent();
    if (this.element) {
      target.appendChild(this.element);
    }
  }
}

export default MultiMapMousePosition;
