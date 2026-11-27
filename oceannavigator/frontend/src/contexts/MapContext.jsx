import { createContext, useState } from "react";

import { MAP_DEFAULTS } from "../components/Defaults.js";

export const MapContext = createContext();

export function MapProvider({ children }) {
  const [map0, setMap0] = useState();
  const [map1, setMap1] = useState();
  const [mapSettings, setMapSettings] = useState({
    projection: "EPSG:3857",
    basemap: "topo",
    extent: [],
    hideDataLayer: false,
    ...MAP_DEFAULTS,
  });

  return (
    <MapContext.Provider
      value={{ map0, setMap0, map1, setMap1, mapSettings, setMapSettings }}
    >
      {children}
    </MapContext.Provider>
  );
}
