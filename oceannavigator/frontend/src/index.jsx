import React from "react";
import { createRoot } from "react-dom/client";
import OceanNavigator from "./components/OceanNavigator.jsx";

import "./i18n";

require("bootstrap/dist/css/bootstrap.css");
require("./stylesheets/utils/bootstrap.css");
require("./stylesheets/main.scss");

document.title = "Ocean Navigator";

const root = createRoot(document.getElementById("app"));
root.render(<OceanNavigator />);
