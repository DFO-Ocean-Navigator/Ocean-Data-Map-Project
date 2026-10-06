import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { LineString } from "ol/geom";
import { toLonLat } from "ol/proj";

import { useGetPointDepth, useGetPointData } from "../../remote/queries.js";

import Overlay from "ol/Overlay";

export default function HoverPopup({
  map,
  coordinates,
  dataset,
  popupElement,
  overlayId,
}) {
  const [featureTable, setFeatureTable] = useState(null);

  useEffect(() => {
    let overlay = new Overlay({
      id: overlayId,
      element: popupElement.current,
      autoPan: false,
      offset: [0, -10],
      positioning: "bottom-center",
    });

    overlay.setPosition(coordinates);

    map.addOverlay(overlay);

    return () => {
      if (map & overlay) {
        map.removeOverlay(overlay);
      }
    };
  }, []);

  const [longitude, latitude] = toLonLat(
    coordinates.slice(),
    map.getView().getProjection(),
  );

  const pointDepth = useGetPointDepth(latitude, longitude);
  const pointData = useGetPointData(
    dataset.id,
    dataset.variable.id,
    dataset.time.id,
    dataset.depth,
    latitude,
    longitude,
  );

  const pixel = map.getPixelFromCoordinate(coordinates);

  const features = map.getFeaturesAtPixel(pixel);

  if (!featureTable && features.length > 0) {
    const feature = features[0];
    if (feature.get("name") && feature.get("class") != "observation") {
      if (feature.get("data")) {
        let bearing = feature.get("bearing");
        setFeatureTable(
          <table>
            <tbody>
              <tr>
                <td>Variable</td>
                <td>{feature.get("name")}</td>
              </tr>
              <tr>
                <td>Data</td>
                <td>{feature.get("data")}</td>
              </tr>
              <tr>
                <td>Units</td>
                <td>{feature.get("units")}</td>
              </tr>
              {bearing && (
                <tr>
                  <td>Bearing (+ve deg clockwise N)</td>
                  <td>{bearing}</td>
                </tr>
              )}
            </tbody><hr/>
         </table>,
        );
      } else {
        setFeatureTable(
          <table>
            <tr>
              <td>Feature ID</td>
              <td>{feature.get("name")}</td>
            </tr>
          </table>,
        );
      }
    }
    if (feature.get("class") == "observation") {
      if (feature.get("meta")) {
        setFeatureTable(feature.get("meta"));
      } else {
        let type = "station";
        if (feature.getGeometry() instanceof LineString) {
          type = "platform";
        }
        axios
          .get(`/api/v2.0/observation/meta/${type}/${feature.get("id")}.json`)
          .then(function (response) {
            setFeatureTable(
              <table>
                {Object.keys(response.data).map((key) => (
                  <tr key={key}>
                    <td>{key}</td>
                    <td>{response.data[key]}</td>
                  </tr>
                ))}<hr/>
              </table>,
            );
          })
          .catch((e) => {
            console.error(e);
          });
      }
    }
  }

  return (
    <>
    {featureTable}
      <table>
        <tbody>
          <tr>
            <td>Bathymetry</td>
            <td>
              {Number.isFinite(pointDepth.data)
                ? `${pointDepth.data.toFixed(1)} m`
                : "N/A"}
            </td>
          </tr>
          <tr>
            <td>{dataset.variable.value}</td>
            <td>
              {Number.isFinite(pointData.data)
                ? `${pointData.data.toFixed(2)} ${dataset.variable.units}`
                : "N/A"}
            </td>
          </tr>
        </tbody>
      </table>
      
    </>
  );
}
