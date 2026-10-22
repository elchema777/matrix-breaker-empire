import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline support: register the service worker that lives next to this page (/tobacco/sw.js).
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}tobacco/sw.js`, { scope: `${import.meta.env.BASE_URL}tobacco/` })
      .catch(e => console.error("[tobacco] service worker registration failed", e));
  });
}
