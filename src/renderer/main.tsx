import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "@/lib/auth-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./index.css";

// Cobre erro assíncrono fora do ciclo de render do React (que o
// ErrorBoundary não pega) — mesmo objetivo, deixar rastro no log do
// processo main em vez de falhar silenciosamente.
window.addEventListener("error", (event) => {
  window.zenith.log.reportError({ message: event.message, stack: event.error?.stack }).catch(() => {});
});
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  window.zenith.log
    .reportError({
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    })
    .catch(() => {});
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
