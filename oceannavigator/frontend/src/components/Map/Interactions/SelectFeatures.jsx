import { useEffect, useRef } from "react";
import { Style, Circle, Stroke, Fill } from "ol/style";
import Select from "ol/interaction/Select.js";

import { featureTextStyle } from "../styles";

export function SelectFeatures({ map, projection }) {
  const selectRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    if (!selectRef.current) {
      selectRef.current = new Select({
        style: function (feat, res) {
          const styles = [
            new Style({
              stroke: new Stroke({ color: "#0099ff", width: 4 }),
              image: new Circle({
                radius: 4,
                fill: new Fill({ color: "#0099ff" }),
                stroke: new Stroke({ color: "#ffffff", width: 1 }),
              }),
            }),
          ];
          const textStyle = featureTextStyle(
            feat,
            "#000",
            "#ffffff",
            projection,
          );
          if (textStyle && feat.get("type") !== "class4")
            styles.push(textStyle);

          return styles;
        },
      });
    }

    const select = selectRef.current;
    select.set("id", "select-features");

    const hasSelect = map.getInteractions().getArray().includes(select);
    if (!hasSelect) map.addInteraction(select);

    return () => {
      map.removeInteraction(select);
    };
  }, [map, projection]);

  return null;
}
