import { useContext, useEffect, useRef } from "react";
import Draw from "ol/interaction/Draw";

import { MapToolsContext } from "../../../contexts/MapContext";

export function DrawFeatures({ map, source }) {
  const { drawActive, drawFeatureType } = useContext(MapToolsContext);
  const drawRef = useRef();

  useEffect(() => {
    if (!map) return;

    drawRef.current = new Draw({
      source: source,
      type: drawFeatureType,
      stopClick: true,
      wrapX: true,
      active: false,
    });

    drawRef.current.on("drawend", function (e) {
      e.feature.setId("id" + Math.random().toString(16).slice(2));
      e.feature.setProperties({ type: drawFeatureType });
    });

    const hasDraw = map.getInteractions().getArray().includes(drawRef.current);
    if (!hasDraw) map.addInteraction(drawRef.current);

    return () => {
      map.removeInteraction(drawRef.current);
    };
  }, [map, source, drawFeatureType]);

  useEffect(() => {
    const draw = drawRef.current;
    if (!draw) return;

    draw.setActive(drawActive);
  }, [drawRef.current, drawActive]);

  return null;
}
