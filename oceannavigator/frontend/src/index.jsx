import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import OceanNavigator from "./components/OceanNavigator.jsx";
import ReactGA from "react-ga";
import * as Sentry from "@sentry/react";

import "./i18n";

import "bootstrap/dist/css/bootstrap.css";
import "./stylesheets/utils/bootstrap.css";
import "./stylesheets/main.scss";

if (import.meta.env.NODE_ENV == "production") {
  ReactGA.initialize("UA-122671965-2");
} else {
  ReactGA.initialize("UA-122671965-3");
}

if (import.meta.env.ONAV_SENTRY_JS_DSN) {
  Sentry.init({
    dsn: import.meta.env.ONAV_SENTRY_JS_DSN,
    environment: import.meta.env.ONAV_SENTRY_ENV || "dev",
    tracesSampleRate: parseFloat(import.meta.env.ONAV_SENTRY_TRACES_RATE) || 0,
  });
}

ReactGA.pageview(window.location.pathname + window.location.search);

const SENTRY_ENV = import.meta.env.ONAV_SENTRY_ENV;
const SENTRY_DSN = import.meta.env.ONAV_SENTRY_JS_DSN;
const SENTRY_TRACES_RATE = import.meta.env.ONAV_SENTRY_TRACES_RATE;

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
