import React from "react";
import { createRoot } from "react-dom/client";
import OceanNavigator from "./components/OceanNavigator.jsx";
import {
  faDrawPolygon,
  faTable,
  faChartLine,
  faDiagramProject,
  faTableList,
  faGear,
  faKeyboard,
  faSatelliteDish,
  faChevronLeft,
  faChevronRight,
  faInfo
} from "@fortawesome/free-solid-svg-icons";
import { library } from "@fortawesome/fontawesome-svg-core";

library.add(
  faDrawPolygon,
  faTable,
  faChartLine,
  faDiagramProject,
  faTableList,
  faGear,
  faKeyboard,
  faSatelliteDish,
  faChevronLeft,
  faChevronRight,
  faInfo
);
// import WebFont from "webfontloader";
// import Browser from "detect-browser";
// import ReactGA from "react-ga";

import "./i18n";

require("bootstrap/dist/css/bootstrap.css");
require("./stylesheets/utils/bootstrap.css");
require("./stylesheets/main.scss");

// if (process.env.NODE_ENV == "production") {
//   ReactGA.initialize("UA-122671965-2");
// }
// else {
//   ReactGA.initialize("UA-122671965-3");
// }

// ReactGA.pageview(window.location.pathname + window.location.search);

document.title = "Ocean Navigator";

const root = createRoot(document.getElementById("app"));
root.render(<OceanNavigator />);

// WebFont.load({
//   custom: {
//     families: ["FontAwesome"],
//   }
// });

// $(function() {
//   $("html").addClass(Browser.name);
// });
