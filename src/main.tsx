import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";

// Apply stored UI intensity ASAP to avoid flash
const stored = localStorage.getItem("cbt-ui-intensity");
if (stored && stored !== "full") {
  document.documentElement.setAttribute("data-ui-intensity", stored);
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="cbt-nexus-theme">
    <App />
  </ThemeProvider>,
);
