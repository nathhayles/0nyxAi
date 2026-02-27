import React from "react";

export default function AudioPanel({
  tab,
  setTab,
  voiceoverVolume,
  setVoiceoverVolume,
  musicVolume,
  setMusicVolume,
}) {
  return (
    <div>
      <div className="panelTabs">
        <button className={tab === "voiceovers" ? "active" : ""} onClick={() => setTab("voiceovers")}>Voiceovers</button>
        <button className={tab === "music" ? "active" : ""} onClick={() => setTab("music")}>Music</button>
        <button className={tab === "uploads" ? "active" : ""} onClick={() => setTab("uploads")}>Uploads</button>
      </div>

      <div className="panelBlock">
        <div className="panelTitle">Global Volume</div>

        <div className="volumeRow">
          <div className="volLabel">Voiceover</div>
          <input
            type="range"
            min="0"
            max="100"
            value={voiceoverVolume}
            onChange={(e) => setVoiceoverVolume(Number(e.target.value))}
          />
          <div className="volValue">{voiceoverVolume}%</div>
        </div>

        <div className="volumeRow">
          <div className="volLabel">Background Music</div>
          <input
            type="range"
            min="0"
            max="100"
            value={musicVolume}
            onChange={(e) => setMusicVolume(Number(e.target.value))}
          />
          <div className="volValue">{musicVolume}%</div>
        </div>
      </div>

      {tab === "voiceovers" && (
        <div className="panelBlock">
          <div className="panelTitle">Voiceovers</div>
          <div className="panelMuted">Standard & Premium voices (placeholder)</div>
          <div className="listBox">
            <div className="listItem">Standard Voice 1</div>
            <div className="listItem">Standard Voice 2</div>
            <div className="listItem">Premium Voice 1</div>
            <div className="listItem">Premium Voice 2</div>
          </div>
        </div>
      )}

      {tab === "music" && (
        <div className="panelBlock">
          <div className="panelTitle">Background Music</div>
          <div className="panelMuted">Stock music (placeholder)</div>
          <div className="listBox">
            <div className="listItem">Stock Track 1</div>
            <div className="listItem">Stock Track 2</div>
            <div className="listItem">Stock Track 3</div>
          </div>
        </div>
      )}

      {tab === "uploads" && (
        <div className="panelBlock">
          <div className="panelTitle">Uploads</div>
          <div className="panelMuted">Upload your own voiceovers or background music (placeholder)</div>
          <div className="uploadDrop">Drop audio files here</div>
          <div className="disclaimer">
            Disclaimer: If you upload copyrighted audio, platforms may mute or remove your video.
          </div>
        </div>
      )}
    </div>
  );
}
