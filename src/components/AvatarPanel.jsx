import React, { useState, useEffect } from "react";
import { getAuthHeaders } from "../utils/auth.js";
import HelpTooltip from "./HelpTooltip.jsx";

const AVATAR_POSITIONS = [
  { id: "bottom-left",  label: "↙ Bottom Left" },
  { id: "bottom-right", label: "↘ Bottom Right" },
  { id: "bottom-center",label: "↓ Centre" },
  { id: "left",         label: "◧ Left Full" },
  { id: "right",        label: "◨ Right Full" },
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
  { code: "ru", label: "Russian" },
];

const inputStyle = {
  width: "100%", background: "var(--input-bg)", border: "0.5px solid var(--onyx-hairline-strong)",
  color: "#e2e8f0", borderRadius: 4, padding: "7px 10px", fontSize: 13,
  boxSizing: "border-box",
};

const btnStyle = (active) => ({
  flex: 1, padding: "6px 8px", borderRadius: 4, fontSize: 11,
  cursor: "pointer", fontWeight: 600,
  background: active ? "var(--chip-bg-strong)" : "var(--chip-bg)",
  border: active ? "1px solid var(--onyx-cyan)" : "0.5px solid var(--onyx-hairline-strong)",
  color: active ? "#60a5fa" : "#64748b",
});

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 16, padding: 12, background: "var(--onyx-surface-2)", borderRadius: 6, border: "0.5px solid var(--onyx-hairline)" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 10, textTransform: "uppercase", letterSpacing: "1.5px" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export default function AvatarPanel({ scenes, setScenes, activeScene, reelVideoUrl, timelineTracks, reelId }) {
  const [tab, setTab] = useState("stock");
  const [avatars, setAvatars] = useState([]);
  const [loadingAvatars, setLoadingAvatars] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [position, setPosition] = useState("bottom-right");
  const [avatarIV, setAvatarIV] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [targetLang, setTargetLang] = useState("es");
  const [error, setError] = useState(null);
  const [scope, setScope] = useState("this");

  const activeSceneObj = scenes?.find(s => s.id === activeScene);

  // Avatar status polling now lives in EditorV2 (persists across sidebar tab switches).

  useEffect(() => {
    setLoadingAvatars(true);
    getAuthHeaders().then(headers =>
      fetch("/api/heygen/avatars", { headers })
        .then(r => r.json())
        .then(d => setAvatars(d.avatars || []))
        .catch(() => {})
        .finally(() => setLoadingAvatars(false))
    );
  }, []);

  const filteredAvatars = avatars.filter(a =>
    a.avatar_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleGenerate = async () => {
    if (!activeSceneObj?.narration) {
      setError("This scene has no narration text to speak.");
      return;
    }
    if (tab === "stock" && !selectedAvatar) {
      setError("Please select an avatar first.");
      return;
    }
    if (tab === "photo" && !photoFile) {
      setError("Please upload a photo first.");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const headers = await getAuthHeaders();
      headers["Content-Type"] = "application/json";

      const targetScenes = scope === "all"
        ? scenes
        : scenes.filter(s => s.id === activeScene);

      for (const scene of targetScenes) {
        // reel_id/scene_id let the backend's HeyGen webhook (routes/heygen.js)
        // patch this exact scene when the video completes, instead of relying
        // solely on the polling loop in EditorV2.jsx to notice. Both optional
        // server-side -- reelId is null until the reel's first save, in which
        // case generation still works exactly as before, just without the
        // webhook shortcut for that one scene.
        const body = tab === "stock"
          ? { avatar_id: selectedAvatar.avatar_id, script: scene.narration, avatar_iv: avatarIV, reel_id: reelId || null, scene_id: scene.id }
          : { image_url: photoPreview, script: scene.narration, reel_id: reelId || null, scene_id: scene.id };

        const endpoint = tab === "stock" ? "/api/heygen/generate" : "/api/heygen/photo-avatar";

        const res = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(body) });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Generation failed");

        // Store video_id on scene for polling
        setScenes(prev => prev.map(s => s.id === scene.id ? {
          ...s,
          avatar_video_id: data.video_id,
          avatar_status: "processing",
          avatar_id: selectedAvatar?.avatar_id,
          avatar_position: position,
        } : s));
      }

      setError(null);
    } catch (e) {
      setError(e.message);
    }
    setGenerating(false);
  };

  const handleTranslate = async () => {
    setError(null);
    if (!reelVideoUrl) {
      setError("Please render and download your reel first, then translate.");
      return;
    }
    setTranslating(true);
    try {
      const headers = await getAuthHeaders();
      headers["Content-Type"] = "application/json";
      const durationMins = Math.max(1, Math.ceil((scenes?.length || 1) * 3 / 60));
      const res = await fetch("/api/heygen/translate", {
        method: "POST",
        headers,
        body: JSON.stringify({
          video_url: reelVideoUrl,
          target_language: targetLang,
          duration_mins: durationMins,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Translation failed");
      alert(`Translation started! ID: ${data.translation_id}`);
    } catch (e) {
      setError(e.message);
    }
    setTranslating(false);
  };

  return (
    <div style={{ padding: 12, overflowY: "auto", height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1.5px" }}>
          Avatar & Presenter
        </div>
        <HelpTooltip topic="heygen" />
      </div>

      {error && (
        <div style={{ padding: "8px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 4, fontSize: 12, color: "#f87171", marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <button onClick={() => setTab("stock")} style={btnStyle(tab === "stock")}>Stock Avatars</button>
        <button onClick={() => setTab("photo")} style={btnStyle(tab === "photo")}>My Photo</button>
        <button onClick={() => setTab("translate")} style={btnStyle(tab === "translate")}>Translate</button>
      </div>

      {/* Stock avatars */}
      {tab === "stock" && (
        <>
          <Section title="Choose Avatar">
            <input
              style={{ ...inputStyle, marginBottom: 8 }}
              placeholder="Search avatars..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {loadingAvatars ? (
              <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: 10 }}>Loading avatars...</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, maxHeight: 180, overflowY: "auto" }}>
                {filteredAvatars.map(avatar => (
                  <div
                    key={avatar.avatar_id}
                    onClick={() => setSelectedAvatar(avatar)}
                    style={{
                      cursor: "pointer", borderRadius: 6, overflow: "hidden",
                      border: selectedAvatar?.avatar_id === avatar.avatar_id ? "2px solid var(--onyx-cyan)" : "2px solid transparent",
                      background: "var(--onyx-surface)",
                    }}
                  >
                    <img
                      src={avatar.preview_image_url}
                      alt={avatar.avatar_name}
                      style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }}
                      onError={e => e.target.style.display = "none"}
                    />
                    <div style={{ padding: "4px 6px", fontSize: 10, color: "#94a3b8", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {avatar.avatar_name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "6px 10px", background: "var(--onyx-surface-2)", borderRadius: 6, border: "0.5px solid var(--onyx-hairline)" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1.2px", flexShrink: 0 }}>Quality</span>
            <button onClick={() => setAvatarIV(false)} style={{ ...btnStyle(!avatarIV), fontSize: 10, padding: "3px 8px" }}>Standard</button>
            <button onClick={() => setAvatarIV(true)}  style={{ ...btnStyle(avatarIV),  fontSize: 10, padding: "3px 8px" }}>IV ✦</button>
            <span style={{ fontSize: 10, color: "#64748b", marginLeft: "auto" }}>{avatarIV ? "600" : "200"} cr/min</span>
          </div>
        </>
      )}

      {/* Photo avatar */}
      {tab === "photo" && (
        <Section title="Upload Your Photo">
          {photoPreview ? (
            <div style={{ marginBottom: 10 }}>
              <img src={photoPreview} alt="Preview" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 6, border: "1px solid #2b3442" }} />
              <button
                onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                style={{ marginTop: 6, width: "100%", padding: 5, fontSize: 11, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", borderRadius: 4, cursor: "pointer" }}
              >
                Remove
              </button>
            </div>
          ) : (
            <label style={{ display: "block", textAlign: "center", padding: 16, border: "2px dashed #2b3442", borderRadius: 6, cursor: "pointer", fontSize: 12, color: "#94a3b8" }}>
              📷 Upload a photo of yourself
              <br />
              <span style={{ fontSize: 10, color: "#94a3b8" }}>Clear front-facing photo works best</span>
              <input type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: "none" }} />
            </label>
          )}
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>
            300 credits/min • Your photo is animated with lip sync to match the scene narration.
          </div>
        </Section>
      )}

      {/* Translation tab */}
      {tab === "translate" && (
        <Section title="Translate Reel">
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
            Translate your completed reel into another language with AI lip sync. Render the reel first, then translate.
          </div>
          <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.8px" }}>Target Language</div>
          <select style={{ ...inputStyle, marginBottom: 12 }} value={targetLang} onChange={e => setTargetLang(e.target.value)}>
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
          <div style={{ fontSize: 11, color: "#f59e0b", padding: "6px 8px", background: "rgba(245,158,11,0.1)", borderRadius: 4, marginBottom: 12 }}>
            40 credits per minute of video
          </div>
          {!reelVideoUrl && (
            <div style={{ fontSize: 11, color: "#f59e0b", padding: "6px 8px",
              background: "rgba(245,158,11,0.1)", borderRadius: 4, marginBottom: 8 }}>
              ⚠️ Render and download your reel first to enable translation.
            </div>
          )}
          <button
            onClick={handleTranslate}
            disabled={translating || !reelVideoUrl}
            style={{ width: "100%", padding: 10, background: translating || !reelVideoUrl ? "var(--chip-bg-strong)" : "var(--btn-primary-grad)", border: "none", color: "var(--btn-primary-text)", borderRadius: 4, cursor: translating || !reelVideoUrl ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600 }}
          >
            {translating ? "Starting translation..." : "Translate Reel"}
          </button>
        </Section>
      )}

      {/* Position picker (stock + photo tabs) */}
      {tab !== "translate" && (
        <Section title="Avatar Position">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {AVATAR_POSITIONS.map(p => (
              <button key={p.id} onClick={() => setPosition(p.id)} style={btnStyle(position === p.id)}>
                {p.label}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Scrollable content spacer */}
      <div style={{ flex: 1 }} />

      {/* Apply scope + generate — sticky footer */}
      {tab !== "translate" && (
        <div style={{
          position: "sticky", bottom: 0,
          background: "var(--onyx-bg-2, #0b0f17)",
          borderTop: "0.5px solid var(--onyx-hairline-strong)",
          padding: "10px 0 4px",
          marginTop: 4,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1.2px", flexShrink: 0 }}>Apply To</span>
            <button onClick={() => setScope("this")} style={{ ...btnStyle(scope === "this"), fontSize: 10, padding: "3px 8px" }}>This scene</button>
            <button onClick={() => setScope("all")}  style={{ ...btnStyle(scope === "all"),  fontSize: 10, padding: "3px 8px" }}>All scenes</button>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              width: "100%", padding: 10, fontSize: 12, fontWeight: 700,
              background: generating ? "var(--chip-bg-strong)" : "var(--btn-primary-grad)",
              border: "none", color: "var(--btn-primary-text)", borderRadius: 4,
              cursor: generating ? "not-allowed" : "pointer",
              letterSpacing: "0.5px", textTransform: "uppercase",
            }}
          >
            {generating ? "Generating..." : `Generate Avatar${scope === "all" ? " (All Scenes)" : ""}`}
          </button>
          {activeSceneObj?.avatar_status === "processing" && (
            <div style={{ marginTop: 6, fontSize: 11, color: "#f59e0b", textAlign: "center" }}>
              ⏳ Generating avatar... checking every 5s
            </div>
          )}
          {activeSceneObj?.avatar_status === "completed" && (
            <div style={{ marginTop: 6, fontSize: 11, color: "#22c55e", textAlign: "center" }}>
              ✓ Avatar ready — will appear in render
            </div>
          )}
          {activeSceneObj?.avatar_status === "failed" && (
            <div style={{ marginTop: 6, fontSize: 11, color: "#f87171", textAlign: "center" }}>
              ✗ Generation failed — try again
            </div>
          )}
        </div>
      )}
    </div>
  );
}
