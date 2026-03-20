import React from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import OceanNavigator from "./components/OceanNavigator.jsx";
import ReactGA from "react-ga";

import "./i18n";

require("bootstrap/dist/css/bootstrap.css");
require("./stylesheets/utils/bootstrap.css");
require("./stylesheets/main.scss");

if (process.env.NODE_ENV == "production") {
  ReactGA.initialize("UA-122671965-2");
} else {
  ReactGA.initialize("UA-122671965-3");
}

ReactGA.pageview(window.location.pathname + window.location.search);

const SENTRY_ENV = process.env.ONAV_SENTRY_ENV;
const SENTRY_DSN = process.env.ONAV_SENTRY_JS_DSN;
const SENTRY_TRACES_RATE = process.env.ONAV_SENTRY_TRACES_RATE;

Sentry.init({
  dsn: SENTRY_DSN,
  tracesSampleRate: SENTRY_TRACES_RATE,
  environment: SENTRY_ENV,
});

const queryClient = new QueryClient();

document.title = "Ocean Navigator";
const root = createRoot(document.getElementById("app"));
root.render(
  <QueryClientProvider client={queryClient}>
    <OceanNavigator />
  </QueryClientProvider>,
);
