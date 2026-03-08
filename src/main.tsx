import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./i18n";
import App from "./App.tsx";
import "./index.css";
import { reportWebVitals } from "./lib/web-vitals";

// Register service worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        // SW registration failed - app still works without it
      });
  });
}

console.log('[main] Mounting app...');
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Report Core Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1)
reportWebVitals();
