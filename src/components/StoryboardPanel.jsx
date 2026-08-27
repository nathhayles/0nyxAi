import React, { useState, useEffect, useRef } from "react";
import HelpTooltip from "./HelpTooltip.jsx";
import { getAuthHeaders } from "../utils/auth.js";

function normalizeNarrationText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

// Mirrors normalize() in backend/lib/resolveCharacterTags.js so the chip's
// resolved/unresolved state matches what the server will actually resolve.
function normalizeTagName(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, "");
}

// Character names currently tagged in a scene's prompt text (for the chip row).
function parseTaggedNames(text) {
  const matches = [...String(text || "").matchAll(/@([A-Za-z0-9_]+)/g)];
  return [...new Set(matches.map((m) => m[1]))];
}

// Narration-specific: mirrors backend/lib/resolveTaggedEntities.js's
// LEADING_SPEAKER_TAG_RE exactly (leading "@Tag: " only, not any @Tag
// anywhere in the text). Deliberately NOT parseTaggedNames above -- that
// one matches an @Tag anywhere in the string, which is correct for action
// (every match there really does resolve into elements[]), but narration's
// voice lookup only ever honors a leading tag. Using parseTaggedNames for
// narration's chip row would show a chip for a mid-sentence @Tag that the
// backend silently ignores for voice purposes -- a real UI/backend mismatch,
// not just a style choice.
function parseLeadingSpeakerTag(text) {
  const match = String(text || "").match(/^@([A-Za-z0-9_]+):/);
  return match ? [match[1]] : [];
}

// Textarea with "@"-triggered autocomplete over the user's saved characters.
// Selecting a character inserts "@Name" as literal text — no separate
// "attach" control, per spec (tag resolution happens server-side at fal.ai
// submit time; see backend/lib/resolveCharacterTags.js).
function CharacterTagTextarea({ value, onChange, placeholder, onClick, characters, autocompleteDisabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [triggerPos, setTriggerPos] = useState(null);
  const taRef = useRef(null);

  const matches = open && !autocompleteDisabled
    ? characters.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : [];

  const handleChange = (e) => {
    const text = e.target.value;
    const caret = e.target.selectionStart;
    onChange(text);

    // Textarea itself always stays editable (the model may still ignore any
    // @tags typed here, but nothing stops the user typing them by hand) --
    // autocompleteDisabled only suppresses the assisted popover below.
    if (autocompleteDisabled) {
      setOpen(false);
      return;
    }

    const upToCaret = text.slice(0, caret);
    const m = upToCaret.match(/@([A-Za-z0-9_]*)$/);
    if (m) {
      setOpen(true);
      setQuery(m[1]);
      setTriggerPos(caret - m[0].length);
    } else {
      setOpen(false);
    }
  };

  const selectCharacter = (name) => {
    if (triggerPos == null) return;
    const before = value.slice(0, triggerPos);
    const after = value.slice(triggerPos + 1 + query.length);
    const next = `${before}@${name} ${after}`;
    onChange(next);
    setOpen(false);
    requestAnimationFrame(() => {
      if (taRef.current) {
        const pos = before.length + name.length + 2;
        taRef.current.focus();
        taRef.current.setSelectionRange(pos, pos);
      }
    });
  };

  return (
    <div style={{ position: "relative" }}>
      <textarea
        ref={taRef}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onClick={onClick}
      />
      {open && matches.length > 0 && (
        <div
          style={{
            position: "absolute", zIndex: 20, top: "100%", left: 0, right: 0,
            background: "var(--onyx-surface)", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8, marginTop: 2, maxHeight: 160, overflowY: "auto",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {matches.map((c) => (
            <div
              key={c.id}
              onClick={() => selectCharacter(c.name)}
              style={{ padding: "6px 10px", fontSize: 12, cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              @{c.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Kling's cost is duration-based (backend/routes/kling.js getSceneCost),
// not flat — see the matching comment in Create.jsx's VIDEO_MODEL_OPTIONS.
const REGEN_MODEL_OPTIONS = [
  { id: "wan-2.5",        label: "Wan 2.5", credits: 67, creditsLabel: "34-67 cr/scene" },
  // Range spans both duration (2-15s) AND the optional 1080p upgrade
  // (720p: 27-200cr, 1080p: 40-300cr) -- shows the full honest range rather
  // than understating cost for users who pick the upgrade.
  { id: "wan-2.7",        label: "Wan 2.7", credits: 300, creditsLabel: "27-300 cr/scene" },
  // Range widened 2026-08-16: fal's real duration schema is 3-15s, not the
  // old 5s/10s-only bucket this range was computed against (was "75-149",
  // understating the true max cost by ~45%) -- see kling-2.6-pro's own
  // duration spec comment in kling.js's VIDEO_MODELS.
  { id: "kling-2.6-pro",  label: "Kling 3 Pro", credits: 224, creditsLabel: "45-224 cr/scene" },
  { id: "veo-3",          label: "Veo 3.1",        credits: 213, creditsLabel: "107-213 cr/scene" },
  // Real ranges (2-12s/4-15s/1-16s) confirmed against each model's real
  // duration spec in kling.js's VIDEO_MODELS -- previously understated
  // here, left over from before the duration picker allowed anything past
  // the old 5s/10s-only bucket.
  { id: "seedance-1-pro", label: "Seedance 1 Pro", credits: 48, creditsLabel: "8-48 cr/scene" },
  // 107-399 (was 162-606) after the fal->piapi provider switch 2026-08-15 --
  // see the matching comment in Create.jsx's VIDEO_MODEL_OPTIONS.
  { id: "seedance-2-standard", label: "Seedance 2.0", credits: 399, creditsLabel: "107-399 cr/scene" },
  { id: "vidu-q3-pro",    label: "Vidu Q3 Pro",    credits: 266, creditsLabel: "17-266 cr/scene" },
  // Start-end-to-video only (see VIDEO_MODELS in kling.js) -- was missing
  // from this dropdown entirely, so this model was never actually
  // reachable through the UI despite being fully wired server-side.
  { id: "vidu-q3-turbo",  label: "Vidu Q3 Turbo",  credits: 128, creditsLabel: "8-128 cr/scene" },
  // Real min/max computed across the full real range (4-30s duration,
  // 480p/720p, all 6 real aspect ratios -- see getSeedance25Cost in
  // kling.js) via a live calc 2026-08-08, not estimated: cheapest is
  // 4s/480p/1:1 (62cr), most expensive is 30s/720p/21:9 (2421cr). Genuinely
  // the widest range of any model here -- this is a premium, token-priced
  // model, the range is honest, not a display bug.
  { id: "seedance-2.5",   label: "✨ Seedance 2.5", credits: 2421, creditsLabel: "62-2421 cr/scene", premium: true },
];

export default function StoryboardPanel({
  scenes,
  activeScene,
  setActiveScene,
  updateScenes,
  onSaveScene,
  onDeleteScene,
  onGenerateScene,
  generatingScenes = {},
  onAddScene,
  regenModel = "kling-2.6-pro",
  onRegenModelChange,
  supportsRefs = false,
  supportsEndFrame = false,
  supportsStartImage = false,
  durationSpec = null,
  supports1080pUpgrade = false,
  resolutionOptions = null,
  aspectRatio = "9:16",
  onUpscaleScene,
  upscalingScenes = {},
  upscaleCapabilities = {},
  onReorder,
  timelineState,
  dispatch,
}) {
  // Scene drag-to-reorder — was completely unwired until 2026-08-17 (found
  // during the tool tutorial campaign: a real moveScene(from,to) function
  // existed in EditorV2.jsx but nothing ever called it, no drag handlers
  // existed here at all). Uses a small dedicated drag handle rather than
  // making the whole card draggable, so it doesn't fight with the card's
  // own click-to-select and its many nested buttons/inputs.
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Selecting a scene card here only ever updated `activeScene` -- the
  // matching timeline clip never got the SequencerPanel's own `selected`
  // highlight, since that's driven by a separate SELECT dispatch (only ever
  // fired from a timeline click, see SequencerPanel.jsx's TrackRowBase).
  // The reverse direction (timeline click -> scene highlight) already
  // worked. Confirmed via a real UX audit (2026-08-27) as a genuine gap,
  // not a data-model problem -- clip.sceneId already links every clip back
  // to its scene (SPLIT_CLIP and SPEED_RAMP_PRESET both preserve it), this
  // was purely missing UI wiring. A split scene can have multiple clips;
  // picks the earliest by startTime as the representative one to select.
  const sceneCardRefs = useRef({});
  function handleSceneClick(sceneId) {
    setActiveScene(sceneId);
    if (!dispatch || !timelineState) return;
    const matches = timelineState.tracks
      .flatMap(t => t.clips)
      .filter(c => c.sceneId === sceneId)
      .sort((a, b) => a.startTime - b.startTime);
    if (matches[0]) dispatch({ type: "SELECT", clipId: matches[0].id });
  }

  // Auto-scroll the active scene's card into view -- e.g. when the
  // playhead crosses into a new scene during playback, or a timeline click
  // sets activeScene to a scene whose card is currently scrolled out of
  // view. Neither direction auto-scrolled before this (audit finding).
  useEffect(() => {
    sceneCardRefs.current[activeScene]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeScene]);
  const [stockQuery, setStockQuery] = useState({});
  const [stockResults, setStockResults] = useState({});
  const [stockSearching, setStockSearching] = useState({});
  const [uploadingScene, setUploadingScene] = useState({});
  const [uploadingSourceImage, setUploadingSourceImage] = useState({});
  const [characters, setCharacters] = useState([]);
  // Upscale controls are ephemeral per-scene UI state (which of the 5
  // models is selected, and that model's current control value) -- not
  // persisted scene data, so this lives in local component state rather
  // than on the scene object itself. Keyed by scene id so switching the
  // active scene doesn't lose another scene's in-progress picker state.
  const [upscaleOpen, setUpscaleOpen] = useState({});
  const [upscaleModel, setUpscaleModel] = useState({});
  const [upscaleParam, setUpscaleParam] = useState({});

  // Live credit estimate (2026-08-08) -- calls GET /api/models/estimate-cost,
  // which runs the REAL getSceneCost() server-side (see that route's own
  // comment) rather than duplicating any pricing formula in JS. Built for
  // seedance-2.5's non-trivial token-based cost, but the fetch itself is
  // generic to whatever model/duration/resolution/aspectRatio are current
  // for the active scene. Debounced (400ms) so dragging the duration
  // slider doesn't fire a request per pixel of drag.
  const [estimatedCredits, setEstimatedCredits] = useState(null);
  const [estimateLoading, setEstimateLoading] = useState(false);

  const activeSceneObj = scenes.find((s) => s.id === activeScene);
  const activeDuration = activeSceneObj?.duration || durationSpec?.default || 5;
  const activeResolution = activeSceneObj?.resolution || null;
  useEffect(() => {
    let cancelled = false;
    setEstimateLoading(true);
    const timer = setTimeout(async () => {
      try {
        const headers = await getAuthHeaders();
        const params = new URLSearchParams({
          model: regenModel,
          duration: String(activeDuration),
          aspect_ratio: aspectRatio,
        });
        if (activeResolution) params.set("resolution", activeResolution);
        const res = await fetch(`/api/models/estimate-cost?${params}`, { headers });
        const data = await res.json();
        if (!cancelled) setEstimatedCredits(typeof data.credits === "number" ? data.credits : null);
      } catch {
        if (!cancelled) setEstimatedCredits(null);
      } finally {
        if (!cancelled) setEstimateLoading(false);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [regenModel, activeDuration, activeResolution, aspectRatio]);

  useEffect(() => {
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/characters", { headers });
        const data = await res.json();
        setCharacters(data.characters || []);
      } catch (e) {
        console.error("[StoryboardPanel] failed to load characters:", e);
      }
    })();
  }, []);

  const updateField = (sceneId, field, value) => {
    const next = scenes.map((sc) => {
      if (String(sc.id) !== String(sceneId)) return sc;

      if (field === "narration") {
        const prevText = normalizeNarrationText(sc.narration || "");
        const nextText = normalizeNarrationText(value);
        if (prevText !== nextText) {
          return { ...sc, narration: value, voiceoverStale: !!nextText };
        }
      }

      return { ...sc, [field]: value };
    });

    updateScenes(next);
  };

  const handleStockSearch = async (sceneId) => {
    const q = (stockQuery[sceneId] || "").trim();
    if (!q) return;
    setStockSearching((prev) => ({ ...prev, [sceneId]: true }));
    try {
      const res = await fetch(`/api/stock/videos?q=${encodeURIComponent(q)}&per_page=9&orientation=portrait`);
      const data = await res.json();
      setStockResults((prev) => ({ ...prev, [sceneId]: data.videos || [] }));
    } catch (e) {
      console.error("Stock search failed:", e);
    } finally {
      setStockSearching((prev) => ({ ...prev, [sceneId]: false }));
    }
  };

  const handleSelectStock = (sceneId, video) => {
    if (sceneId == null) {
      console.warn("[StoryboardPanel] handleSelectStock called with nullish sceneId — scene is missing an id");
      return;
    }
    updateScenes(prev => prev.map((sc) =>
      String(sc.id) !== String(sceneId) ? sc : {
        ...sc,
        url: video.url,
        mediaUrl: video.url,
        mediaType: "video",
        stockSource: "stock",
        thumbnail: video.thumb,
      }
    ));
  };

  const handleUpload = async (sceneId, file) => {
    if (!file) return;
    setUploadingScene((prev) => ({ ...prev, [sceneId]: true }));
    try {
      const headers = await getAuthHeaders();
      const form = new FormData();
      form.append("files", file);
      form.append("assetType", file.type.startsWith("video/") ? "video" : "image");
      const res = await fetch("/api/media/upload", { method: "POST", headers, body: form });
      const data = await res.json();
      const uploaded = data?.files?.[0];
      if (uploaded) {
        updateScenes(prev => prev.map((sc) =>
          String(sc.id) !== String(sceneId) ? sc : {
            ...sc,
            url: uploaded.url,
            mediaUrl: uploaded.url,
            mediaType: uploaded.type,
            thumbnail: uploaded.thumbnailUrl || "",
            stockSource: "upload",
          }
        ));
      }
    } catch (e) {
      console.error("Upload failed:", e);
    } finally {
      setUploadingScene((prev) => ({ ...prev, [sceneId]: false }));
    }
  };

  // Distinct from handleUpload -- writes sourceImageUrl only, never
  // mediaUrl/mediaType/mode, so it can't be clobbered by a generation
  // completion the way the old mediaType==="image" workaround was.
  const handleUploadSourceImage = async (sceneId, file) => {
    if (!file) return;
    setUploadingSourceImage((prev) => ({ ...prev, [sceneId]: true }));
    try {
      const headers = await getAuthHeaders();
      const form = new FormData();
      form.append("files", file);
      form.append("assetType", "image");
      const res = await fetch("/api/media/upload", { method: "POST", headers, body: form });
      const data = await res.json();
      const uploaded = data?.files?.[0];
      if (uploaded) {
        updateField(sceneId, "sourceImageUrl", uploaded.url);
      }
    } catch (e) {
      console.error("Start Image upload failed:", e);
    } finally {
      setUploadingSourceImage((prev) => ({ ...prev, [sceneId]: false }));
    }
  };

  const handleClearMedia = (sceneId) => {
    updateScenes(prev => prev.map((sc) =>
      String(sc.id) !== String(sceneId) ? sc : { ...sc, url: "", mediaUrl: "", thumbnail: "", stockSource: "" }
    ));
  };

  return (
    <div style={{ maxWidth: "100%", boxSizing: "border-box" }}>
      {onRegenModelChange && (
        <div style={{
          padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 4,
          // Same sticky-header pattern as SequencerPanel's ruler (position:
          // sticky, top: 0, zIndex, explicit background) -- keeps the model
          // picker in view while scrolling through scene cards below, instead
          // of scrolling out of reach with the rest of the panel content.
          position: "sticky", top: 0, zIndex: 5, background: "var(--panel-bg, rgba(6,9,15,0.5))",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: 5, textTransform: "uppercase", letterSpacing: 1 }}>Generate model</div>
          {/* Native <select>/<option> can't be styled beyond browser
              defaults in any browser -- no gradient/badge/icon is possible
              on an individual <option>. The premium "visual treatment" for
              seedance-2.5 is instead: a distinguishing marker baked into
              the option's own label text (✨, see REGEN_MODEL_OPTIONS), a
              gold-tinted border/glow on the SELECT ITSELF when it's the
              current selection (a real, CSS-styleable element), and the
              banner block below it. */}
          {(() => {
            const selectedOpt = REGEN_MODEL_OPTIONS.find(o => o.id === regenModel);
            const isPremium = !!selectedOpt?.premium;
            return (
              <>
                <select
                  value={regenModel}
                  onChange={e => onRegenModelChange(e.target.value)}
                  style={{
                    width: "100%", padding: "6px 10px", borderRadius: 8, fontSize: 12,
                    border: isPremium ? "1px solid rgba(251,191,36,0.6)" : "1px solid rgba(255,255,255,0.12)",
                    boxShadow: isPremium ? "0 0 0 1px rgba(251,191,36,0.15)" : "none",
                    background: "var(--onyx-bg)", color: "var(--onyx-text)",
                  }}
                >
                  {REGEN_MODEL_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id} disabled={opt.disabled}>{opt.label}{opt.disabled ? "" : ` — ${opt.creditsLabel || `${opt.credits} cr/scene`}`}</option>
                  ))}
                </select>
                {isPremium && (
                  <div style={{
                    marginTop: 6, padding: "5px 8px", borderRadius: 6, fontSize: 10.5,
                    background: "linear-gradient(90deg, rgba(251,191,36,0.15), rgba(251,146,60,0.08))",
                    border: "1px solid rgba(251,191,36,0.3)", color: "#fbbf24",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <span>⭐</span>
                    <span>Premium model — token-based pricing, cost scales with duration/resolution/aspect ratio</span>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
      <div style={{ maxWidth: "100%", boxSizing: "border-box", overflowX: "hidden" }}>
      {scenes.map((sc, index) => {
        const mode = sc.mode || "ai";
        const isStock = mode === "stock";

        return (
          <div
            key={sc.id}
            ref={el => { sceneCardRefs.current[sc.id] = el; }}
            className={"sceneCard" + (sc.id === activeScene ? " active" : "")}
            onClick={() => handleSceneClick(sc.id)}
            onDragOver={(e) => {
              if (dragIndex === null || dragIndex === index) return;
              e.preventDefault();
              if (dragOverIndex !== index) setDragOverIndex(index);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex === null || dragIndex === index) return;
              onReorder?.(dragIndex, index);
              setDragIndex(null);
              setDragOverIndex(null);
            }}
            style={dragOverIndex === index && dragIndex !== null && dragIndex !== index
              ? { outline: "2px solid var(--onyx-cyan, #4dd0ff)", outlineOffset: -2 }
              : undefined}
          >
            {/* ── Header row ── */}
            <div className="sceneHeaderRow">
              <span
                draggable
                title="Drag to reorder"
                onClick={(e) => e.stopPropagation()}
                onDragStart={(e) => {
                  setDragIndex(index);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(index));
                }}
                onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
                // Hit area padded well past the glyph itself -- the bare
                // 14px "⠿" character was too small a target to reliably
                // grab (flagged 2026-08-19: real drag attempts landed just
                // outside it and silently did nothing, no visual feedback
                // either way so it read as "reordering doesn't work" even
                // though the underlying reorder logic is fine). Negative
                // margin keeps the larger hit box from pushing sibling
                // header items outward.
                style={{ cursor: "grab", flexShrink: 0, color: "var(--onyx-text-faint)", fontSize: 14, padding: "8px 10px", margin: "-8px -6px -8px -8px", userSelect: "none", display: "flex", alignItems: "center" }}
              >
                ⠿
              </span>
              <div className="sceneTitle" style={{ whiteSpace: "nowrap", flexShrink: 0, fontSize: 13, fontWeight: 600 }}>
                {sc.name ?? `Scene ${index + 1}`}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                <select
                  value={mode}
                  onChange={(e) => updateField(sc.id, "mode", e.target.value)}
                >
                  <option value="ai">AI</option>
                  <option value="stock">Stock</option>
                </select>
                {mode === "ai" && <HelpTooltip topic="kling" />}
              </div>

              <button
                className="sceneSmallBtn"
                onClick={(e) => { e.stopPropagation(); onSaveScene(sc.id); }}
              >
                Save
              </button>

              {scenes.length > 1 && (
                <button
                  className="sceneSmallBtn"
                  title="Delete scene"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteScene?.(sc.id);
                  }}
                  style={{ color: "#f87171" }}
                >
                  ✕
                </button>
              )}

              {!isStock && (
                <button
                  className="sceneSmallBtn primary"
                  disabled={!!generatingScenes[sc.id]}
                  onClick={(e) => { e.stopPropagation(); onGenerateScene(sc.id); }}
                >
                  {generatingScenes[sc.id]?.status === "submitting"
                    ? "Starting…"
                    : generatingScenes[sc.id]?.status === "polling"
                    ? "Generating…"
                    // Create.jsx's initial pipeline poll can time out client-side
                    // while the job is still likely running server-side, leaving a
                    // scene marked generationPending with no media yet. Gated on
                    // !(mediaUrl || url) rather than trusting the flag alone, so
                    // this can never get stuck once real media actually lands via
                    // any path (regenerate, stock swap, upload) -- none of those
                    // paths explicitly clear the flag, so the flag alone isn't a
                    // reliable signal once media exists.
                    : sc.generationPending && !(sc.mediaUrl || sc.url)
                    ? "Still generating…"
                    : "Generate"}
                </button>
              )}

              {/* Upscale button (build brief 2026-08-07) -- only meaningful
                  once the scene has real media, since it operates video-in/
                  video-out on the current mediaUrl. Toggles the inline
                  per-model control panel below rather than submitting
                  immediately, since every model's control shape differs
                  (see upscaleCapabilities) and there's no single "just go"
                  action that makes sense across all 5. Stays rendered (just
                  disabled) when there's no media yet, rather than
                  disappearing, so it doesn't read as random flicker while
                  scrubbing between scenes. */}
              {onUpscaleScene && (() => {
                const hasMedia = !!(sc.mediaUrl || sc.url);
                const disabled = !hasMedia || !!upscalingScenes[sc.id];
                return (
                  <button
                    className="sceneSmallBtn"
                    disabled={disabled}
                    title={hasMedia ? undefined : "Generate this scene's media first"}
                    onClick={(e) => { e.stopPropagation(); if (hasMedia) setUpscaleOpen(p => ({ ...p, [sc.id]: !p[sc.id] })); }}
                  >
                    {upscalingScenes[sc.id]?.status === "submitting"
                      ? "Starting…"
                      : upscalingScenes[sc.id]?.status === "polling"
                      ? "Upscaling…"
                      : "Upscale"}
                  </button>
                );
              })()}
            </div>

            {/* ── Upscale panel ── */}
            {onUpscaleScene && upscaleOpen[sc.id] && (() => {
              const modelId = upscaleModel[sc.id] || "topaz";
              const cap = upscaleCapabilities[modelId];
              const control = cap?.uiControl;
              const param = upscaleParam[sc.id]?.[modelId] || {};
              const setParam = (next) => setUpscaleParam(p => ({ ...p, [sc.id]: { ...(p[sc.id] || {}), [modelId]: { ...param, ...next } } }));

              return (
                <div
                  style={{ marginBottom: 8, padding: 8, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <select
                    value={modelId}
                    onChange={(e) => setUpscaleModel(p => ({ ...p, [sc.id]: e.target.value }))}
                    style={{ width: "100%", marginBottom: 6, padding: "4px 8px", borderRadius: 6, fontSize: 12, border: "1px solid rgba(255,255,255,0.12)", background: "var(--onyx-bg)", color: "var(--onyx-text)" }}
                  >
                    {Object.entries(upscaleCapabilities).map(([id, m]) => (
                      <option key={id} value={id}>{m.label}</option>
                    ))}
                  </select>

                  {/* Per-model control shape -- deliberately not a uniform
                      dropdown across models (see 2026-08-07 resolution-param
                      audit): Topaz is a continuous factor, SeedVR2/FlashVSR
                      are a resolution enum (both always route to WaveSpeed
                      today -- see routeProvider in routes/upscale.js -- so
                      this shows WaveSpeed's own 720p/1080p/2k/4k labels
                      directly, no translation needed for what's actually
                      wired), Bria is a discrete 2x/4x choice, and Sima Lite
                      has no resolution control at all -- only quality, shown
                      with an explicit label so it doesn't read as a broken
                      selector. */}
                  {control?.type === "factor" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, opacity: 0.7 }}>Upscale factor:</span>
                      <input
                        type="range"
                        min={control.min} max={control.max} step={control.step}
                        value={param.upscaleFactor ?? control.default}
                        onChange={(e) => setParam({ upscaleFactor: Number(e.target.value) })}
                        style={{ flex: 1 }}
                      />
                      <span style={{ fontSize: 11, width: 28, textAlign: "right" }}>{param.upscaleFactor ?? control.default}×</span>
                    </div>
                  )}

                  {control?.type === "resolution" && (
                    <select
                      value={param.resolution || control.default}
                      onChange={(e) => setParam({ resolution: e.target.value })}
                      style={{ width: "100%", marginBottom: 6, padding: "4px 8px", borderRadius: 6, fontSize: 12, border: "1px solid rgba(255,255,255,0.12)", background: "var(--onyx-bg)", color: "var(--onyx-text)" }}
                    >
                      {control.values.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  )}

                  {control?.type === "discreteFactor" && (
                    <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                      {control.values.map((v) => (
                        <button
                          key={v}
                          className="sceneSmallBtn"
                          style={{ flex: 1, background: (param.desiredIncrease || control.default) === v ? "rgba(124,58,237,0.3)" : undefined }}
                          onClick={() => setParam({ desiredIncrease: v })}
                        >
                          {v}×
                        </button>
                      ))}
                    </div>
                  )}

                  {control?.type === "quality" && (
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>
                        No resolution control for this model — quality only
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, opacity: 0.7 }}>Quality:</span>
                        <input
                          type="range"
                          min={control.min} max={control.max}
                          value={param.crf ?? control.default}
                          onChange={(e) => setParam({ crf: Number(e.target.value) })}
                          style={{ flex: 1 }}
                        />
                        <span style={{ fontSize: 11, width: 20, textAlign: "right" }}>{param.crf ?? control.default}</span>
                      </div>
                    </div>
                  )}

                  <button
                    className="sceneSmallBtn primary"
                    disabled={!!upscalingScenes[sc.id]}
                    onClick={() => { onUpscaleScene(sc.id, modelId, param); setUpscaleOpen(p => ({ ...p, [sc.id]: false })); }}
                    style={{ width: "100%" }}
                  >
                    Run upscale
                  </button>

                  {/* Keep-both semantics: draftMediaUrl/upscaledMediaUrl are
                      both preserved once an upscale has run -- mediaUrl
                      itself is never touched, so this is purely an informational
                      link to compare, not a "which one is active" switch. */}
                  {sc.upscaledMediaUrl && (
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}>
                      Upscaled version ready — <a href={sc.upscaledMediaUrl} target="_blank" rel="noreferrer" style={{ color: "var(--onyx-cyan)" }}>view</a>
                      {sc.draftMediaUrl && <> · <a href={sc.draftMediaUrl} target="_blank" rel="noreferrer" style={{ color: "var(--onyx-cyan)" }}>view original</a></>}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── Duration ── */}
            {/* Renders from the selected model's real duration spec (see
                GET /api/models/capabilities, backed by VIDEO_MODELS' own
                duration field in kling.js) instead of one hardcoded
                [3,5,8,10] set applied identically to every model -- each
                model's real provider-side range differs (Kling/Wan: {5,10},
                Veo: {4,6,8}, Seedance 1 Pro: 2-12, Seedance 2.0: 4-15, both
                Vidu models: 1-16). Falls back to Kling's own spec (the
                app's default model) during the brief window before
                capabilities have loaded, rather than rendering nothing. */}
            {(() => {
              const spec = durationSpec || { type: "discrete", values: [5, 10], default: 5 };
              return (
                <div
                  style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span style={{ fontSize: 12, opacity: 0.7, marginRight: 2 }}>Duration:</span>
                  {spec.type === "discrete" ? (
                    spec.values.map((s) => (
                      <button
                        key={s}
                        className={"sceneSmallBtn" + ((sc.duration || spec.default) === s ? " primary" : "")}
                        onClick={(e) => { e.stopPropagation(); updateField(sc.id, "duration", s); }}
                        style={{ minWidth: 34 }}
                      >
                        {s}s
                      </button>
                    ))
                  ) : (
                    <>
                      <input
                        type="number"
                        min={spec.min}
                        max={spec.max}
                        step={1}
                        value={Math.min(spec.max, Math.max(spec.min, sc.duration || spec.default))}
                        onChange={(e) => {
                          const v = Math.min(spec.max, Math.max(spec.min, Number(e.target.value) || spec.default));
                          updateField(sc.id, "duration", v);
                        }}
                        style={{
                          width: 52, padding: "4px 6px", borderRadius: 6, fontSize: 12,
                          border: "1px solid rgba(255,255,255,0.15)", background: "var(--onyx-bg)", color: "var(--onyx-text)",
                        }}
                      />
                      <input
                        type="range"
                        min={spec.min}
                        max={spec.max}
                        step={1}
                        value={Math.min(spec.max, Math.max(spec.min, sc.duration || spec.default))}
                        onChange={(e) => updateField(sc.id, "duration", Number(e.target.value))}
                        style={{ flex: 1, maxWidth: 100 }}
                      />
                      <span style={{ fontSize: 11, opacity: 0.6 }}>{spec.min}-{spec.max}s</span>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Veo 3.1 ref2v note: its reference-to-video endpoint has a hard
                fixed 8s duration on fal's own schema (confirmed live,
                routes/kling.js's VEO_3_REF2V_DURATION_SECONDS) -- whatever
                this picker shows above is Veo's normal t2v/i2v spec, still
                real/usable for a plain (no-reference) scene, but silently
                overridden server-side the moment this scene resolves to a
                tagged character reference. Same condition already used
                just below to show/enable the "Reference:" mode select --
                reusing it here rather than a second, possibly-drifting
                check for "does this scene have a resolvable reference." */}
            {regenModel === "veo-3" && parseTaggedNames(sc.action).some((name) =>
              characters.some((c) => normalizeTagName(c.name) === normalizeTagName(name) && (c.character_reference_images || []).length > 0)
            ) && (
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: -4, marginBottom: 8 }} onClick={(e) => e.stopPropagation()}>
                Duration locked to 8s when using a character reference
              </div>
            )}

            {/* ── 1080p upgrade (wan-2.7 only) ── */}
            {/* Real user choice, not a per-model force like wan-2.5's 480p --
                default stays 720p ($0.10/s); checking this sends
                resolution: "1080p" through to getSceneCost (real charge:
                $0.15/s) and the provider payload's resolution field. */}
            {supports1080pUpgrade && (
              <label
                style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 12, cursor: "pointer" }}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={sc.resolution === "1080p"}
                  onChange={(e) => updateField(sc.id, "resolution", e.target.checked ? "1080p" : "720p")}
                />
                Upgrade to 1080p (+50% cost, $0.15/s)
              </label>
            )}

            {/* ── Resolution choice (seedance-2.5 today: real 480p/720p
                enum, distinct from wan-2.7's binary upgrade-toggle above --
                see resolutionOptions' own comment in EditorV2.jsx) ── */}
            {resolutionOptions && (
              <div
                style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}
                onClick={(e) => e.stopPropagation()}
              >
                <span style={{ fontSize: 12, opacity: 0.7, marginRight: 2 }}>Resolution:</span>
                {resolutionOptions.values.map((v) => (
                  <button
                    key={v}
                    className={"sceneSmallBtn" + ((sc.resolution || resolutionOptions.default) === v ? " primary" : "")}
                    onClick={(e) => { e.stopPropagation(); updateField(sc.id, "resolution", v); }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}

            {/* ── Live credit estimate (2026-08-08) -- only shown for the
                active scene, since the estimate fetch is keyed on the
                ACTIVE scene's duration/resolution (see the useEffect above)
                -- showing it on every scene card would either be wrong for
                inactive scenes or require one fetch per scene. Always a
                concrete number (never "auto"): seedance-2.5's duration/
                aspect-ratio pickers never offer "auto" as a value at all
                (2026-08-08 decision), so whatever's currently selected is
                already the exact value that would be billed. ── */}
            {sc.id === activeScene && REGEN_MODEL_OPTIONS.find(o => o.id === regenModel)?.premium && (
              <div style={{ fontSize: 12, marginBottom: 8, opacity: 0.85, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ opacity: 0.6 }}>Estimated cost:</span>
                {estimateLoading ? (
                  <span style={{ opacity: 0.5 }}>calculating…</span>
                ) : estimatedCredits != null ? (
                  <span style={{ fontWeight: 600, color: "#fbbf24" }}>{estimatedCredits} credits</span>
                ) : (
                  <span style={{ opacity: 0.5 }}>unavailable</span>
                )}
              </div>
            )}

            {/* ── Narration (both modes) ── */}
            {/* @Tag support added here alongside action's (character-voice
                auto-assignment build, 2026-08-07): a leading @Tag in
                narration now drives TTS voice lookup at generation time
                (see lib/sceneDefaults.js's applyDefaultVoiceToScenes) --
                analyse.js's system prompt was extended to emit this same
                "@Tag: spoken words" shape when a script attributes a line
                to a specific tagged character. Deliberately NOT gated on
                supportsRefs the way action's CharacterTagTextarea below is
                -- that gate exists because action's tags feed Kling's
                elements[] (a video-model capability), but narration's tags
                only ever drive voice selection, which has nothing to do
                with which video model is selected. Gating this on
                supportsRefs would wrongly disable narration tagging
                whenever a non-refs model (e.g. Wan 2.5) is picked. */}
            {parseLeadingSpeakerTag(sc.narration).length > 0 && (
              <div
                style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}
                onClick={(e) => e.stopPropagation()}
              >
                {parseLeadingSpeakerTag(sc.narration).map((name) => {
                  const known = characters.some((c) => normalizeTagName(c.name) === normalizeTagName(name));
                  return (
                    <span
                      key={name}
                      title={known ? `${name} -- voice applied to this scene's narration if set` : `"${name}" doesn't match a saved character`}
                      style={{
                        fontSize: 11, padding: "2px 7px", borderRadius: 999,
                        background: known ? "rgba(0,210,255,0.15)" : "rgba(248,113,113,0.15)",
                        color: known ? "#00d2ff" : "#f87171",
                        border: `1px solid ${known ? "rgba(0,210,255,0.35)" : "rgba(248,113,113,0.35)"}`,
                      }}
                    >
                      @{name}
                    </span>
                  );
                })}
              </div>
            )}
            <CharacterTagTextarea
              placeholder="Narration"
              value={sc.narration || ""}
              onChange={(text) => updateField(sc.id, "narration", text)}
              onClick={(e) => e.stopPropagation()}
              characters={characters}
            />

            {/* ── AI mode fields ── */}
            {!isStock && (
              <>
                {parseTaggedNames(sc.action).length > 0 && (
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4, opacity: supportsRefs ? 1 : 0.4 }}
                    onClick={(e) => e.stopPropagation()}
                    title={supportsRefs ? undefined : `${REGEN_MODEL_OPTIONS.find(o => o.id === regenModel)?.label || regenModel} doesn't support character reference images -- tags are ignored`}
                  >
                    {parseTaggedNames(sc.action).map((name) => {
                      const known = characters.some((c) => normalizeTagName(c.name) === normalizeTagName(name));
                      return (
                        <span
                          key={name}
                          title={known ? name : `"${name}" doesn't match a saved character`}
                          style={{
                            fontSize: 11, padding: "2px 7px", borderRadius: 999,
                            background: known ? "rgba(0,210,255,0.15)" : "rgba(248,113,113,0.15)",
                            color: known ? "#00d2ff" : "#f87171",
                            border: `1px solid ${known ? "rgba(0,210,255,0.35)" : "rgba(248,113,113,0.35)"}`,
                          }}
                        >
                          @{name}
                        </span>
                      );
                    })}
                  </div>
                )}
                {/* Only surfaced when a tagged character actually has reference
                    photos -- a scene tagging a character with none, or no tag
                    at all, has nothing for this to apply to. Backend precedence
                    (routes/kling.js/resolveTaggedEntities.js): this per-scene
                    value beats the character's own stored default when set;
                    unset (the default, "Use character default") lets each
                    tagged character in the scene fall back to its own setting. */}
                {parseTaggedNames(sc.action).some((name) =>
                  characters.some((c) => normalizeTagName(c.name) === normalizeTagName(name) && (c.character_reference_images || []).length > 0)
                ) && (
                  <div style={{ marginBottom: 4 }} onClick={(e) => e.stopPropagation()}>
                    <select
                      value={sc.referenceMode || ""}
                      onChange={(e) => updateField(sc.id, "referenceMode", e.target.value || null)}
                      disabled={!supportsRefs}
                      title={supportsRefs
                        ? "Whether this scene's tagged character(s) generate from the prompt (Scene Accuracy) or anchor the video to their reference photo (Character Consistency). Defaults to each character's own setting."
                        : `${REGEN_MODEL_OPTIONS.find(o => o.id === regenModel)?.label || regenModel} doesn't support character reference images`}
                      style={{
                        fontSize: 11, padding: "3px 6px", borderRadius: 6,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "var(--onyx-bg)", color: "var(--onyx-text-faint)",
                        opacity: supportsRefs ? 1 : 0.4,
                      }}
                    >
                      <option value="">Reference: use character default</option>
                      <option value="scene_accuracy">Reference: scene accuracy</option>
                      <option value="character_consistency">Reference: character consistency</option>
                    </select>
                  </div>
                )}
                <CharacterTagTextarea
                  placeholder="Action / Background"
                  value={sc.action || ""}
                  onChange={(text) => updateField(sc.id, "action", text)}
                  onClick={(e) => e.stopPropagation()}
                  characters={characters}
                  autocompleteDisabled={!supportsRefs}
                />

                <div
                  style={{
                    marginTop: 8,
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: "var(--onyx-inset)",
                    border: `1px solid ${(sc.sourceImageUrl || "").trim() ? "rgba(0,210,255,0.4)" : "rgba(255,255,255,0.08)"}`,
                    opacity: supportsStartImage ? 1 : 0.4,
                  }}
                  onClick={(e) => e.stopPropagation()}
                  title={supportsStartImage ? undefined : `${REGEN_MODEL_OPTIONS.find(o => o.id === regenModel)?.label || regenModel} doesn't support a start image`}
                >
                  <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>Start Image</div>
                  {(sc.sourceImageUrl || "").trim() && (
                    <div style={{ position: "relative", marginBottom: 8 }}>
                      <img
                        src={sc.sourceImageUrl}
                        alt="Start image"
                        style={{ width: "100%", borderRadius: 6, maxHeight: 100, objectFit: "cover", display: "block" }}
                      />
                      <button
                        onClick={() => updateField(sc.id, "sourceImageUrl", "")}
                        disabled={!supportsStartImage}
                        style={{
                          position: "absolute", top: 4, right: 4, background: "var(--onyx-inset)",
                          border: "none", borderRadius: "50%", color: "#fff", cursor: "pointer",
                          width: 20, height: 20, fontSize: 12, lineHeight: "20px", padding: 0, textAlign: "center",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    <label style={{ display: "inline-block" }}>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        disabled={!supportsStartImage}
                        onChange={(e) => handleUploadSourceImage(sc.id, e.target.files?.[0])}
                      />
                      <span
                        className="sceneSmallBtn"
                        style={{ cursor: supportsStartImage ? "pointer" : "not-allowed", display: "inline-block" }}
                      >
                        {uploadingSourceImage[sc.id] ? "Uploading…" : "Upload image"}
                      </span>
                    </label>
                  </div>
                  <input
                    type="url"
                    value={sc.sourceImageUrl || ""}
                    onChange={(e) => updateField(sc.id, "sourceImageUrl", e.target.value)}
                    placeholder="Or paste a direct image URL"
                    disabled={!supportsStartImage}
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      borderRadius: 6,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "var(--onyx-bg)",
                      color: "var(--onyx-text)",
                      fontSize: 12,
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div
                  style={{
                    marginTop: 8,
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: "var(--onyx-inset)",
                    border: `1px solid ${(sc.endImageUrl || "").trim() ? "rgba(0,210,255,0.4)" : "rgba(255,255,255,0.08)"}`,
                    opacity: supportsEndFrame ? 1 : 0.4,
                  }}
                  onClick={(e) => e.stopPropagation()}
                  title={supportsEndFrame ? undefined : `${REGEN_MODEL_OPTIONS.find(o => o.id === regenModel)?.label || regenModel} doesn't support an end frame`}
                >
                  <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>End Frame URL</div>
                  <input
                    type="url"
                    value={sc.endImageUrl || ""}
                    onChange={(e) => updateField(sc.id, "endImageUrl", e.target.value)}
                    placeholder="https://example.com/end-frame.jpg"
                    disabled={!supportsEndFrame}
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      borderRadius: 6,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "var(--onyx-bg)",
                      color: "var(--onyx-text)",
                      fontSize: 12,
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {sc.mediaType === "video" && (
                  <div
                    style={{ marginTop: 8, padding: 10, border: "0.5px solid var(--onyx-hairline-strong)", borderRadius: 10, background: "var(--onyx-surface)" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Clip Audio</div>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 12 }}>
                      <input
                        type="checkbox"
                        checked={!!sc.sourceAudioMuted}
                        onChange={(e) => updateField(sc.id, "sourceAudioMuted", e.target.checked)}
                      />
                      Mute source clip audio
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={typeof sc.sourceAudioVolume === "number" ? sc.sourceAudioVolume : 100}
                      onChange={(e) => updateField(sc.id, "sourceAudioVolume", Number(e.target.value))}
                      disabled={!!sc.sourceAudioMuted}
                      style={{ width: "100%" }}
                    />
                    <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                      {sc.sourceAudioMuted
                        ? "Muted"
                        : `${typeof sc.sourceAudioVolume === "number" ? sc.sourceAudioVolume : 100}%`}
                    </div>
                  </div>
                )}

                {sc.mediaType === "video" && (
                  <div
                    style={{ marginTop: 8, padding: 10, border: "0.5px solid var(--onyx-hairline-strong)", borderRadius: 10, background: "var(--onyx-surface)", fontSize: 12 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ opacity: 0.8, marginBottom: 6 }}>Trim Clip</div>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      Start: {sc.trimStart ?? 0}s
                      <input
                        type="range"
                        min="0"
                        max={sc.trimEnd ?? 30}
                        step="0.1"
                        value={sc.trimStart ?? 0}
                        onChange={(e) => updateField(sc.id, "trimStart", Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      End: {sc.trimEnd ?? "full"}s
                      <input
                        type="range"
                        min={sc.trimStart ?? 0}
                        max="120"
                        step="0.1"
                        value={sc.trimEnd ?? 30}
                        onChange={(e) => updateField(sc.id, "trimEnd", Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                    </label>
                  </div>
                )}
              </>
            )}

            {/* ── Stock mode fields ── */}
            {isStock && (
              <div onClick={(e) => e.stopPropagation()}>
                {/* Selected media preview */}
                {sc.url && (
                  <div style={{ position: "relative", marginBottom: 10, marginTop: 8 }}>
                    <img
                      src={sc.thumbnail || sc.url}
                      alt="Selected media"
                      style={{ width: "100%", borderRadius: 8, maxHeight: 120, objectFit: "cover", display: "block" }}
                    />
                    <button
                      onClick={() => handleClearMedia(sc.id)}
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        background: "var(--onyx-inset)",
                        border: "none",
                        borderRadius: "50%",
                        color: "#fff",
                        cursor: "pointer",
                        width: 22,
                        height: 22,
                        fontSize: 13,
                        lineHeight: "22px",
                        padding: 0,
                        textAlign: "center",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Pexels search */}
                <div style={{ display: "flex", gap: 6, marginBottom: 8, marginTop: 8 }}>
                  <input
                    type="text"
                    placeholder="Search Pexels videos…"
                    value={stockQuery[sc.id] || ""}
                    onChange={(e) => setStockQuery((prev) => ({ ...prev, [sc.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") handleStockSearch(sc.id); }}
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      borderRadius: 6,
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "var(--onyx-bg)",
                      color: "var(--onyx-text)",
                      fontSize: 12,
                    }}
                  />
                  <button
                    className="sceneSmallBtn primary"
                    disabled={stockSearching[sc.id]}
                    onClick={() => handleStockSearch(sc.id)}
                    style={{ minWidth: 56 }}
                  >
                    {stockSearching[sc.id] ? "…" : "Search"}
                  </button>
                </div>

                {/* Results grid */}
                {(stockResults[sc.id] || []).length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, marginBottom: 8 }}>
                    {(stockResults[sc.id] || []).map((video) => (
                      <div
                        key={video.id}
                        onClick={() => handleSelectStock(sc.id, video)}
                        style={{
                          cursor: "pointer",
                          borderRadius: 6,
                          overflow: "hidden",
                          border: sc.url === video.url ? "2px solid #00d2ff" : "2px solid transparent",
                          aspectRatio: "9/16",
                          background: "var(--onyx-inset)",
                        }}
                      >
                        <img
                          src={video.thumb}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload */}
                <label style={{ display: "inline-block", marginBottom: 4 }}>
                  <input
                    type="file"
                    accept="video/*,image/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleUpload(sc.id, e.target.files?.[0])}
                  />
                  <span className="sceneSmallBtn" style={{ cursor: "pointer", display: "inline-block" }}>
                    {uploadingScene[sc.id] ? "Uploading…" : "Upload file"}
                  </span>
                </label>
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 11, color: "var(--onyx-text-faint)", marginBottom: 4 }}>
                    Or paste a direct video/image URL
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      type="text"
                      placeholder="https://example.com/video.mp4"
                      style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "0.5px solid var(--onyx-hairline-strong)", background: "var(--chip-bg)", color: "var(--onyx-text)", fontSize: 12, fontFamily: "inherit" }}
                      onBlur={e => {
                        const url = e.target.value.trim();
                        if (!url) return;
                        const isVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) || /^https:\/\/api\.sync\.so\//i.test(url);
                        updateScenes(prev => prev.map(s => s.id === sc.id ? {
                          ...s,
                          url,
                          mediaUrl: url,
                          mediaType: isVideo ? "video" : "image",
                          stockSource: "direct",
                          thumbnail: isVideo ? null : url,
                        } : s));
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Captions toggle (both modes) ── */}
            <div
              style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 12 }}
              onClick={(e) => e.stopPropagation()}
            >
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={sc.captionsEnabled ?? true}
                  onChange={(e) => updateField(sc.id, "captionsEnabled", e.target.checked)}
                />
                Show captions on canvas
              </label>
            </div>

            <div className="sceneMetaRow">
              <span className="meta">
                {sc.savedAt ? `Saved: ${new Date(sc.savedAt).toLocaleTimeString()}` : "Not saved"}
              </span>
              <span className="meta">
                {sc.generatedAt
                  ? `Generated: ${new Date(sc.generatedAt).toLocaleTimeString()}`
                  : "Not generated"}
              </span>
              {sc.voiceoverStale ? <span className="meta">Voiceover out of date</span> : null}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
