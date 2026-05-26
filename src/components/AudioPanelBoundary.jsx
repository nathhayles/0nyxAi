import React from "react";
import AudioPanel from "./AudioPanel.jsx";

class AudioPanelBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  componentDidCatch(error, info) {
    console.error("[AudioPanel crash]", error, info?.componentStack);
  }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 20, color: "#f87171", fontSize: 12, fontFamily: "monospace" }}>
        <div style={{ marginBottom: 8, fontWeight: 700 }}>AudioPanel error (isolated)</div>
        <div style={{ opacity: 0.7 }}>{this.state.error.message}</div>
      </div>
    );
    return <AudioPanel {...this.props} />;
  }
}
export default AudioPanelBoundary;
