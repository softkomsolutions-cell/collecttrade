import { Component, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error("Build Alpha render failure", error, errorInfo);
    }
  }

  render() {
    if (this.state.error) {
      return (
        <main className="appErrorBoundary" role="alert">
          <div className="brandMark">BA</div>
          <h1>Build Alpha needs a reload.</h1>
          <p>
            The app hit an unexpected interface error. Reloading will restore the latest workspace
            shell and keep your saved account state.
          </p>
          {import.meta.env.DEV ? <pre>{String(this.state.error?.message || this.state.error)}</pre> : null}
          <button type="button" onClick={() => window.location.reload()}>
            Reload app
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);

const isLocalDevHost =
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost";

if ("serviceWorker" in navigator && !import.meta.env.DEV && !isLocalDevHost) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
} else if ("serviceWorker" in navigator && isLocalDevHost) {
  window.addEventListener("load", async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ("caches" in window) {
      const cacheKeys = await window.caches.keys();
      await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
    }
  });
}
