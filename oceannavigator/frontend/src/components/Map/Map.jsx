import {
  forwardRef,
  useContext,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
} from "react";
import { Map as OlMap } from "ol";
import { defaults as defaultControls } from "ol/control/defaults.js";
import DoubleClickZoom from "ol/interaction/DoubleClickZoom.js";
import Graticule from "ol/layer/Graticule.js";
import { Stroke } from "ol/style";
import DragBox from "ol/interaction/DragBox.js";
import { platformModifierKeyOnly } from "ol/events/condition";

import { MapContext } from "../../contexts/MapContext";

import "ol/ol.css";

const Map = forwardRef(
  (
    {
      mapId,
      view,
      controls = [],
      compareDatasets = false,
      children,
    },
    ref,
  ) => {
    const { map0, setMap0, map1, setMap1 } = useContext(MapContext);
    const mapRef = useRef(null);

    const map = mapId == 0 ? map0 : map1;
    const setMap = mapId == 0 ? setMap0 : setMap1;

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

      for (let control of controls) {
        olMap.addControl(control);
      }

      olMap.setView(view);

      setMap(olMap);

      return () => {
        olMap.setTarget(undefined);

        setMap(undefined);
      };
    }, [mapRef, mapId]);

    useEffect(() => {
      if (map) map.setView(view);
    }, [map, mapId, view]);

    return (
      <div ref={mapRef} className={compareDatasets ? "map compare" : "map"}>
        {children}
      </div>
    );
  },
);

export default Map;
