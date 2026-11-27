import { createContext, useMemo, useState } from "react";

import { MAP_DEFAULTS } from "../components/Defaults.js";

export const MapInstancesContext = createContext(null);
export const MapSettingsContext = createContext(null);
export const MapToolsContext = createContext(null);

export function MapProvider({ children }) {
  const [map0, setMap0] = useState();
  const [map1, setMap1] = useState();

  const [mapSettings, setMapSettings] = useState({
    projection: "EPSG:3857",
    basemap: "topo",
    extent: [],
    ...MAP_DEFAULTS,
  });

  const [drawActive, setDrawActive] = useState(false);
  const [drawFeatureType, setDrawFeatureType] = useState("Point");

  const instancesValue = useMemo(
    () => ({ map0, setMap0, map1, setMap1 }),
    [map0, map1],
  );

  const settingsValue = useMemo(
    () => ({ mapSettings, setMapSettings }),
    [mapSettings],
  );

  const toolsValue = useMemo(
    () => ({
      drawActive,
      setDrawActive,
      drawFeatureType,
      setDrawFeatureType,
    }),
    [drawActive, drawFeatureType],
  );

  return (
    <MapInstancesContext.Provider value={instancesValue}>
      <MapSettingsContext.Provider value={settingsValue}>
        <MapToolsContext.Provider value={toolsValue}>
          {children}
        </MapToolsContext.Provider>
      </MapSettingsContext.Provider>
    </MapInstancesContext.Provider>
  );
}
