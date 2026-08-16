import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient.js";
import { getAuthHeaders } from "../utils/auth.js";
import HelpTooltip from "../components/HelpTooltip.jsx";

// ===========================
// CONSTANTS
// ===========================

const GENRES = ["Pop", "Rock", "Hip-Hop", "Electronic", "Jazz", "Classical", "R&B", "Country", "Ambient", "Lo-Fi", "Cinematic", "Corporate", "Funk", "Soul", "Reggae", "Latin", "Trap", "House", "Drum & Bass", "Metal", "Folk", "Blues", "Indie", "Gospel"];
const MOODS = ["Uplifting", "Energetic", "Calm", "Dark", "Romantic", "Mysterious", "Happy", "Sad", "Tense", "Motivational", "Dreamy", "Nostalgic", "Aggressive", "Playful", "Melancholic", "Euphoric", "Groovy", "Ethereal"];
const INSTRUMENTS = ["Piano", "Guitar", "Drums", "Bass", "Strings", "Synth", "Brass", "Flute", "Violin", "Percussion", "Electric Guitar", "Acoustic Guitar", "Saxophone", "Trumpet", "Cello", "808 Bass", "Harp", "Ukulele"];
const KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const TIME_SIGS = ["4/4", "3/4", "6/8", "2/4", "5/4"];
const LIB_MOODS = ["all", "uplifting", "calm", "cinematic", "energetic", "dramatic", "romantic", "motivational", "dark", "happy", "sad", "peaceful", "indie", "corporate", "lo-fi"];
const LIB_GENRES = ["all", "corporate", "ambient", "cinematic", "electronic", "storytelling", "upbeat"];

const GENRE_PROMPTS = {
  "Pop": "catchy pop, bright synths, upbeat energy, radio-ready hooks",
  "Rock": "driving rock, electric guitar, powerful drums, energetic riffs",
  "Hip-Hop": "hip-hop beat, punchy 808 bass, crisp snares, urban groove",
  "Electronic": "modern electronic, pulsing synths, four-on-the-floor beat, clean production",
  "Jazz": "smooth jazz, walking bass, brushed drums, mellow saxophone",
  "Classical": "orchestral classical, strings, grand piano, dynamic arrangement",
  "R&B": "soulful R&B, warm bass, smooth melody, laid-back groove",
  "Country": "acoustic country, fingerpicked guitar, warm vocals, heartfelt storytelling",
  "Ambient": "atmospheric ambient, soft pads, gentle textures, peaceful and meditative",
  "Lo-Fi": "lo-fi hip hop, vinyl crackle, mellow piano, relaxed study beats",
  "Cinematic": "epic cinematic, full orchestra, emotional build, powerful and dramatic",
  "Corporate": "uplifting corporate, clean piano, moderate tempo, professional and motivating",
  "Funk": "funky groove, slap bass, wah guitar, tight rhythm section",
  "Soul": "soulful warm organ, emotional melody, classic soul production",
  "Reggae": "reggae rhythm, off-beat skank guitar, deep bass, laid-back groove",
  "Latin": "latin percussion, acoustic guitar, passionate and rhythmic, warm energy",
  "Trap": "trap beat, heavy 808 bass, rolling hi-hat patterns, dark atmospheric",
  "House": "house music, four-on-the-floor kick, deep bassline, hypnotic groove",
  "Drum & Bass": "drum and bass, fast breakbeats, heavy sub-bass, intense energy",
  "Metal": "heavy metal, distorted guitars, double kick drums, powerful and aggressive",
  "Folk": "acoustic folk, fingerpicked guitar, warm and intimate, heartfelt storytelling",
  "Blues": "blues guitar, 12-bar progression, soulful bends, expressive and emotional",
  "Indie": "indie rock, jangly guitars, lo-fi production, authentic alternative feel",
  "Gospel": "gospel choir, Hammond organ, uplifting spiritual energy, powerful and joyful",
};

const PROMPT_SUGGESTIONS = [
  "Chill lo-fi study beats with vinyl crackle",
  "Epic trailer music with full orchestra",
  "Upbeat corporate background for product launch",
  "Late night jazz with piano and double bass",
  "High energy trap beat for hype reels",
  "Peaceful meditation with soft piano and nature sounds",
  "Romantic string quartet for wedding video",
  "Funky 70s groove for food content",
  "Dark cinematic tension for mystery content",
  "Bright summer pop for lifestyle reels",
];

const INSPIRE_COMBOS = [
  { genre: "Lo-Fi", mood: "Calm", instruments: ["Piano", "Drums"], prompt: "lo-fi hip hop, rainy day, mellow piano, nostalgic and cozy" },
  { genre: "Cinematic", mood: "Motivational", instruments: ["Strings", "Percussion"], prompt: "epic cinematic build, powerful strings, triumphant and inspiring" },
  { genre: "Electronic", mood: "Energetic", instruments: ["Synth", "Bass", "Drums"], prompt: "high energy electronic, driving synths, festival ready, euphoric drop" },
  { genre: "Jazz", mood: "Romantic", instruments: ["Piano", "Bass"], prompt: "intimate jazz, candlelit atmosphere, gentle piano, late night romance" },
  { genre: "Corporate", mood: "Uplifting", instruments: ["Piano", "Strings"], prompt: "uplifting corporate, clean modern production, confident and professional" },
  { genre: "Ambient", mood: "Mysterious", instruments: ["Synth", "Strings"], prompt: "dark ambient, mysterious textures, cinematic tension, ethereal pads" },
  { genre: "Hip-Hop", mood: "Energetic", instruments: ["Bass", "Drums"], prompt: "trap beat, hard-hitting 808s, crisp hi-hats, hype energy" },
  { genre: "Classical", mood: "Calm", instruments: ["Piano", "Violin"], prompt: "solo piano, peaceful classical, gentle melody, meditative and serene" },
];

function formatDuration(secs) {
  const n = Math.round(Number(secs) || 0);
  if (!n) return "";
  const m = Math.floor(n / 60);
  const s = n % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

function applyTrackToEditor(track, reelKey = "onyx_editor_autosave_v2") {
  try {
    const raw = localStorage.getItem(reelKey);
    const existing = raw ? JSON.parse(raw) : {};
    localStorage.setItem(reelKey, JSON.stringify({
      ...existing,
      globalMusicUrl: track.url,
      globalMusicName: track.name || track.title || "",
      musicVolume: existing.musicVolume ?? 60,
      savedAt: new Date().toISOString(),
    }));
  } catch {}
}

const STEM_META = {
  vocals:       { label: "Vocals",       color: "#f472b6" },
  drums:        { label: "Drums",        color: "#fb923c" },
  bass:         { label: "Bass",         color: "#7de0ff" },
  melody:       { label: "Melody",       color: "#2dd4bf" },
  instrumental: { label: "Instrumental", color: "#4ade80" },
};

// ===========================
// AUDIO PREVIEW COMPONENT
// ===========================

function AudioPreview({ src, volume = 70 }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (ref.current) ref.current.volume = volume / 100;
  }, [volume]);

  useEffect(() => {
    setPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  }, [src]);

  function toggle() {
    if (!ref.current) return;
    if (playing) { ref.current.pause(); setPlaying(false); }
    else { ref.current.play().catch(() => {}); setPlaying(true); }
  }

  function fmt(s) {
    const n = Math.round(s || 0);
    return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
  }

  if (!src) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--onyx-bg)", border: "1px solid var(--onyx-hairline-strong)", borderRadius: 8, padding: "8px 12px" }}>
      <audio ref={ref} src={src}
        onTimeUpdate={() => { setCurrentTime(ref.current.currentTime); setProgress(ref.current.duration ? ref.current.currentTime / ref.current.duration : 0); }}
        onLoadedMetadata={() => setDuration(ref.current.duration)}
        onEnded={() => { setPlaying(false); setProgress(0); setCurrentTime(0); }}
        style={{ display: "none" }} />
      <button onClick={toggle} style={{ width: 30, height: 30, borderRadius: "50%", background: "#4dd0ff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {playing
          ? <svg width="10" height="12" viewBox="0 0 10 12" fill="white"><rect x="0" y="0" width="3" height="12" /><rect x="7" y="0" width="3" height="12" /></svg>
          : <svg width="10" height="12" viewBox="0 0 10 12" fill="white"><polygon points="0,0 10,6 0,12" /></svg>}
      </button>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ height: 3, background: "var(--onyx-surface-2)", borderRadius: 2, overflow: "hidden", cursor: "pointer" }}
          onClick={e => {
            if (!ref.current?.duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            ref.current.currentTime = ((e.clientX - rect.left) / rect.width) * ref.current.duration;
          }}>
          <div style={{ height: "100%", width: `${progress * 100}%`, background: "linear-gradient(90deg, #4dd0ff, #ec4899)", borderRadius: 2, transition: "width 0.1s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, color: "var(--onyx-text-dim)" }}>{fmt(currentTime)}</span>
          <span style={{ fontSize: 10, color: "var(--onyx-text-dim)" }}>{fmt(duration)}</span>
        </div>
      </div>
    </div>
  );
}

// ===========================
// TRACK CARD COMPONENT
// ===========================

function TrackCard({ track, onApply, onSave, onExtend, onRename, onUseInTools, appliedId, savedIds = [], saving = false, extending = false, extendStatus = "" }) {
  const applied = appliedId === (track.id || track.url);
  const saved = savedIds.includes(track.id);
  const [editing, setEditing] = useState(false);
  const [localName, setLocalName] = useState(track.name || track.title || "Track");

  const commitRename = () => {
    setEditing(false);
    const trimmed = localName.trim() || track.name || track.title || "Track";
    setLocalName(trimmed);
    if (onRename && trimmed !== (track.name || track.title)) onRename(track.id, trimmed);
  };

  return (
    <div style={{ background: "var(--onyx-bg-2)", border: `1px solid ${applied ? "#4dd0ff" : "#1f2937"}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <input
              autoFocus
              value={localName}
              onChange={e => setLocalName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") { setLocalName(track.name || track.title || "Track"); setEditing(false); } }}
              style={{ width: "100%", background: "var(--onyx-surface)", border: "1px solid #4dd0ff", borderRadius: 6, padding: "3px 8px", fontSize: 14, fontWeight: 700, color: "var(--onyx-text)", outline: "none" }}
            />
          ) : (
            <div
              onClick={() => onRename && setEditing(true)}
              title={onRename ? "Click to rename" : undefined}
              style={{ fontWeight: 700, fontSize: 14, color: "var(--onyx-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: onRename ? "text" : "default" }}>
              {localName}
            </div>
          )}
          {track.description && <div style={{ fontSize: 12, color: "var(--onyx-text-dim)", marginTop: 2, lineHeight: 1.4 }}>{track.description}</div>}
        </div>
        {formatDuration(track.duration) && (
          <span style={{ fontSize: 11, color: "var(--onyx-text-dim)", padding: "3px 8px", background: "var(--onyx-surface)", borderRadius: 20, flexShrink: 0 }}>
            {formatDuration(track.duration)}
          </span>
        )}
      </div>

      {(track.mood || track.genre) && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {track.mood && <span style={{ fontSize: 11, color: "#7de0ff", padding: "2px 8px", background: "rgba(77,208,255,0.12)", border: "1px solid rgba(77,208,255,0.2)", borderRadius: 20 }}>{track.mood}</span>}
          {track.genre && <span style={{ fontSize: 11, color: "#60a5fa", padding: "2px 8px", background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.2)", borderRadius: 20 }}>{track.genre}</span>}
        </div>
      )}

      <AudioPreview src={track.url} />

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {onSave && (
          <button onClick={() => onSave(track)} disabled={saved || saving}
            style={{ flex: 1, padding: "6px 8px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: saved ? "default" : "pointer", background: saved ? "rgba(34,197,94,0.1)" : "#1f2937", border: saved ? "1px solid #22c55e" : "1px solid var(--onyx-hairline-strong)", color: saved ? "#4ade80" : "#94a3b8" }}>
            {saved ? "✓ Saved" : saving ? "..." : "💾 Save"}
          </button>
        )}
        <a href={track.url} download={`${track.name || "track"}.mp3`} target="_blank" rel="noreferrer"
          style={{ flex: 1, padding: "6px 8px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "var(--onyx-surface-2)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text-dim)", textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
          ⬇ Download
        </a>
        {onExtend && (
          <button onClick={() => onExtend(track)} disabled={extending}
            style={{ flex: 1, padding: "6px 8px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: extending ? "not-allowed" : "pointer", background: "var(--onyx-surface-2)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text)" }}>
            {extending ? "⏳" : "🔁 Extend"}
          </button>
        )}
        <button onClick={() => onApply(track)}
          style={{ flex: 1, padding: "6px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", background: applied ? "rgba(77,208,255,0.2)" : "var(--onyx-surface-2)", border: applied ? "1px solid var(--onyx-cyan)" : "1px solid var(--onyx-hairline-strong)", color: applied ? "var(--onyx-cyan)" : "var(--onyx-text)" }}>
          {applied ? "✓ Applied" : "Apply"}
        </button>
        {onUseInTools && (
          <button onClick={() => onUseInTools(track)}
            style={{ flex: 1, padding: "6px 8px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "var(--onyx-surface-2)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text)" }}>
            🎛️ Tools
          </button>
        )}
      </div>
      {extendStatus && <div style={{ marginTop: 6, fontSize: 11, color: "#60a5fa" }}>{extendStatus}</div>}
    </div>
  );
}

// ===========================
// MAIN COMPONENT
// ===========================

export default function Music() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [tab, setTab] = useState("generate");

  // Generate state
  const [prompt, setPrompt] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [selectedInstruments, setSelectedInstruments] = useState([]);
  const [bpm, setBpm] = useState(120);
  const [selectedKey, setSelectedKey] = useState("");
  const [timeSig, setTimeSig] = useState("4/4");
  const [vocalsMode, setVocalsMode] = useState("off");
  const [lyrics, setLyrics] = useState("");
  const [soundsLike, setSoundsLike] = useState("");
  const [generating, setGenerating] = useState(false);
  const [hasSunoKey, setHasSunoKey] = useState(false);
  const [lyriaCost, setLyriaCost] = useState(15); // matches getMusicCredits' non-premium default until the real cost loads
  const [genStatus, setGenStatus] = useState("");
  const [genError, setGenError] = useState("");
  const [generatedTracks, setGeneratedTracks] = useState([]);
  const pollRef = useRef(null);
  const [extendingId, setExtendingId] = useState(null);
  const [extendStatus, setExtendStatus] = useState({});

  // ── AI Rapper (MiniMax Music 2.0) ──────────────────────────────────────────
  const [rapTopic, setRapTopic] = useState("");
  const [rapMood, setRapMood] = useState("");
  const [rapLengthTier, setRapLengthTier] = useState("standard");
  const [rapLyricsLoading, setRapLyricsLoading] = useState(false);
  const [rapLyricsError, setRapLyricsError] = useState("");
  const [rapDraft, setRapDraft] = useState(null); // { style_prompt, lyrics_prompt, estimated_seconds }
  const [rapGenerating, setRapGenerating] = useState(false);
  const [rapGenStatus, setRapGenStatus] = useState("");
  const [rapGenError, setRapGenError] = useState("");
  const [rapGeneratedTracks, setRapGeneratedTracks] = useState([]);
  const extendPollRef = useRef(null);

  // Library state
  const [libTracks, setLibTracks] = useState([]);
  const [libLoading, setLibLoading] = useState(false);
  const [libError, setLibError] = useState("");
  const [libSearch, setLibSearch] = useState("");
  const [moodFilter, setMoodFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");

  // Saved state
  const [savedTracks, setSavedTracks] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedIds, setSavedIds] = useState([]);
  const [savingId, setSavingId] = useState(null);

  // Applied
  const [appliedId, setAppliedId] = useState(null);
  const [applyMsg, setApplyMsg] = useState("");

  // Fadr Tools state
  const [fadrFile, setFadrFile] = useState(null);
  const [fadrFileUrl, setFadrFileUrl] = useState("");
  const [fadrDuration, setFadrDuration] = useState(null); // seconds, null = unknown
  const [fadrOp, setFadrOp] = useState(null); // "analyse" | "stems" | "instrumental"
  const [fadrLoading, setFadrLoading] = useState(false);
  const [fadrResult, setFadrResult] = useState(null);
  const [fadrError, setFadrError] = useState("");
  // Stem reel picker
  const [showStemReelPicker, setShowStemReelPicker] = useState(false);
  const [stemSending, setStemSending] = useState(false);
  const [sentConfirm, setSentConfirm] = useState(null); // { reelId, reelName }
  const [resolvedStems, setResolvedStems] = useState(null);
  const [loadingReels, setLoadingReels] = useState(false);

  useEffect(() => {
    if (fadrResult?.op !== 'stems') return;
    const stems = Object.entries(STEM_META)
      .filter(([k]) => fadrResult[k])
      .map(([k, m]) => ({ type: k, url: fadrResult[k], duration: fadrResult.duration || 180, label: m.label, color: m.color }));
    if (stems.length) setResolvedStems(stems);
  }, [fadrResult]);

  async function handleOpenReelPicker() {
    setLoadingReels(true);
    setShowStemReelPicker(true);
    try {
      const r = await fetch('/api/reels', { headers: await getAuthHeaders() });
      const data = await r.json();
      setReels(Array.isArray(data) ? data : (data.reels || []));
    } catch (e) {
      console.error('Failed to load reels', e);
    } finally {
      setLoadingReels(false);
    }
  }

  async function handleAssignToReel(reelId, reelName) {
    if (!resolvedStems?.length) return;
    setStemSending(true);
    try {
      const res = await fetch(`/api/reels/${reelId}/stems`, {
        method: 'POST',
        headers: { ...await getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ stems: resolvedStems }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      sessionStorage.setItem('onyx_pending_stems', JSON.stringify({ reelId, stems: resolvedStems }));
      setShowStemReelPicker(false);
      setSentConfirm({ reelId, reelName });
    } catch (e) {
      alert('Failed to assign stems to reel. Please try again.');
    } finally {
      setStemSending(false);
    }
  }

  // Reel picker
  const [showReelPicker, setShowReelPicker] = useState(false);
  const [reels, setReels] = useState([]);
  const [pendingApplyTrack, setPendingApplyTrack] = useState(null);
  const [reelSearch, setReelSearch] = useState('');
  const [appliedReelId, setAppliedReelId] = useState(null);

  useEffect(() => {
  }, [showReelPicker, pendingApplyTrack]);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { setSessionLoading(false); navigate("/login"); return; }
      setSession(data.session);
      setSessionLoading(false);
    }).catch(() => { setSessionLoading(false); navigate("/login"); });
  }, []);

  useEffect(() => {
    if (!session) return;
    fetch("/api/suno/key", { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.has_key) setHasSunoKey(true); })
      .catch(() => {});
  }, [session]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/music/cost", { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (typeof d?.cost === "number") setLyriaCost(d.cost); })
      .catch(() => {});
  }, [session]);

  useEffect(() => {
    if (!sessionLoading) {
      loadSaved();
      if (tab === "library") loadLibrary();
    }
  }, [sessionLoading, tab]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); if (extendPollRef.current) clearInterval(extendPollRef.current); }, []);

  // ===========================
  // LIBRARY
  // ===========================

  const loadLibrary = useCallback(async (q = libSearch, mood = moodFilter, genre = genreFilter) => {
    setLibLoading(true);
    setLibError("");
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.append("q", q.trim());
      if (mood !== "all") params.append("mood", mood);
      if (genre !== "all") params.append("genre", genre);
      const res = await fetch(`/api/music/stock?${params}`, { headers: await getAuthHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setLibTracks(Array.isArray(data.tracks) ? data.tracks : []);
    } catch (err) {
      setLibError(err.message);
      setLibTracks([]);
    } finally {
      setLibLoading(false);
    }
  }, [libSearch, moodFilter, genreFilter]);

  // ===========================
  // SAVED
  // ===========================

  const loadSaved = async () => {
    setSavedLoading(true);
    try {
      const res = await fetch("/api/music/saved", { headers: await getAuthHeaders() });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data?.tracks)) {
        setSavedTracks(data.tracks);
        setSavedIds(data.tracks.map(t => t.id));
      }
    } catch (_) {}
    setSavedLoading(false);
  };

  const renameTrack = async (id, name) => {
    setSavedTracks(prev => prev.map(t => t.id === id ? { ...t, name } : t));
    try {
      await fetch(`/api/music/saved/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...await getAuthHeaders() },
        body: JSON.stringify({ name }),
      });
    } catch (_) {}
  };

  const saveTrack = async (track) => {
    setSavingId(track.id);
    try {
      const res = await fetch("/api/music/save", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...await getAuthHeaders() },
        body: JSON.stringify({
          id: track.id,
          name: track.name || track.title || "AI Track",
          prompt: track.prompt || prompt,
          duration: track.duration || 0,
          url: track.url,
          image_url: track.image_url || null,
          song_id: track.song_id || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('SAVE FAILED:', res.status, data);
        setGenError(`Save failed: ${data?.error || res.status}`);
      } else {
        setSavedIds(prev => [...prev, track.id]);
        loadSaved();
      }
    } catch (err) {
      console.error('SAVE ERROR:', err);
      setGenError(`Save error: ${err.message}`);
    }
    setSavingId(null);
  };

  // ── AI Rapper handlers ──────────────────────────────────────────────────────
  // Two-step deliberately: lyrics generation is a cheap/free GPT call the user
  // can re-roll or hand-edit before spending credits on the actual (paid)
  // audio generation below.
  const generateRapLyrics = async () => {
    if (!rapTopic.trim()) { setRapLyricsError("Enter a topic first"); return; }
    setRapLyricsLoading(true);
    setRapLyricsError("");
    try {
      const res = await fetch("/api/music/generate-rap-lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...await getAuthHeaders() },
        body: JSON.stringify({ topic: rapTopic, mood: rapMood, lengthTier: rapLengthTier }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setRapLyricsError(data?.error || `Failed (${res.status})`); setRapLyricsLoading(false); return; }
      setRapDraft(data);
    } catch (err) {
      setRapLyricsError(err.message);
    }
    setRapLyricsLoading(false);
  };

  const generateRapTrack = async () => {
    if (!rapDraft?.style_prompt || !rapDraft?.lyrics_prompt) return;
    setRapGenerating(true);
    setRapGenError("");
    // MiniMax generation has run 50-90s+ in testing — set expectations up front
    // rather than a bare spinner with no context.
    setRapGenStatus("Generating your track — this usually takes 1-2 minutes... ⏳");
    try {
      const res = await fetch("/api/music/generate-rap", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...await getAuthHeaders() },
        body: JSON.stringify({ style_prompt: rapDraft.style_prompt, lyrics_prompt: rapDraft.lyrics_prompt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRapGenError(data?.error || `Failed (${res.status})`);
        setRapGenerating(false);
        setRapGenStatus("");
        return;
      }
      // Actual (ffprobed) duration ships on data.track.duration and renders via
      // TrackCard's existing duration badge — surfaced here before the user
      // can Apply it to a reel, since generated length reliably differs from
      // whatever the lengthTier implied (verified live: 74s/64s/96s across 3
      // identical-prompt runs). No auto-retry-to-target-length: that would
      // burn credits with no guarantee of converging, since the variance
      // comes from the model's own discrete chorus-repeat/ad-lib choices, not
      // a continuous knob. The user decides — accept, or hit Regenerate below.
      setRapGeneratedTracks(prev => [data.track, ...prev]);
      setRapGenStatus("");
    } catch (err) {
      setRapGenError(err.message);
      setRapGenStatus("");
    }
    setRapGenerating(false);
  };

  // ===========================
  // APPLY + REEL PICKER
  // ===========================

  const loadReels = async () => {
    try {
      const res = await fetch("/api/reels", { headers: await getAuthHeaders() });
      const data = await res.json().catch(() => []);
      setReels(Array.isArray(data) ? data : []);
    } catch (_) { setReels([]); }
  };

  function applyTrack(track) {
    setPendingApplyTrack(track);
    setAppliedReelId(null);
    loadReels();
    setShowReelPicker(true);
  }

  async function handleAssignStemsToReel(reel) {
    try {
      const res = await fetch(`/api/reels/${reel.id}/stems`, {
        method: 'POST',
        headers: { ...(await getAuthHeaders()), 'Content-Type': 'application/json' },
        body: JSON.stringify({ stems: resolvedStems }),
      });
      if (!res.ok) throw new Error('Failed');
      sessionStorage.setItem('onyx_pending_stems', JSON.stringify({ reelId: reel.id, stems: resolvedStems }));
      setSentConfirm({ reelId: reel.id, reelName: reel.title || 'Untitled Reel' });
    } catch {
      alert('Failed to assign stems. Please try again.');
    }
  }

  async function confirmApplyToReel(reel) {
    if (!pendingApplyTrack) return;
    if (pendingApplyTrack?.isStems) {
      setShowReelPicker(false);
      setPendingApplyTrack(null);
      try {
        const res = await fetch(`/api/reels/${reel.id}/stems`, {
          method: 'POST',
          headers: { ...(await getAuthHeaders()), 'Content-Type': 'application/json' },
          body: JSON.stringify({ stems: resolvedStems }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        sessionStorage.setItem('onyx_pending_stems', JSON.stringify({ reelId: reel.id, stems: resolvedStems }));
        setSentConfirm({ reelId: reel.id, reelName: reel.title || 'Untitled Reel' });
      } catch (e) {
        alert(`Failed to assign stems: ${e.message}`);
      }
      return;
    }
    const reelKey = `onyx_editor_autosave_${reel.id}`;
    applyTrackToEditor(pendingApplyTrack, reelKey);
    setAppliedId(pendingApplyTrack.id || pendingApplyTrack.url);
    setAppliedReelId(reel.id);
    setApplyMsg(`"${pendingApplyTrack.name || pendingApplyTrack.title || "Track"}" applied to "${reel.title || "Reel"}" — open the Editor to use it.`);
    setTimeout(() => {
      setApplyMsg("");
      setShowReelPicker(false);
      setPendingApplyTrack(null);
      setAppliedReelId(null);
    }, 1400);
  }

  function saveAndClose() {
    if (!pendingApplyTrack) return;
    saveTrack(pendingApplyTrack);
    setShowReelPicker(false);
    setPendingApplyTrack(null);
  }

  // ===========================
  // INSPIRE ME
  // ===========================

  function handleInspire() {
    const combo = INSPIRE_COMBOS[Math.floor(Math.random() * INSPIRE_COMBOS.length)];
    setSelectedGenre(combo.genre);
    setSelectedMoods([combo.mood]);
    setSelectedInstruments(combo.instruments);
    setPrompt(combo.prompt);
    setGenError("");
  }

  // ===========================
  // GENERATE
  // ===========================

  function handleGenreClick(g) {
    const next = selectedGenre === g ? "" : g;
    setSelectedGenre(next);
    if (next && GENRE_PROMPTS[next] && !prompt) setPrompt(GENRE_PROMPTS[next]);
  }

  const handleGenerate = async () => {
    if (!prompt && !selectedGenre && !selectedMoods.length) {
      setGenError("Enter a prompt, genre or mood to generate music.");
      return;
    }
    setGenerating(true);
    setGenError("");
    setGenStatus("Generating with Lyria 3 Pro... (~30–60 seconds) ⏳");

    const payload = {
      prompt,
      genre: selectedGenre,
      mood: selectedMoods.join(", "),
      instruments: selectedInstruments.join(", "),
      bpm,
      key: selectedKey,
      time_signature: timeSig,
      vocals: vocalsMode,
      lyrics: vocalsMode === "on" ? lyrics : "",
      sounds_like: soundsLike,
    };

    try {
      // Try Lyria 3 Pro first
      const lyriaRes = await fetch("/api/music/generate-lyria", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...await getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const lyriaData = await lyriaRes.json().catch(() => ({}));

      if (lyriaRes.ok && lyriaData?.status === "completed" && lyriaData?.tracks?.length) {
        setGeneratedTracks(prev => [...lyriaData.tracks, ...prev]);
        setGenStatus(`✓ ${lyriaData.tracks.length} track${lyriaData.tracks.length > 1 ? "s" : ""} generated with Lyria 3 Pro!`);
        setGenerating(false);
        return;
      }

      if (lyriaRes.status === 402) {
        setGenError(lyriaData?.error || "Insufficient credits");
        setGenerating(false);
        setGenStatus("");
        return;
      }

      // Fall back to Suno/EvoLink
      console.warn("Lyria failed, falling back to Suno:", lyriaData?.error);
      setGenStatus("Falling back to Suno... ⏳");
      const res = await fetch("/api/music/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...await getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setGenError(data?.error || `Failed (${res.status})`); setGenerating(false); setGenStatus(""); return; }

      const taskId = data?.taskId;
      if (!taskId) { setGenError("No task ID returned."); setGenerating(false); setGenStatus(""); return; }

      setGenStatus("Generating music... this takes ~30–60 seconds ⏳");
      pollRef.current = setInterval(() => pollStatus(taskId), 4000);
    } catch (err) {
      setGenError(err?.message || "Generation failed.");
      setGenerating(false);
      setGenStatus("");
    }
  };

  const pollStatus = async (taskId) => {
    try {
      const res = await fetch(`/api/music/generate/status/${taskId}`, { headers: await getAuthHeaders() });
      const data = await res.json().catch(() => ({}));
      if (data?.status === "completed" && Array.isArray(data?.tracks) && data.tracks.length) {
        clearInterval(pollRef.current);
        setGeneratedTracks(prev => [...data.tracks, ...prev]);
        setGenStatus(`✓ ${data.tracks.length} track${data.tracks.length > 1 ? "s" : ""} generated!`);
        setGenerating(false);
      } else if (data?.status === "failed") {
        clearInterval(pollRef.current);
        setGenError(data?.error || "Generation failed.");
        setGenStatus("");
        setGenerating(false);
      } else if (data?.status === "processing") {
        setGenStatus("AI is composing your track... ⏳");
      }
    } catch (_) {
      clearInterval(pollRef.current);
      setGenError("Status check failed.");
      setGenerating(false);
    }
  };

  const handleExtend = async (track) => {
    if (!track.taskId && !track.song_id) {
      alert("This track cannot be extended — no Udio song ID available.");
      return;
    }
    const songId = track.song_id || track.taskId;
    setExtendingId(track.id);
    setExtendStatus(prev => ({ ...prev, [track.id]: "Extending track..." }));

    try {
      const res = await fetch("/api/music/extend", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...await getAuthHeaders() },
        body: JSON.stringify({ song_id: songId, prompt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setExtendStatus(prev => ({ ...prev, [track.id]: data?.error || "Failed" })); setExtendingId(null); return; }

      const taskId = data?.taskId;
      setExtendStatus(prev => ({ ...prev, [track.id]: "Generating extended version... ⏳" }));

      const poll = setInterval(async () => {
        try {
          const sr = await fetch(`/api/music/generate/status/${taskId}`, { headers: await getAuthHeaders() });
          const sd = await sr.json().catch(() => ({}));
          if (sd?.status === "completed" && sd?.tracks?.length) {
            clearInterval(poll);
            setGeneratedTracks(prev => [...sd.tracks, ...prev]);
            setExtendStatus(prev => ({ ...prev, [track.id]: `✓ Extended! ${sd.tracks.length} new version${sd.tracks.length > 1 ? "s" : ""} added above.` }));
            setExtendingId(null);
          } else if (sd?.status === "failed") {
            clearInterval(poll);
            setExtendStatus(prev => ({ ...prev, [track.id]: "Extension failed." }));
            setExtendingId(null);
          }
        } catch (_) {}
      }, 4000);
      extendPollRef.current = poll;
    } catch (err) {
      setExtendStatus(prev => ({ ...prev, [track.id]: err.message }));
      setExtendingId(null);
    }
  };

  // ===========================
  // STYLES
  // ===========================

  const chipStyle = (active) => ({
    padding: "5px 11px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
    border: active ? "1px solid #4dd0ff" : "1px solid var(--onyx-hairline-strong)",
    background: active ? "rgba(77,208,255,0.2)" : "rgba(255,255,255,0.03)",
    color: active ? "#7de0ff" : "var(--onyx-text-dim)",
    transition: "all 0.15s", userSelect: "none",
  });

  const sectionLabel = { fontSize: 11, color: "var(--onyx-text-faint)", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8, marginTop: 16 };
  const inputStyle = { width: "100%", background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text)", borderRadius: 8, padding: "10px 14px", fontSize: 13, boxSizing: "border-box", outline: "none" };
  const filterChip = (active) => ({ padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer", background: active ? "rgba(77,208,255,0.2)" : "var(--onyx-surface)", border: active ? "1px solid #4dd0ff" : "1px solid var(--onyx-hairline-strong)", color: active ? "#7de0ff" : "var(--onyx-text-dim)" });

  if (sessionLoading) return (
    <div style={{ minHeight: "100vh", background: "var(--onyx-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--onyx-text-dim)", fontSize: 14 }}>Loading...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--onyx-bg)", color: "var(--onyx-text)", padding: "40px 24px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 className="page-title">
              Music Studio
            </h1>
            <HelpTooltip topic="music" />
          </div>
          <p style={{ color: "var(--onyx-text-dim)", margin: 0, fontSize: 14 }}>
            Generate original AI music, browse the library, or hum into your mic to create a song.
          </p>
        </div>

        {/* Apply toast */}
        {applyMsg && (
          <div style={{ marginBottom: 20, padding: "12px 16px", background: "rgba(77,208,255,0.12)", border: "1px solid rgba(77,208,255,0.3)", borderRadius: 10, fontSize: 13, color: "#7de0ff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>✓ {applyMsg}</span>
            <button onClick={() => navigate("/editor")} style={{ background: "#4dd0ff", border: "none", color: "var(--onyx-text)", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Open Editor →
            </button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 32, background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", borderRadius: 10, padding: 4 }}>
          {[
            { id: "generate", label: "Generate" },
            { id: "rapper", label: "AI Rapper" },
            { id: "library", label: "Music Library" },
            { id: "saved", label: "My Music" },
            { id: "tools", label: "Tools" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex: 1, padding: "9px 8px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", background: tab === t.id ? "#1f2937" : "transparent", border: "none", color: tab === t.id ? "#f1f5f9" : "#475569", transition: "all 0.15s" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ======================== GENERATE TAB ======================== */}
        {tab === "generate" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, alignItems: "start" }}>

            {/* Left — controls */}
            <div>
              {/* Inspire Me */}
              <button onClick={handleInspire}
                style={{ width: "100%", marginBottom: 16, padding: "11px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", background: "rgba(236,72,153,0.08)", border: "1px dashed rgba(236,72,153,0.4)", color: "#f472b6" }}>
                🎲 Inspire Me — Random Style
              </button>

              {/* Prompt */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, ...sectionLabel }}>
                Describe your music
                <HelpTooltip topic="lyria" />
              </div>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                placeholder="e.g. Upbeat corporate track for a product launch video, clean piano, modern feel..."
                rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                {PROMPT_SUGGESTIONS.map(s => (
                  <span key={s} onClick={() => setPrompt(s)}
                    style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, cursor: "pointer", background: "rgba(255,255,255,0.04)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text-faint)", userSelect: "none" }}>
                    {s}
                  </span>
                ))}
              </div>

              {/* Genre */}
              <div style={sectionLabel}>Genre</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {GENRES.map(g => (
                  <span key={g} style={chipStyle(selectedGenre === g)} onClick={() => handleGenreClick(g)}>{g}</span>
                ))}
              </div>

              {/* Mood */}
              <div style={sectionLabel}>Mood</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {MOODS.map(m => (
                  <span key={m} style={chipStyle(selectedMoods.includes(m))} onClick={() => setSelectedMoods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])}>{m}</span>
                ))}
              </div>

              {/* Instruments */}
              <div style={sectionLabel}>Instruments</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {INSTRUMENTS.map(i => (
                  <span key={i} style={chipStyle(selectedInstruments.includes(i))} onClick={() => setSelectedInstruments(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}>{i}</span>
                ))}
              </div>

              {/* BPM + Key + Time */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--onyx-text-faint)", marginBottom: 6 }}>BPM: {bpm}</div>
                  <input type="range" min="60" max="200" step="1" value={bpm} onChange={e => setBpm(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--onyx-cyan)" }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--onyx-text-faint)", marginBottom: 6 }}>Key</div>
                  <select value={selectedKey} onChange={e => setSelectedKey(e.target.value)} style={{ ...inputStyle, padding: "7px 10px" }}>
                    <option value="">Any</option>
                    {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--onyx-text-faint)", marginBottom: 6 }}>Time Sig</div>
                  <select value={timeSig} onChange={e => setTimeSig(e.target.value)} style={{ ...inputStyle, padding: "7px 10px" }}>
                    {TIME_SIGS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Sounds Like */}
              <div style={sectionLabel}>Sounds Like (optional)</div>
              <input type="text" value={soundsLike} onChange={e => setSoundsLike(e.target.value)}
                placeholder="e.g. Dua Lipa, Hans Zimmer, Fleetwood Mac..."
                style={{ ...inputStyle }} />

              {/* Vocals */}
              <div style={sectionLabel}>Vocals</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[["off", "— Off"], ["on", "Vocals On"], ["instrumental", "Instrumental"]].map(([val, label]) => (
                  <span key={val} style={{ ...chipStyle(vocalsMode === val), flex: 1, textAlign: "center" }} onClick={() => setVocalsMode(val)}>{label}</span>
                ))}
              </div>

              {vocalsMode === "on" && (
                <textarea value={lyrics} onChange={e => setLyrics(e.target.value)}
                  placeholder="Enter lyrics or themes to sing about (optional)..."
                  rows={4} style={{ ...inputStyle, marginTop: 10, resize: "vertical" }} />
              )}

              {/* Generate Button */}
              <button onClick={handleGenerate} disabled={generating}
                className="btn-teal"
                style={{ marginTop: 20, width: "100%" }}>
                {generating ? "Generating..." : `Generate with Lyria 3 Pro — ${lyriaCost} credits`}
              </button>

              <div style={{ marginTop: 8, fontSize: 11, color: "var(--onyx-text-faint)", textAlign: "center" }}>
                Powered by Google Lyria 3 Pro via WaveSpeedAI — falls back to Suno if unavailable
              </div>
              {genStatus && <div style={{ marginTop: 6, fontSize: 12, color: "#7de0ff", textAlign: "center" }}>{genStatus}</div>}
              {genError && <div style={{ marginTop: 6, fontSize: 12, color: "#f87171", textAlign: "center" }}>{genError}</div>}
            </div>

            {/* Right — results */}
            <div>
              <div style={{ fontSize: 11, color: "var(--onyx-text-faint)", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 12 }}>Generated Tracks</div>

              {generatedTracks.length === 0 && !generating && (
                <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--onyx-text-dim)", border: "1px dashed var(--onyx-hairline-strong)", borderRadius: 12 }}>
                  <div style={{ fontSize: 13, color: "var(--onyx-text-faint)" }}>Your generated tracks will appear here</div>
                </div>
              )}

              {generating && (
                <div style={{ textAlign: "center", padding: "48px 24px", border: "1px dashed #2b3442", borderRadius: 12 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>{genStatus}</div>
                  <div style={{ marginTop: 16, height: 3, background: "var(--onyx-surface-2)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: "60%", background: "linear-gradient(90deg, #4dd0ff, #ec4899)", borderRadius: 2, animation: "slide 1.5s infinite" }} />
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gap: 10 }}>
                {generatedTracks.map(track => (
                  <TrackCard key={track.id} track={track} onApply={applyTrack} onSave={saveTrack}
                    onExtend={handleExtend} appliedId={appliedId} savedIds={savedIds}
                    saving={savingId === track.id} extending={extendingId === track.id}
                    extendStatus={extendStatus[track.id] || ""} />
                ))}
              </div>

              {/* Saved Library preview */}
              {savedTracks.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 11, color: "var(--onyx-text-faint)", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
                    <span>My Saved Music</span>
                    <button onClick={() => setTab("saved")} style={{ background: "none", border: "none", color: "#4dd0ff", fontSize: 11, cursor: "pointer" }}>View all →</button>
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {savedTracks.slice(0, 3).map(track => (
                      <TrackCard key={track.id} track={track} onApply={applyTrack} appliedId={appliedId} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================== AI RAPPER TAB ======================== */}
        {tab === "rapper" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, alignItems: "start" }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--onyx-text-faint)", lineHeight: 1.5, marginBottom: 4 }}>
                Vocals and instrumental generated together in one pass (MiniMax Music 2.0) — write lyrics for free first, then generate the track once you're happy with them.
              </div>

              <div style={sectionLabel}>Topic</div>
              <textarea value={rapTopic} onChange={e => setRapTopic(e.target.value)} rows={2}
                placeholder="What's the song about? e.g. grinding to build a business from nothing, staying up late, believing in yourself"
                style={{ ...inputStyle, resize: "vertical" }} />

              <div style={sectionLabel}>Mood (optional)</div>
              <input value={rapMood} onChange={e => setRapMood(e.target.value)} placeholder="e.g. motivational, gritty"
                style={inputStyle} />

              <div style={sectionLabel}>Length</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { id: "short", label: "Short (~30-45s)" },
                  { id: "standard", label: "Standard (~60-90s)" },
                  { id: "full", label: "Full song (~2.5-3min)" },
                ].map(t => (
                  <button key={t.id} onClick={() => setRapLengthTier(t.id)} style={chipStyle(rapLengthTier === t.id)}>{t.label}</button>
                ))}
              </div>

              <button onClick={generateRapLyrics} disabled={rapLyricsLoading || !rapTopic.trim()}
                className="btn-teal" style={{ marginTop: 16, width: "100%" }}>
                {rapLyricsLoading ? "Writing lyrics... ⏳" : rapDraft ? "✍️ Rewrite Lyrics" : "✍️ Write Lyrics"}
              </button>
              {rapLyricsError && <div style={{ color: "#f87171", fontSize: 12, marginTop: 8 }}>{rapLyricsError}</div>}

              {rapDraft && (
                <div style={{ marginTop: 20, padding: 14, background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", borderRadius: 12 }}>
                  <div style={sectionLabel}>Style prompt <span style={{ color: "var(--onyx-text-faint)", fontWeight: 400, textTransform: "none" }}>({rapDraft.style_prompt.length}/300)</span></div>
                  <textarea value={rapDraft.style_prompt} maxLength={300} rows={2}
                    onChange={e => setRapDraft(d => ({ ...d, style_prompt: e.target.value }))}
                    style={{ ...inputStyle, resize: "vertical" }} />

                  <div style={sectionLabel}>Lyrics <span style={{ color: "var(--onyx-text-faint)", fontWeight: 400, textTransform: "none" }}>({rapDraft.lyrics_prompt.length}/3000 — edit freely, [Verse]/[Chorus]/[Bridge] tags are what MiniMax reads as song structure)</span></div>
                  <textarea value={rapDraft.lyrics_prompt} maxLength={3000} rows={12}
                    onChange={e => setRapDraft(d => ({ ...d, lyrics_prompt: e.target.value }))}
                    style={{ ...inputStyle, resize: "vertical", fontFamily: "ui-monospace, monospace", fontSize: 12, lineHeight: 1.6 }} />

                  <button onClick={generateRapTrack} disabled={rapGenerating}
                    className="btn-teal" style={{ marginTop: 12, width: "100%" }}>
                    {rapGenerating ? "Generating... ⏳" : "🎤 Generate Track — 10 credits"}
                  </button>
                </div>
              )}
              {rapGenError && <div style={{ color: "#f87171", fontSize: 12, marginTop: 8 }}>{rapGenError}</div>}
            </div>

            <div>
              {rapGenerating && (
                <div style={{ textAlign: "center", padding: "48px 24px", border: "1px dashed #2b3442", borderRadius: 12 }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🎤</div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>{rapGenStatus}</div>
                  <div style={{ marginTop: 16, height: 3, background: "var(--onyx-surface-2)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: "60%", background: "linear-gradient(90deg, #4dd0ff, #ec4899)", borderRadius: 2, animation: "slide 1.5s infinite" }} />
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gap: 10 }}>
                {rapGeneratedTracks.map(track => (
                  <TrackCard key={track.id} track={track} onApply={applyTrack} onSave={saveTrack}
                    appliedId={appliedId} savedIds={savedIds} saving={savingId === track.id} />
                ))}
              </div>
              {!rapGenerating && rapGeneratedTracks.length === 0 && (
                <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--onyx-text-mute)", fontSize: 12, border: "1px dashed #2b3442", borderRadius: 12 }}>
                  Write lyrics, then generate — your track (with its actual length, which can differ from the tier above) will show up here.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================== LIBRARY TAB ======================== */}
        {tab === "library" && (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <input value={libSearch} onChange={e => setLibSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && loadLibrary(libSearch, moodFilter, genreFilter)}
                style={{ ...inputStyle, flex: 1 }} placeholder="Search by keyword, mood or genre..." />
              <button onClick={() => loadLibrary(libSearch, moodFilter, genreFilter)} disabled={libLoading}
                style={{ padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "var(--btn-primary-grad)", border: "none", color: "var(--onyx-text)", cursor: "pointer", flexShrink: 0 }}>
                {libLoading ? "..." : "Search"}
              </button>
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "var(--onyx-text-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Mood</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {LIB_MOODS.map(m => (
                  <button key={m} onClick={() => { setMoodFilter(m); loadLibrary(libSearch, m, genreFilter); }} style={filterChip(moodFilter === m)}>{m}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "var(--onyx-text-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Genre</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {LIB_GENRES.map(g => (
                  <button key={g} onClick={() => { setGenreFilter(g); loadLibrary(libSearch, moodFilter, g); }} style={filterChip(genreFilter === g)}>{g}</button>
                ))}
              </div>
            </div>

            {libError && <div style={{ padding: 12, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 13, color: "#f87171", marginBottom: 16 }}>{libError}</div>}
            {libLoading && <div style={{ textAlign: "center", padding: 40, color: "var(--onyx-text-dim)" }}>Loading tracks...</div>}
            {!libLoading && !libError && libTracks.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "var(--onyx-text-dim)" }}>No tracks found.</div>}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {libTracks.map(track => (
                <TrackCard key={track.id || track.url} track={track} onApply={applyTrack} appliedId={appliedId} />
              ))}
            </div>
          </div>
        )}

        {/* ======================== SAVED TAB ======================== */}
        {tab === "saved" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 14, color: "var(--onyx-text-dim)" }}>{savedTracks.length} saved track{savedTracks.length !== 1 ? "s" : ""}</div>
              <button onClick={loadSaved} style={{ background: "none", border: "1px solid var(--onyx-hairline-strong)", color: "#6b7280", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>↻ Refresh</button>
            </div>

            {savedLoading && <div style={{ textAlign: "center", padding: 40, color: "var(--onyx-text-dim)" }}>Loading...</div>}

            {!savedLoading && savedTracks.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 24px", border: "1px dashed var(--onyx-hairline-strong)", borderRadius: 12 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💾</div>
                <div style={{ fontSize: 14, color: "var(--onyx-text-dim)", marginBottom: 8 }}>No saved tracks yet</div>
                <div style={{ fontSize: 13, color: "var(--onyx-text-faint)" }}>Generate music and hit Save to build your library</div>
                <button onClick={() => setTab("generate")} style={{ marginTop: 16, padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#4dd0ff", border: "none", color: "var(--onyx-text)", cursor: "pointer" }}>
                  Start Generating →
                </button>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {savedTracks.map(track => (
                <TrackCard key={track.id} track={track} onApply={applyTrack} appliedId={appliedId} savedIds={savedIds} onRename={renameTrack}
                  onUseInTools={t => { const rawUrl = t.url || t.remoteUrl || ""; const absUrl = rawUrl.startsWith("http") ? rawUrl : window.location.origin + rawUrl; setFadrFileUrl(absUrl); setFadrFile(null); setFadrResult(null); setFadrError(""); setResolvedStems(null); setSentConfirm(null); setTab("tools"); }} />
              ))}
            </div>
          </div>
        )}

        {/* ======================== TOOLS TAB (Fadr) ======================== */}
        {tab === "tools" && (
          <div style={{ maxWidth: 720, margin: "0 auto" }}>

            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Audio Tools — powered by Fadr</div>
              <div style={{ fontSize: 13, color: "var(--onyx-text-faint)" }}>Upload a track (MP3, WAV, M4A) to detect BPM &amp; key, remove vocals, or separate stems. ~$0.05/min of audio.</div>
            </div>

            {/* File drop zone */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", padding: "28px 20px", borderRadius: 12, border: `2px dashed ${fadrFile ? "#4dd0ff" : "#1f2937"}`, background: fadrFile ? "rgba(77,208,255,0.06)" : "var(--onyx-bg-2)", cursor: "pointer", textAlign: "center" }}>
                <input type="file" accept="audio/*" style={{ display: "none" }}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setFadrFile(f); setFadrResult(null); setFadrError(""); setFadrDuration(null); setResolvedStems(null); setSentConfirm(null);
                    const audio = new Audio();
                    const url = URL.createObjectURL(f);
                    audio.addEventListener("loadedmetadata", () => { setFadrDuration(audio.duration); URL.revokeObjectURL(url); });
                    audio.src = url;
                  }} />
                {fadrFile
                  ? <><div style={{ fontSize: 13, fontWeight: 600, color: "#7de0ff" }}>{fadrFile.name}</div><div style={{ fontSize: 11, color: "var(--onyx-text-faint)", marginTop: 4 }}>{(fadrFile.size / 1024 / 1024).toFixed(1)} MB — click to change</div></>
                  : <><div style={{ fontSize: 28, marginBottom: 6 }}>📂</div><div style={{ fontSize: 13, color: "var(--onyx-text-faint)" }}>Click to upload an audio file</div><div style={{ fontSize: 11, color: "var(--onyx-text-faint)", marginTop: 4 }}>MP3 · WAV · M4A · OGG</div></>}
              </label>
            </div>

            {/* Or paste URL */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24, alignItems: "center" }}>
              <div style={{ flex: 1, height: 1, background: "var(--onyx-surface-2)" }}/>
              <span style={{ fontSize: 11, color: "var(--onyx-text-faint)" }}>or paste URL</span>
              <div style={{ flex: 1, height: 1, background: "var(--onyx-surface-2)" }}/>
            </div>
            <input
              type="url" placeholder="https://example.com/track.mp3"
              value={fadrFileUrl}
              onChange={e => { setFadrFileUrl(e.target.value); if (e.target.value) { setFadrFile(null); setFadrDuration(null); setFadrResult(null); setFadrError(""); setResolvedStems(null); setSentConfirm(null); } }}
              style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text)", fontSize: 13, marginBottom: 24, outline: "none" }}
            />

            {/* Operation buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
              {(() => {
                const durationMin = fadrDuration != null ? fadrDuration / 60 : null;
                const creditCost = {
                  analyse:      2,
                  instrumental: durationMin != null ? Math.ceil(durationMin * 5) : null,
                  stems:        durationMin != null ? Math.ceil(durationMin * 8) : null,
                };
                const hasSource = fadrFile || fadrFileUrl.trim();
                return [
                  { op: "analyse",      icon: "🔍", label: "Analyse",        desc: "BPM + key + mode" },
                  { op: "instrumental", icon: "🎸", label: "Remove Vocals",   desc: "Returns instrumental stem" },
                  { op: "stems",        icon: "🥁", label: "Separate Stems",  desc: "Vocals, drums, bass, melody" },
                ].map(({ op, icon, label, desc }) => {
                  const cost = creditCost[op];
                  const costLabel = !hasSource ? null
                    : cost != null ? `${cost} credit${cost !== 1 ? "s" : ""}`
                    : op === "analyse" ? "2 credits"
                    : `≥${op === "instrumental" ? 5 : 8} credits`;
                  return (
                    <button key={op}
                      disabled={fadrLoading || !hasSource}
                      onClick={async () => {
                        if (!hasSource) return;
                        setFadrOp(op);
                        setFadrLoading(true);
                        setFadrResult(null);
                        setFadrError("");
                        setResolvedStems(null);
                        setSentConfirm(null);
                        try {
                          const token = session?.access_token;
                          const form = new FormData();
                          if (fadrFile) { form.append("file", fadrFile); }
                          else { form.append("url", fadrFileUrl.trim()); }
                          if (fadrDuration != null) form.append("durationSeconds", String(fadrDuration));
                          const res = await fetch(`/api/music/fadr/${op}`, {
                            method: "POST",
                            headers: token ? { Authorization: `Bearer ${token}` } : {},
                            body: form,
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
                          setFadrResult({ op, ...data });
                          if (op === 'stems') {
                            setResolvedStems(
                              Object.entries(STEM_META)
                                .filter(([k]) => data[k])
                                .map(([k, m]) => ({ type: k, url: data[k], label: m.label, color: m.color }))
                            );
                          }
                        } catch (e) {
                          setFadrError(e.message);
                        } finally {
                          setFadrLoading(false);
                        }
                      }}
                      style={{ padding: "10px 8px", borderRadius: 10, border: `1px solid ${fadrOp === op && fadrLoading ? "#4dd0ff" : "#1f2937"}`, background: fadrOp === op && fadrLoading ? "rgba(77,208,255,0.12)" : "var(--onyx-bg-2)", color: !hasSource ? "#334155" : "#e2e8f0", cursor: !hasSource ? "default" : "pointer", textAlign: "center" }}>
                      <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
                      <div style={{ fontSize: 11, fontWeight: 600 }}>{label}</div>
                      <div style={{ fontSize: 10, color: "var(--onyx-text-faint)", marginTop: 2 }}>{desc}</div>
                      {costLabel && <div style={{ marginTop: 6, fontSize: 10, fontWeight: 600, color: "#7de0ff", background: "rgba(77,208,255,0.15)", borderRadius: 4, padding: "2px 6px", display: "inline-block" }}>{costLabel}</div>}
                    </button>
                  );
                });
              })()}
            </div>

            {/* Loading state */}
            {fadrLoading && (
              <div style={{ textAlign: "center", padding: "40px 20px", border: "1px solid var(--onyx-hairline-strong)", borderRadius: 12, background: "var(--onyx-bg-2)" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Processing…</div>
                <div style={{ fontSize: 12, color: "var(--onyx-text-faint)" }}>Fadr is analysing your audio. This usually takes 30–90 seconds.</div>
              </div>
            )}

            {/* Error */}
            {fadrError && !fadrLoading && (
              <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: 13 }}>
                ⚠️ {fadrError}
              </div>
            )}

            {/* Results */}
            {fadrResult && !fadrLoading && (
              <div style={{ padding: 20, borderRadius: 12, background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)" }}>

                {/* BPM / Key always shown when present */}
                {(fadrResult.bpm || fadrResult.key) && (
                  <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                    {fadrResult.bpm && <span style={{ padding: "4px 12px", borderRadius: 999, background: "rgba(77,208,255,0.15)", border: "1px solid rgba(77,208,255,0.35)", color: "#7de0ff", fontSize: 12, fontWeight: 600 }}>♩ {Math.round(fadrResult.bpm)} BPM</span>}
                    {fadrResult.key && <span style={{ padding: "4px 12px", borderRadius: 999, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)", color: "#93c5fd", fontSize: 12, fontWeight: 600 }}>Key: {fadrResult.key}{fadrResult.mode ? ` ${fadrResult.mode}` : ""}</span>}
                  </div>
                )}

                {/* Instrumental download */}
                {fadrResult.op === "instrumental" && fadrResult.instrumental && (
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>🎸 Instrumental (vocals removed)</div>
                    <a href={fadrResult.instrumental} download target="_blank" rel="noreferrer"
                      style={{ padding: "7px 16px", borderRadius: 8, background: "#4dd0ff", border: "none", color: "var(--onyx-text)", fontSize: 12, fontWeight: 600, textDecoration: "none", cursor: "pointer" }}>
                      ⬇️ Download
                    </a>
                    <button onClick={() => applyTrack({ url: fadrResult.instrumental, name: "Instrumental", title: "Instrumental" })}
                      style={{ padding: "7px 16px", borderRadius: 8, background: "rgba(22,163,74,0.15)", border: "1px solid rgba(22,163,74,0.3)", color: "#86efac", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      Apply to Reel
                    </button>
                  </div>
                )}

                {/* Stems downloads */}
                {fadrResult.op === "stems" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {sentConfirm && (
                      <div style={{
                        background: '#0d2a1a', border: '1px solid #4ade80',
                        borderRadius: 10, padding: '14px 18px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                        <span style={{ color: '#4ade80', fontSize: 14 }}>
                          ✓ Stems assigned to <b>{sentConfirm.reelName}</b>
                        </span>
                        <a
                          href={`/editor?reelId=${sentConfirm.reelId}`}
                          style={{
                            background: '#4ade80', color: '#060d16',
                            padding: '7px 16px', borderRadius: 6,
                            fontWeight: 700, fontSize: 13, textDecoration: 'none'
                          }}
                        >
                          Open Editor →
                        </a>
                      </div>
                    )}
                    {Object.entries(STEM_META).filter(([k]) => fadrResult[k]).map(([k, m]) => (
                      <div key={k} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 14px", borderRadius: 8, background: "#0f1623", border: `1px solid ${m.color}33` }}>
                        <span style={{ fontSize: 16 }}>{m.label.split(" ")[0]}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: m.color }}>{m.label.split(" ").slice(1).join(" ")}</span>
                        <AudioPreview src={fadrResult[k]} />
                        <a href={fadrResult[k]} download target="_blank" rel="noreferrer"
                          style={{ padding: "5px 14px", borderRadius: 7, background: "#4dd0ff", color: "var(--onyx-text)", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
                          ⬇️ Download
                        </a>
                      </div>
                    ))}
                    {resolvedStems?.length > 0 && !sentConfirm && (
                      <button
                        onClick={() => { setPendingApplyTrack({ url: '__stems__', name: 'Stem Tracks', isStems: true }); loadReels(); setShowReelPicker(true); }}
                        style={{ marginTop: 4, width: "100%", padding: "12px 0", background: "linear-gradient(135deg, #7dd3fc, #4ade80)", border: "none", borderRadius: 8, color: "#060d16", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                        📥 Assign All Stems to Reel
                      </button>
                    )}
                    {Object.keys(STEM_META).every(k => !fadrResult[k]) && (
                      <div style={{ fontSize: 13, color: "var(--onyx-text-faint)", textAlign: "center", padding: 16 }}>Stem URLs not returned — check server logs for raw response shape.</div>
                    )}
                  </div>
                )}

                {fadrResult.op === "analyse" && !fadrResult.bpm && !fadrResult.key && (
                  <div style={{ fontSize: 13, color: "var(--onyx-text-faint)", textAlign: "center", padding: 12 }}>No BPM/key data returned. The file may be too short or in an unsupported format.</div>
                )}

              </div>
            )}

          </div>
        )}

      </div>

      {/* Reel Picker Modal */}
      {showReelPicker && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}>
          <div style={{ background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--onyx-hairline-strong)" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--onyx-text)" }}>Apply to Reel</div>
              <button onClick={() => { setShowReelPicker(false); setPendingApplyTrack(null); }}
                style={{ background: "none", border: "none", color: "#6b7280", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ overflowY: "auto", flex: 1, padding: "12px 20px" }}>
              <input value={reelSearch} onChange={e => setReelSearch(e.target.value)} placeholder="Search reels..." style={{ width: "100%", padding: "8px 12px", background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", borderRadius: 8, color: "var(--onyx-text)", fontSize: 13, marginBottom: 12, boxSizing: "border-box" }} />
              {reels.length === 0 && (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--onyx-text-faint)", fontSize: 13 }}>No reels found. Create a reel in the Editor first.</div>
              )}
              <div style={{ display: "grid", gap: 8 }}>
                {reels.filter(r => (r.title || '').toLowerCase().includes(reelSearch.toLowerCase())).map(reel => {
                  const isApplied = appliedReelId === reel.id;
                  return (
                  <div key={reel.id} onClick={() => !appliedReelId && confirmApplyToReel(reel)}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, border: `1px solid ${isApplied ? "#16a34a" : "#1f2937"}`, borderRadius: 10, background: isApplied ? "rgba(22,163,74,0.1)" : "var(--onyx-bg)", cursor: appliedReelId ? "default" : "pointer", transition: "border-color 0.2s, background 0.2s" }}>
                    {reel.thumbnail_url && (
                      <img src={reel.thumbnail_url} alt="" style={{ width: 56, height: 40, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--onyx-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {reel.title || "Untitled Reel"}
                      </div>
                      {reel.updated_at && (
                        <div style={{ fontSize: 11, color: "var(--onyx-text-faint)" }}>{new Date(reel.updated_at).toLocaleDateString()}</div>
                      )}
                    </div>
                    <div style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, color: isApplied ? "#86efac" : "#60a5fa" }}>
                      {isApplied ? "✓ Applied" : "Apply →"}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--onyx-hairline-strong)" }}>
              {appliedReelId && (
                <div style={{ marginBottom: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(22,163,74,0.15)", border: "1px solid rgba(22,163,74,0.3)", color: "#86efac", fontSize: 12, textAlign: "center" }}>
                  ✓ {applyMsg || "Track applied — open the Editor to use it."}
                </div>
              )}
              <button onClick={saveAndClose}
                style={{ width: "100%", padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "rgba(77,208,255,0.15)", border: "1px solid rgba(77,208,255,0.3)", color: "#7de0ff", cursor: "pointer" }}>
                💾 Save to My Music instead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stem Reel Picker Modal */}
      {showStemReelPicker && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'var(--onyx-bg-2)', border: '1px solid var(--onyx-hairline-strong)',
            borderRadius: 14, padding: 28, width: 400,
            maxHeight: '70vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
          }}>
            <h3 style={{ color: '#e2e8f0', marginBottom: 6, fontSize: 17 }}>
              Assign stems to which reel?
            </h3>
            <p style={{ color: 'var(--onyx-text-faint)', fontSize: 12, marginBottom: 18 }}>
              This will add {resolvedStems?.length} stem tracks to the reel&apos;s sequencer.
            </p>

            {loadingReels && (
              <p style={{ color: '#4a6a8a', textAlign: 'center' }}>Loading your reels…</p>
            )}

            {!loadingReels && reels.length === 0 && (
              <p style={{ color: 'var(--onyx-text-faint)', textAlign: 'center' }}>No reels found. Create one first.</p>
            )}

            {reels.map(reel => (
              <div
                key={reel.id}
                onClick={() => !stemSending && handleAssignToReel(reel.id, reel.title || 'Untitled Reel')}
                style={{
                  padding: '13px 16px', borderRadius: 8, marginBottom: 8,
                  background: stemSending ? '#0a0f1a' : '#0d1f30',
                  border: '1px solid var(--onyx-hairline-strong)',
                  cursor: stemSending ? 'wait' : 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#7dd3fc'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#1e2a38'}
              >
                <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
                  {reel.title || 'Untitled Reel'}
                </span>
                <span style={{ color: '#4a6a8a', fontSize: 11 }}>
                  {new Date(reel.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}

            <button
              onClick={() => setShowStemReelPicker(false)}
              disabled={stemSending}
              style={{
                marginTop: 12, width: '100%', padding: '10px 0',
                background: 'transparent', border: '1px solid var(--onyx-hairline-strong)',
                borderRadius: 8, color: 'var(--onyx-text-faint)', cursor: 'pointer', fontSize: 13
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
      `}</style>
    </div>
  );
}
