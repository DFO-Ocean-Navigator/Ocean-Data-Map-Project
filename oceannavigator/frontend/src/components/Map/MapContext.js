import { createContext, useContext } from "react";

export const MapContext0 = createContext();
export const MapContext1 = createContext();

export const useMap0 = () => {
  const map0 = useContext(MapContext0);
  return map0;
};

export const useMap1 = () => {
  const map1 = useContext(MapContext1);
  return map1;
};
