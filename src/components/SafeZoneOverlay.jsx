import { memo } from "react";
import { PLATFORM_SAFE_ZONES } from "../data/platformSafeZones";

// Passive visual reference only -- no auto-enforcement, no drag/snap.
// Wrapped in React.memo and kept prop-minimal (just `platform`) on purpose:
// it's rendered inside PreviewCanvas, which re-renders every playhead tick
// during playback (~60fps). This component's own props never change during
// playback, so memo lets it skip re-rendering on those ticks entirely --
// it only re-renders when the user toggles it on/off or switches platform.
function SafeZoneOverlayBase({ platform }) {
  const zone = PLATFORM_SAFE_ZONES[platform];
  if (!zone) return null;

  const bandStyle = {
    position: "absolute",
    background: "rgba(255,60,60,0.14)",
    pointerEvents: "none",
  };
  const labelStyle = {
    position: "absolute",
    fontSize: 9,
    fontWeight: 700,
    color: "rgba(255,120,120,0.9)",
    textShadow: "0 1px 2px rgba(0,0,0,0.8)",
    letterSpacing: "0.02em",
    textTransform: "uppercase",
  };

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 20, pointerEvents: "none" }}>
      <div style={{ ...bandStyle, top: 0, left: 0, right: 0, height: `${zone.top}%`, borderBottom: "1px dashed rgba(255,80,80,0.5)" }} />
      <div style={{ ...bandStyle, bottom: 0, left: 0, right: 0, height: `${zone.bottom}%`, borderTop: "1px dashed rgba(255,80,80,0.5)" }} />
      <div style={{ ...bandStyle, top: `${zone.top}%`, bottom: `${zone.bottom}%`, left: 0, width: `${zone.left}%`, borderRight: "1px dashed rgba(255,80,80,0.5)" }} />
      <div style={{ ...bandStyle, top: `${zone.top}%`, bottom: `${zone.bottom}%`, right: 0, width: `${zone.right}%`, borderLeft: "1px dashed rgba(255,80,80,0.5)" }} />
      <div style={{ ...labelStyle, top: 4, left: "50%", transform: "translateX(-50%)" }}>{zone.label} unsafe</div>
    </div>
  );
}

export default memo(SafeZoneOverlayBase);
