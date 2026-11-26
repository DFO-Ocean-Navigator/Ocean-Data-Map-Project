import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
  createContext,
  useContext,
} from "react";
import { Map as OlMap } from "ol";
import { defaults as defaultControls } from "ol/control/defaults.js";
import DoubleClickZoom from "ol/interaction/DoubleClickZoom.js";
import Graticule from "ol/layer/Graticule.js";
import { Stroke } from "ol/style";
import DragBox from "ol/interaction/DragBox.js";
import { platformModifierKeyOnly } from "ol/events/condition";

import "ol/ol.css";
// import "./Map.css";

// const MapContext = createContext(undefined);

// export const useMap = () => {
//   const map = useContext(MapContext);
//   return map;
// };

const Map = forwardRef((props, ref) => {
  const [map, setMap] = useState();
  const mapRef = useRef(null);

  useImperativeHandle(ref, () => map, [map]);

  useEffect(() => {
    if (!mapRef.current) return;
    // Always create a new map instance on mount
    const mapConfig = {
      target: mapRef.current,
      controls: defaultControls({
        rotate: false,
        zoom: true,
      }).extend([
        new Graticule({
          strokeStyle: new Stroke({
            color: "rgba(128, 128, 128, 0.9)",
            lineDash: [0.5, 4],
          }),
        }),
      ]),
    };
    const olMap = new OlMap(mapConfig);

    olMap.getInteractions().forEach((interaction) => {
      if (interaction instanceof DoubleClickZoom) {
        interaction.setActive(false);
      }
    });

    olMap.on("pointermove", function (e) {
      var pixel = olMap.getEventPixel(e.originalEvent);
      var hit = olMap.hasFeatureAtPixel(pixel);
      olMap.getViewport().style.cursor = hit ? "pointer" : "";
    });

    const dragBox = new DragBox({
      condition: platformModifierKeyOnly,
    });
    olMap.addInteraction(dragBox);

    setMap(olMap);
    return () => {
      olMap.setTarget(undefined);
      setMap(undefined);
      console.log("Map unmounted");
    };
  }, [mapRef]);

  useEffect(() => {
    if (map) {
      map.setView(props.view);
    }
  }, [map, props.view]);

  return (
    <props.context.Provider value={map}>
      <div
        ref={mapRef}
        className={props.compareDatasets ? "map compare" : "map"}
      >
        {props.children}
      </div>
    </props.context.Provider>
  );
});

export default Map;
