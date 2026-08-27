// ── AudioPanel ─────────────────────────────────────────────────────────────────
// Was a full TTS voice-picker (provider tabs, voice list, preview, favourites)
// duplicating VoiceOverPanel.jsx's real narration UI -- but picking a voice
// here (`selectedVoice`) was never read anywhere else in the app, and the
// component was never given the `brand`/`onRegenerateAllVO` props its own
// signature declared needing, so the "Regenerate All Voice Over" button could
// never render either. Confirmed via a real UX audit (2026-08-27) that this
// silently did nothing when a voice was clicked -- a real trap, since "Audio"
// reads as exactly where voice selection should live. Stripped down to the
// one thing this panel actually does: show/control the music bed (picked via
// the Library panel, not here -- see onChangeInLibrary). Favouriting still
// works identically via VoiceOverPanel's own star UI, nothing lost there.

const S = {
  panel: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    fontFamily: "var(--onyx-font, system-ui)",
    fontSize: 12,
    color: "var(--onyx-text, #f1f5fb)",
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 10,
    color: "var(--onyx-text-faint, rgba(241,245,251,0.40))",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    padding: "10px 12px 4px",
    flexShrink: 0,
  },
  slider: {
    width: "100%",
    accentColor: "var(--onyx-cyan, #4dd0ff)",
    cursor: "pointer",
  },
  volumeRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 12px",
  },
  volumeLabel: {
    width: 70,
    fontSize: 11,
    color: "var(--onyx-text-dim, rgba(241,245,251,0.62))",
    flexShrink: 0,
  },
  volumeValue: {
    width: 30,
    fontSize: 11,
    color: "var(--onyx-text-dim)",
    textAlign: "right",
    flexShrink: 0,
  },
  nowPlayingRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "2px 12px 10px",
  },
  nowPlayingName: {
    flex: 1,
    fontSize: 12,
    color: "var(--onyx-text, #f1f5fb)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  smallBtn: {
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    background: "rgba(77,208,255,0.10)",
    border: "0.5px solid rgba(77,208,255,0.3)",
    color: "var(--onyx-cyan, #4dd0ff)",
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  smallBtnGhost: {
    width: 22,
    height: 22,
    borderRadius: 11,
    border: "none",
    background: "rgba(255,255,255,0.08)",
    color: "var(--onyx-text-dim, rgba(241,245,251,0.62))",
    cursor: "pointer",
    fontSize: 11,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
};

export default function AudioPanel({
  musicVolume = 60, setMusicVolume,
  musicName = "",
  onChangeInLibrary,
  onClearMusic,
}) {
  return (
    <div style={S.panel}>
      {/* Music is picked in the Library panel now -- this just shows what's
          applied and controls its volume, no picker duplicated here. */}
      <div style={S.sectionTitle}>Music</div>
      <div style={S.nowPlayingRow}>
        {musicName ? (
          <>
            <span style={S.nowPlayingName} title={musicName}>{musicName}</span>
            <button style={S.smallBtn} onClick={onChangeInLibrary}>Change</button>
            <button style={S.smallBtnGhost} onClick={onClearMusic} title="Remove music">✕</button>
          </>
        ) : (
          <button style={S.smallBtn} onClick={onChangeInLibrary}>+ Pick music in Library</button>
        )}
      </div>
      <div style={S.volumeRow}>
        <span style={S.volumeLabel}>Music</span>
        <input type="range" min={0} max={100} value={musicVolume}
          onChange={e => setMusicVolume(Number(e.target.value))} style={S.slider} />
        <span style={S.volumeValue}>{musicVolume}%</span>
      </div>
    </div>
  );
}
