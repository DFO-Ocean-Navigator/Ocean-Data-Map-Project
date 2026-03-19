import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import OceanNavigator from "./components/OceanNavigator.jsx";
import LandingPage from "./components/LandingPage.jsx";
import ReactGA from "react-ga";

import "./i18n";

import "bootstrap/dist/css/bootstrap.css";
import "./stylesheets/utils/bootstrap.css";
import "./stylesheets/main.scss";

if (process.env.NODE_ENV == "production") {
  ReactGA.initialize("UA-122671965-2");
} else {
  ReactGA.initialize("UA-122671965-3");
}

ReactGA.pageview(window.location.pathname + window.location.search);

document.title = "Ocean Navigator";

const queryClient = new QueryClient();

function App() {
  const [showApp, setShowApp] = useState(false);

  useEffect(() => {
    document.body.style.overflow = showApp ? "hidden" : "auto";
  }, [showApp]);

  if (!showApp) {
    return <LandingPage onEnter={() => setShowApp(true)} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <OceanNavigator />
    </QueryClientProvider>
  );
}

const root = createRoot(document.getElementById("app"));
root.render(<App />);
