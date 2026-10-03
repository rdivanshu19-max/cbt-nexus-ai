import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";

// Remove any leftover ad-network service workers / caches (Adsterra, Monetag popunders)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations?.().then((regs) => {
    regs.forEach((r) => r.unregister());
  }).catch(() => {});
}
if (typeof caches !== "undefined") {
  caches.keys?.().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
}

// Apply stored UI intensity ASAP to avoid flash
const stored = localStorage.getItem("cbt-ui-intensity");
if (stored && stored !== "full") {
  document.documentElement.setAttribute("data-ui-intensity", stored);
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="cbt-nexus-theme-v2">
    <App />
  </ThemeProvider>,
);
