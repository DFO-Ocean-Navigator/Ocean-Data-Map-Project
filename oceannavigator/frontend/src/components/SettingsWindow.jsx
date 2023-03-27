import React, { useState } from "react";
import { Card } from "react-bootstrap";

import ComboBox from "./ComboBox.jsx";
// import Options from "./Options.jsx";

function SettingsWindow(props) {
  return (
    <>
      <Card>
        <Card.Header>{"Map"}</Card.Header>
        <Card.Body>
          {/* <ComboBox //Projection Drop Down - Hardcoded
            id="projection"
            state={props.projection}
            onUpdate={props.changeHandler}
            data={[
              { id: "EPSG:3857", value: "Global" },
              { id: "EPSG:32661", value: "Arctic" },
              { id: "EPSG:3031", value: "Antarctic" },
            ]}
            title={"Projection"}
          />
          <ComboBox //Basemap Drop Down - Hardcoded
            id="basemap"
            state={props.basemap}
            onUpdate={props.changeHandler}
            data={[
              {
                id: "topo",
                value: "ETOPO1 Topography",
                attribution:
                  "Topographical Data from ETOPO1 1 Arc-Minute Global Relief Model. NCEI, NESDIR, NOAA, U.S. Department of Commerce.",
              },
              {
                id: "ocean",
                value: "Esri Ocean Basemap",
                attribution:
                  "Tiles &copy; Esri &mdash; Sources: GEBCO, NOAA, CHS, OSU, UNH, CSUMB, National Geographic, DeLorme, NAVTEQ, and Esri.",
              },
              {
                id: "world",
                value: "Esri World Imagery",
                attribution:
                  "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community.",
              },
              {
                id: "chs",
                value: "Maritime Chart Service",
                attribution: "Government of Canada",
              },
            ]}
            title={"Basemap"}
          /> */}
        </Card.Body>
      </Card>

      {/* <Options
        options={props.mapSettings}
        updateOptions={props.mapSettings}
      /> */}
    </>
  );
}

export default SettingsWindow;
