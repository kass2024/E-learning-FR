import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { applyBrandIcons } from "./lib/applyBrandIcons";
import { ensureFreshAppShell, startAppBuildWatcher } from "./lib/appBuildVersion";
import "./index.css";

ensureFreshAppShell();
startAppBuildWatcher();
applyBrandIcons();

createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
