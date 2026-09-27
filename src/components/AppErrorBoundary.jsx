import React from "react";
import { isChunkLoadError, isReloadingForStaleChunk, reloadOnceForStaleChunk } from "../staleChunkRecovery.js";

// Top-level boundary around the whole app (main.jsx). Without it, any
// render error -- most often a lazy route's chunk deleted by a deploy, see
// src/staleChunkRecovery.js -- unmounts the entire React tree and leaves a
// blank black page. A stale chunk gets one guarded automatic reload; any
// other error, or a chunk still missing after that reload, shows a screen
// with a Reload button instead.
export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, reloading: false };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[AppErrorBoundary]", error, info?.componentStack);
    if (isChunkLoadError(error) && (isReloadingForStaleChunk() || reloadOnceForStaleChunk())) {
      this.setState({ reloading: true });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    const wrap = {
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, boxSizing: "border-box", textAlign: "center",
      background: "var(--onyx-bg, #06080d)", color: "var(--onyx-text, #f1f5fb)",
      fontFamily: "system-ui, -apple-system, sans-serif",
    };

    if (this.state.reloading) {
      return (
        <div style={wrap} role="status">
          <p style={{ margin: 0, color: "var(--onyx-text-dim, rgba(241,245,251,0.72))" }}>Loading the latest version…</p>
        </div>
      );
    }

    return (
      <div style={wrap} role="alert">
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Something went wrong</h1>
          <p style={{ margin: "0 0 20px", color: "var(--onyx-text-dim, rgba(241,245,251,0.72))" }}>
            Reload the page to continue.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 22px", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 15, fontWeight: 600, background: "#00d2ff", color: "#06080d",
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
