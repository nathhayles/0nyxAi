import React, { useState } from "react";
import { FONTS } from "../data/fonts.js";

// Every theme's promptPrefix gets prepended to the scene's generation
// prompt when applied (see applyTheme() below + EditorV2.jsx's regenerate
// call site) -- added 2026-08-29. Before this, applyTheme() only ever
// touched caption_color/caption_bg_color: picking a theme like "Retro"
// recolored the captions but had zero effect on what the AI actually
// generated, which is what Nathan was really asking for ("do a manga
// style scene with..."). Text drawn from real, checkable visual
// vocabulary for each named style/aesthetic, not generic filler.
const THEMES = [
  {
    id: "cinematic",
    label: "Cinematic",
    icon: "",
    palette: ["#0a0a0a", "#1a1a2e", "#16213e", "#e94560", "#f5f5f5"],
    caption: { font: "Georgia", size: 18, color: "#ffffff", bg: "rgba(0,0,0,0.85)", position: "bottom" },
    musicKeyword: "cinematic epic",
    desc: "Dark, dramatic, high-impact",
    promptPrefix: "Cinematic style, dramatic lighting, deep shadows, wide anamorphic framing, high-contrast color grading,",
  },
  {
    id: "business",
    label: "Business",
    icon: "",
    palette: ["#1e3a5f", "#2563eb", "#ffffff", "#f1f5f9", "#0f172a"],
    caption: { font: "Arial", size: 16, color: "#ffffff", bg: "rgba(30,58,95,0.9)", position: "bottom" },
    musicKeyword: "corporate professional",
    desc: "Clean, professional, trustworthy",
    promptPrefix: "Professional corporate style, clean composition, blue tones, modern office aesthetic,",
  },
  {
    id: "energetic",
    label: "Energetic",
    icon: "",
    palette: ["#f59e0b", "#ef4444", "#8b5cf6", "#10b981", "#1f2937"],
    caption: { font: "Trebuchet MS", size: 17, color: "#ffffff", bg: "rgba(245,158,11,0.9)", position: "bottom" },
    musicKeyword: "upbeat energetic",
    desc: "Bold, vibrant, high energy",
    promptPrefix: "High-energy vibrant style, bold saturated colors, dynamic motion, fast-paced dramatic angles,",
  },
  {
    id: "minimal",
    label: "Minimal",
    icon: "◻",
    palette: ["#ffffff", "#f8fafc", "#e2e8f0", "#64748b", "#0f172a"],
    caption: { font: "sans-serif", size: 15, color: "#0f172a", bg: "rgba(255,255,255,0.92)", position: "bottom" },
    musicKeyword: "ambient minimal",
    desc: "Clean, simple, elegant",
    promptPrefix: "Minimalist style, clean negative space, muted tones, simple elegant composition, Scandinavian aesthetic,",
  },
  {
    id: "documentary",
    label: "Documentary",
    icon: "",
    palette: ["#292524", "#78716c", "#d6d3d1", "#fef3c7", "#1c1917"],
    caption: { font: "Georgia", size: 16, color: "#fef3c7", bg: "rgba(28,25,23,0.88)", position: "bottom" },
    musicKeyword: "documentary thoughtful",
    desc: "Authentic, storytelling, warm",
    promptPrefix: "Documentary style, handheld feel, natural available light, authentic candid atmosphere, photojournalism,",
  },
  {
    id: "luxury",
    label: "Luxury",
    icon: "✦",
    palette: ["#1a1a1a", "#c9a84c", "#ffffff", "#2d2d2d", "#8b7355"],
    caption: { font: "Georgia", size: 17, color: "#c9a84c", bg: "rgba(26,26,26,0.92)", position: "bottom" },
    musicKeyword: "luxury elegant",
    desc: "Premium, sophisticated, gold",
    promptPrefix: "Ultra-luxury aesthetic, elegant minimalist composition, gold and black palette, aspirational lifestyle, high fashion editorial,",
  },
  {
    id: "tech",
    label: "Tech",
    icon: "⬡",
    palette: ["#0f172a", "#06b6d4", "#8b5cf6", "#10b981", "#1e293b"],
    caption: { font: "monospace", size: 15, color: "#06b6d4", bg: "rgba(15,23,42,0.92)", position: "bottom" },
    musicKeyword: "technology futuristic",
    desc: "Modern, digital, innovative",
    promptPrefix: "Futuristic tech style, sleek digital interfaces, cool blue and cyan lighting, high-tech minimalist environment,",
  },
  {
    id: "wellness",
    label: "Wellness",
    icon: "",
    palette: ["#f0fdf4", "#86efac", "#166534", "#fef9c3", "#14532d"],
    caption: { font: "sans-serif", size: 16, color: "#14532d", bg: "rgba(240,253,244,0.92)", position: "bottom" },
    musicKeyword: "relaxing nature",
    desc: "Calm, natural, healthy",
    promptPrefix: "Calm wellness aesthetic, soft natural light, serene green and cream tones, peaceful organic atmosphere,",
  },
  { id: "viral", label: "Viral", icon: "", palette: ["#ff0050", "#ffffff", "#000000", "#ff4081", "#1a1a1a"], caption: { font: "Trebuchet MS", size: 20, color: "#ffffff", bg: "rgba(0,0,0,0.0)", position: "bottom" }, musicKeyword: "viral upbeat", desc: "TikTok-ready, bold, viral", promptPrefix: "Vibrant social media style, high energy, bright saturated colors, dynamic close-up composition, vertical framing," },
  { id: "retro", label: "Retro", icon: "", palette: ["#f97316", "#fbbf24", "#84cc16", "#06b6d4", "#1a1a1a"], caption: { font: "monospace", size: 16, color: "#fbbf24", bg: "rgba(26,26,26,0.92)", position: "bottom" }, musicKeyword: "retro vintage", desc: "80s/90s nostalgic vibes", promptPrefix: "Retro 80s/90s aesthetic, warm film grain, VHS tracking artifacts, saturated sunset color grading, nostalgic analog look," },
  { id: "neon", label: "Neon", icon: "", palette: ["#0f0f0f", "#a855f7", "#ec4899", "#06b6d4", "#1a1a1a"], caption: { font: "Trebuchet MS", size: 17, color: "#a855f7", bg: "rgba(0,0,0,0.85)", position: "bottom" }, musicKeyword: "electronic neon", desc: "Dark, glowing, nightlife", promptPrefix: "Neon-lit nightlife aesthetic, glowing pink and cyan lights, dark wet-street reflections, cyberpunk atmosphere," },
  { id: "nature", label: "Nature", icon: "", palette: ["#166534", "#86efac", "#fef9c3", "#92400e", "#f0fdf4"], caption: { font: "Georgia", size: 16, color: "#166534", bg: "rgba(240,253,244,0.9)", position: "bottom" }, musicKeyword: "nature peaceful", desc: "Earthy, organic, outdoors", promptPrefix: "Natural earthy style, organic outdoor lighting, lush green tones, grounded documentary-style framing," },
  { id: "food", label: "Food", icon: "", palette: ["#dc2626", "#f97316", "#fbbf24", "#ffffff", "#1a1a1a"], caption: { font: "Trebuchet MS", size: 17, color: "#ffffff", bg: "rgba(220,38,38,0.9)", position: "bottom" }, musicKeyword: "upbeat fun", desc: "Warm, appetising, vibrant", promptPrefix: "Appetising food-styled aesthetic, warm golden lighting, close-up macro detail, vibrant fresh colors," },
  { id: "fitness", label: "Fitness", icon: "", palette: ["#1f2937", "#f59e0b", "#ef4444", "#ffffff", "#111827"], caption: { font: "Arial", size: 18, color: "#f59e0b", bg: "rgba(31,41,55,0.95)", position: "bottom" }, musicKeyword: "motivational workout", desc: "Powerful, motivational, bold", promptPrefix: "Powerful fitness aesthetic, high-contrast dramatic lighting, bold dynamic angles, motivational intensity," },
  { id: "fashion", label: "Fashion", icon: "", palette: ["#fdf2f8", "#f9a8d4", "#9d174d", "#ffffff", "#1a1a1a"], caption: { font: "Georgia", size: 16, color: "#9d174d", bg: "rgba(253,242,248,0.92)", position: "bottom" }, musicKeyword: "fashion stylish", desc: "Elegant, feminine, stylish", promptPrefix: "Elegant fashion-editorial style, soft studio lighting, refined composition, high-fashion runway aesthetic," },
  { id: "realestate", label: "Real Estate", icon: "", palette: ["#1e3a5f", "#94a3b8", "#f8fafc", "#c9a84c", "#0f172a"], caption: { font: "Arial", size: 16, color: "#ffffff", bg: "rgba(30,58,95,0.92)", position: "bottom" }, musicKeyword: "professional calm", desc: "Trustworthy, premium, clean", promptPrefix: "Premium real-estate style, clean architectural composition, natural daylight, polished professional framing," },
  { id: "education", label: "Education", icon: "", palette: ["#1d4ed8", "#fbbf24", "#ffffff", "#f0f9ff", "#1e3a5f"], caption: { font: "Arial", size: 16, color: "#1d4ed8", bg: "rgba(240,249,255,0.95)", position: "bottom" }, musicKeyword: "educational inspiring", desc: "Clear, informative, bright", promptPrefix: "Bright educational style, clear well-lit composition, friendly approachable framing, clean informative visuals," },
  { id: "horror", label: "Horror", icon: "", palette: ["#000000", "#dc2626", "#4a1942", "#ffffff", "#1a0a0a"], caption: { font: "Georgia", size: 18, color: "#dc2626", bg: "rgba(0,0,0,0.95)", position: "bottom" }, musicKeyword: "dark suspense", desc: "Dark, eerie, intense", promptPrefix: "Dark moody atmosphere, deep shadows, horror cinematic aesthetic, dramatic low-key lighting, muted desaturated color," },
  { id: "travel", label: "Travel", icon: "", palette: ["#0ea5e9", "#f59e0b", "#ffffff", "#1e3a5f", "#f0f9ff"], caption: { font: "sans-serif", size: 16, color: "#ffffff", bg: "rgba(14,165,233,0.85)", position: "bottom" }, musicKeyword: "adventure travel", desc: "Bright, adventurous, wanderlust", promptPrefix: "Adventurous travel aesthetic, warm golden-hour light, sweeping wide landscapes, wanderlust cinematic framing," },
  { id: "comedy", label: "Comedy", icon: "", palette: ["#fbbf24", "#f97316", "#ffffff", "#1a1a1a", "#fef9c3"], caption: { font: "Trebuchet MS", size: 18, color: "#1a1a1a", bg: "rgba(251,191,36,0.92)", position: "bottom" }, musicKeyword: "funny upbeat", desc: "Fun, playful, lighthearted", promptPrefix: "Playful comedic style, bright bold colors, exaggerated expressive framing, lighthearted energetic pacing," },

  // Named classic art styles -- added 2026-08-29 per Nathan's direct ask
  // ("do a manga style scene with...", referencing pop art / art nouveau /
  // synthwave examples). Distinct from the mood/industry themes above:
  // these map to real, checkable art-historical/genre visual vocabulary.
  { id: "popart", label: "Pop Art", icon: "", palette: ["#e63946", "#ffd60a", "#1d3557", "#000000", "#ffffff"], caption: { font: "Trebuchet MS", size: 19, color: "#ffffff", bg: "rgba(230,57,70,0.9)", position: "bottom" }, musicKeyword: "pop upbeat retro", desc: "Lichtenstein-style comic pop art", promptPrefix: "Pop art style, bold flat colors, thick black outlines, Ben-Day halftone dots, comic-book aesthetic, high-contrast graphic composition," },
  { id: "artnouveau", label: "Art Nouveau", icon: "❧", palette: ["#c9a84c", "#f5ecd7", "#2f5233", "#a8375f", "#1a1a1a"], caption: { font: "Georgia", size: 17, color: "#c9a84c", bg: "rgba(47,82,51,0.85)", position: "bottom" }, musicKeyword: "elegant orchestral", desc: "Mucha-style flowing ornamental illustration", promptPrefix: "Art Nouveau style, flowing organic linework, ornamental floral motifs, elegant decorative borders, Mucha-inspired illustration," },
  { id: "synthwave", label: "Synthwave", icon: "◢", palette: ["#ff2e97", "#00e5ff", "#7b2ff7", "#0a0014", "#ff9e00"], caption: { font: "monospace", size: 18, color: "#00e5ff", bg: "rgba(10,0,20,0.9)", position: "bottom" }, musicKeyword: "synthwave electronic", desc: "80s vaporwave neon-grid retro-futurism", promptPrefix: "Synthwave vaporwave aesthetic, neon grid horizon, magenta and cyan gradient sky, retro-futuristic 80s digital art, glowing chrome," },
  { id: "vintageposter", label: "Vintage Poster", icon: "", palette: ["#2a6f77", "#e9b44c", "#f4ecd8", "#c1502e", "#1e3a4c"], caption: { font: "Georgia", size: 16, color: "#f4ecd8", bg: "rgba(42,111,119,0.88)", position: "bottom" }, musicKeyword: "vintage jazzy", desc: "Mid-century travel-poster illustration", promptPrefix: "Vintage travel poster style, flat bold color blocks, mid-century illustration, WPA-era poster art, simplified geometric shapes," },
  { id: "filmnoir", label: "Film Noir", icon: "", palette: ["#000000", "#ffffff", "#4a4a4a", "#1a1a1a", "#8a8a8a"], caption: { font: "Georgia", size: 18, color: "#ffffff", bg: "rgba(0,0,0,0.9)", position: "bottom" }, musicKeyword: "noir suspense jazz", desc: "1940s black-and-white detective aesthetic", promptPrefix: "Film noir style, high-contrast black and white, dramatic venetian-blind shadows, moody low-key lighting, 1940s detective film aesthetic," },
  { id: "manga", label: "Manga / Anime", icon: "", palette: ["#ff6f91", "#4fc3f7", "#ffffff", "#1a1a1a", "#ff3b3b"], caption: { font: "Trebuchet MS", size: 18, color: "#1a1a1a", bg: "rgba(255,255,255,0.92)", position: "bottom" }, musicKeyword: "anime upbeat", desc: "Japanese manga/anime cel-shaded style", promptPrefix: "Japanese manga anime style, clean cel-shaded line art, expressive characters, dynamic speed lines, vibrant anime color palette," },
];

const CAPTION_STYLES = [
  { id: "clean",      label: "Clean",      bgOpacity: 0,    border: "none",                            weight: "normal" },
  { id: "solid",      label: "Solid",      bgOpacity: 0.85, border: "none",                            weight: "normal" },
  { id: "bold",       label: "Bold",       bgOpacity: 0.95, border: "none",                            weight: "bold"   },
  { id: "outline",    label: "Outline",    bgOpacity: 0,    border: "2px solid currentColor",          weight: "bold"   },
  { id: "glass",      label: "Glass",      bgOpacity: 0.15, border: "1px solid rgba(255,255,255,0.3)", weight: "normal" },
  { id: "dark",       label: "Dark Edge",  bgOpacity: 1,    border: "2px solid rgba(255,255,255,0.2)", weight: "bold",   forceDark: true },
  { id: "underline",  label: "Underline",  bgOpacity: 0,    border: "none", borderBottom: "3px solid currentColor", weight: "normal" },
  { id: "soft",       label: "Soft",       bgOpacity: 0,    border: "none",                            weight: "normal", desc: "Muted pastel, low-contrast" },
  { id: "crisp",      label: "Crisp",      bgOpacity: 0.92, border: "none",                            weight: "normal" },
  { id: "neon",       label: "Neon",       bgOpacity: 0,    border: "none", weight: "bold",   neon: true,       desc: "Glowing neon text" },
  { id: "gradient",   label: "Gradient",   bgOpacity: 0,    border: "none", weight: "bold",   gradient: true,   desc: "Rainbow gradient text" },
  { id: "karaoke",    label: "Karaoke",    bgOpacity: 0.9,  border: "none", weight: "bold",   karaoke: true,    desc: "Yellow highlight bar" },
  { id: "tiktok",     label: "TikTok",     bgOpacity: 0,    border: "none", weight: "bold",   tiktok: true,     desc: "White text, black outline" },
  { id: "bubble",     label: "Bubble",     bgOpacity: 1,    border: "3px solid #ffffff", weight: "bold", bubble: true, desc: "Rounded bubble style" },
  { id: "typewriter", label: "Typewriter", bgOpacity: 0,    border: "none", weight: "normal", typewriter: true, desc: "Monospace typewriter" },
];


const PRESET_PALETTES = [
  { name: "Sunset",     colors: ["#ff6b6b","#feca57","#ff9ff3","#54a0ff","#5f27cd"] },
  { name: "Ocean",      colors: ["#00d2d3","#54a0ff","#5f27cd","#ffffff","#0f0f0f"] },
  { name: "Forest",     colors: ["#00b894","#55efc4","#2d3436","#dfe6e9","#6c5ce7"] },
  { name: "Candy",      colors: ["#fd79a8","#fdcb6e","#e17055","#74b9ff","#ffffff"] },
  { name: "Midnight",   colors: ["#2d3436","#6c5ce7","#00cec9","#fd79a8","#dfe6e9"] },
  { name: "Gold",       colors: ["#f9ca24","#f0932b","#ffffff","#1a1a1a","#c4a35a"] },
  { name: "Rose",       colors: ["#ff6b9d","#c44569","#f8b500","#ffffff","#2d3436"] },
  { name: "Arctic",     colors: ["#74b9ff","#a29bfe","#dfe6e9","#2d3436","#ffffff"] },
  { name: "Lava",       colors: ["#ee5a24","#c44569","#f9ca24","#1a1a1a","#ffffff"] },
  { name: "Monochrome", colors: ["#000000","#333333","#666666","#999999","#ffffff"] },
];

function Swatch({ color, size = 20 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 4,
      background: color, border: "1px solid rgba(255,255,255,0.1)",
      flexShrink: 0,
    }} />
  );
}

function getCaptionPreviewStyle(style) {
  const base = {
    fontWeight: style.weight,
    padding: "5px 16px",
    fontSize: 14,
    borderRadius: 2,
    display: "inline-block",
  };

  if (style.neon) {
    return {
      ...base,
      color: "#0ff",
      background: "transparent",
      border: "none",
      textShadow: "0 0 8px #0ff, 0 0 16px #0ff, 0 0 32px #0ff",
      fontFamily: "Trebuchet MS, sans-serif",
    };
  }
  if (style.gradient) {
    return {
      ...base,
      background: "linear-gradient(90deg, #f59e0b, #ef4444, #8b5cf6, #10b981)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
      border: "none",
    };
  }
  if (style.karaoke) {
    return {
      ...base,
      background: "#fbbf24",
      color: "#000",
      border: "none",
      borderRadius: 24,
      padding: "5px 20px",
      fontWeight: "bold",
    };
  }
  if (style.tiktok) {
    return {
      ...base,
      color: "#fff",
      background: "transparent",
      border: "none",
      fontWeight: "bold",
      fontSize: 15,
      textShadow: "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 0 8px rgba(0,0,0,0.8)",
    };
  }
  if (style.bubble) {
    return {
      ...base,
      background: "#7c3aed",
      color: "#fff",
      border: "3px solid #ffffff",
      borderRadius: 28,
      padding: "5px 20px",
      fontWeight: "bold",
    };
  }
  if (style.typewriter) {
    return {
      ...base,
      fontFamily: "monospace",
      letterSpacing: "2px",
      color: "#e2e8f0",
      background: "transparent",
      border: "none",
    };
  }

  // Standard styles
  if (style.id === "clean") {
    return {
      ...base,
      color: "#ffffff",
      background: "transparent",
      border: "none",
      textShadow: "1px 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.6)",
    };
  }
  if (style.id === "solid") {
    return {
      ...base,
      color: "#ffffff",
      background: "rgba(0,0,0,0.85)",
      border: "none",
      borderRadius: 3,
    };
  }
  if (style.id === "bold") {
    return {
      ...base,
      color: "#ffffff",
      background: "rgba(0,0,0,0.95)",
      border: "none",
      fontWeight: "bold",
      fontSize: 15,
      borderRadius: 2,
    };
  }
  if (style.id === "outline") {
    return {
      ...base,
      color: "#ffffff",
      background: "transparent",
      border: "2px solid #ffffff",
      borderRadius: 4,
      fontWeight: "bold",
    };
  }
  if (style.id === "glass") {
    return {
      ...base,
      color: "#ffffff",
      background: "rgba(255,255,255,0.15)",
      border: "1px solid rgba(255,255,255,0.35)",
      borderRadius: 6,
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
    };
  }
  if (style.id === "dark") {
    return {
      ...base,
      color: "#ffffff",
      background: "#000000",
      border: "2px solid rgba(255,255,255,0.2)",
      fontWeight: "bold",
      borderRadius: 2,
    };
  }
  if (style.id === "underline") {
    return {
      ...base,
      color: "#ffffff",
      background: "transparent",
      border: "none",
      borderBottom: "3px solid #60a5fa",
      borderRadius: 0,
      textShadow: "1px 1px 3px rgba(0,0,0,0.8)",
    };
  }
  if (style.id === "soft") {
    return {
      ...base,
      color: "#f0ece1",
      background: "transparent",
      border: "none",
      textShadow: "1px 1px 2px rgba(0,0,0,0.35)",
    };
  }
  if (style.id === "crisp") {
    return {
      ...base,
      color: "#ffffff",
      background: "rgba(0,0,0,0.92)",
      border: "none",
      borderRadius: 0,
      letterSpacing: "0.3px",
    };
  }

  return {
    ...base,
    color: "#ffffff",
    background: `rgba(0,0,0,${style.bgOpacity})`,
    border: style.border,
    borderBottom: style.borderBottom,
  };
}

export default function StylesPanel({ scenes = [], setScenes, activeScene, activeThemeId, forcedTab, onPendingCaption, brand, onSave }) {
  const [selectedTheme, setSelectedTheme] = useState(activeThemeId || null);
  const [selectedCaption, setSelectedCaption] = useState(null);
  const [internalTab, setInternalTab] = useState(forcedTab || "themes");
  const tab = forcedTab || internalTab;
  const setTab = forcedTab ? () => {} : setInternalTab;
  const [pending, setPending] = useState(null); // { type: "theme"|"caption", item }

  // Seed from active scene → brand → hardcoded defaults
  const activeSceneObj = scenes?.find(s => s.id === activeScene);
  const _b = brand || {};
  const _s = activeSceneObj || {};
  const [customCaption, setCustomCaption] = useState(() => ({
    color: _s.caption_color || _b.caption_color || "#ffffff",
    bgColor: _s.caption_bg_color || _b.caption_bg_color || "rgba(0,0,0,0.8)",
    highlightColor: _s.caption_highlight_color || _b.caption_highlight_color || "#ffe566",
    position: _s.caption_position || _b.caption_position || "bottom",
    fontSize: Number(_s.caption_size || _b.caption_size || 18),
    font: _s.caption_font || _b.caption_font || "sans-serif",
    transparentBg: (_s.caption_bg_color || _b.caption_bg_color || "") === "transparent",
  }));
  const [customPalette, setCustomPalette] = useState(["#7c3aed", "#ec4899", "#f59e0b", "#10b981", "#0ea5e9"]);

  const inputStyle = {
    background: "var(--onyx-surface)",
    border: "1px solid #2b3442",
    color: "#e2e8f0",
    borderRadius: 4,
    padding: "5px 8px",
    fontSize: 11,
    width: "100%",
    boxSizing: "border-box",
  };

  const btnStyle = (active) => ({
    flex: 1, padding: "6px 8px", borderRadius: 4, fontSize: 11,
    cursor: "pointer", fontWeight: 600,
    background: active ? "var(--chip-bg-strong)" : "var(--chip-bg)",
    border: active ? "1px solid var(--onyx-cyan)" : "0.5px solid var(--onyx-hairline-strong)",
    color: active ? "#60a5fa" : "#64748b",
  });

  const posBtn = (pos) => ({
    flex: 1, padding: "5px 0", borderRadius: 4, fontSize: 11,
    cursor: "pointer", fontWeight: 600,
    background: customCaption.position === pos ? "var(--chip-bg-strong)" : "var(--chip-bg)",
    border: customCaption.position === pos ? "1px solid var(--onyx-cyan)" : "0.5px solid var(--onyx-hairline-strong)",
    color: customCaption.position === pos ? "#60a5fa" : "#64748b",
  });

  function applyTheme(theme, scope) {
    if (!setScenes) return;
    const next = scenes.map(s => {
      if (scope === "this" && s.id !== activeScene) return s;
      return {
        ...s,
        caption_color: theme.caption.color,
        caption_bg_color: theme.caption.bg,
        // caption_font, caption_size, caption_position intentionally preserved
        // Stored separately from the user's own editable Action/Background
        // text (scene.action) and combined only at generation time (see
        // EditorV2.jsx's regenerateScene) -- baking it directly into
        // scene.action would duplicate/stack on every repeat click and
        // pollute the user's own prompt text. Set (not appended) so
        // switching themes replaces the previous style cleanly rather than
        // accumulating multiple styles' prefixes.
        stylePromptPrefix: theme.promptPrefix || null,
      };
    });
    setScenes(next);
    setSelectedTheme(theme.id);
    setPending(null);
    onSave?.();
  }

  function applyCaption(style, scope) {
    if (!setScenes) return;
    if (scope === "this" && !activeScene) return;
    const next = scenes.map(s => {
      if (scope === "this" && s.id !== activeScene) return s;
      return {
        ...s,
        caption_style_id: style.id,
        caption_bg_opacity: style.bgOpacity,
        caption_border: style.border,
        caption_border_bottom: style.borderBottom || null,
        caption_weight: style.weight,
        caption_force_dark: style.forceDark || false,
        caption_neon: style.neon || false,
        caption_gradient: style.gradient || false,
        caption_karaoke: style.karaoke || false,
            caption_style: style.karaoke ? "karaoke" : (style.id || "normal"),
        caption_tiktok: style.tiktok || false,
        caption_bubble: style.bubble || false,
        caption_typewriter: style.typewriter || false,
        // caption_color and caption_bg_color intentionally preserved — set by theme
      };
    });
    setScenes(next);
    setSelectedCaption(style.id);
    setPending(null);
    onPendingCaption?.(null);
    onSave?.();
  }

  function applyCustomCaption(scope) {
    if (!setScenes) return;
    const next = scenes.map(s => {
      if (scope === "this" && s.id !== activeScene) return s;
      return {
        ...s,
        caption_color: customCaption.color,
        caption_bg_color: customCaption.transparentBg ? "transparent" : customCaption.bgColor,
        caption_position: customCaption.position,
        caption_size: customCaption.fontSize,
        caption_font: customCaption.font,
        caption_highlight_color: customCaption.highlightColor,
      };
    });
    setScenes(next);
    onSave?.();
  }

  function applyCustomPalette(scope) {
    if (!setScenes) return;
    setScenes(prev => prev.map(s => {
      if (scope === "this" && s.id !== activeScene) return s;
      return { ...s, custom_palette: customPalette };
    }));
  }

  const hasPending = pending !== null;
  const customPreviewBg = customCaption.transparentBg ? "transparent" : customCaption.bgColor;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Scrollable content area */}
      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {!forcedTab && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 12, textTransform: "uppercase", letterSpacing: "1.5px" }}>
              Styles & Themes
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              <button onClick={() => { setTab("themes"); setPending(null); onPendingCaption?.(null); }} style={btnStyle(tab === "themes")}>Themes</button>
              <button onClick={() => { setTab("captions"); setPending(null); onPendingCaption?.(null); }} style={btnStyle(tab === "captions")}>Captions</button>
              <button onClick={() => { setTab("custom"); setPending(null); onPendingCaption?.(null); }} style={btnStyle(tab === "custom")}>Custom</button>
            </div>
          </>
        )}

        {tab === "themes" && (
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>
              Click a theme to preview, then choose where to apply it.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {THEMES.map(theme => {
                const isSelected = pending?.type === "theme" && pending.item.id === theme.id;
                const isApplied = selectedTheme === theme.id;
                return (
                  <div
                    key={theme.id}
                    onClick={() => setPending({ type: "theme", item: theme })}
                    style={{
                      padding: "8px 10px", borderRadius: 6, cursor: "pointer",
                      background: isSelected ? "var(--onyx-surface-2)" : "var(--onyx-surface)",
                      border: isSelected ? "1px solid var(--onyx-cyan)" : isApplied ? "1px solid var(--onyx-success)" : "0.5px solid var(--onyx-hairline-strong)",
                      transition: "border-color 0.15s",
                      position: "relative",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                      <span style={{ fontSize: 14 }}>{theme.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{theme.label}</div>
                      </div>
                      {isApplied && (
                        <div style={{ fontSize: 8, color: "#22c55e", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", flexShrink: 0 }}>
                          ✓
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 9, color: "#64748b", marginBottom: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{theme.desc}</div>
                    <div style={{ display: "flex", gap: 3 }}>
                      {theme.palette.map((c, i) => <Swatch key={i} color={c} size={14} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "captions" && (
          <div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>
              Click a caption style to preview, then choose where to apply it.
            </div>
            {CAPTION_STYLES.map(style => {
              const isSelected = pending?.type === "caption" && pending.item.id === style.id;
              const previewStyle = getCaptionPreviewStyle(style);
              return (
                <div
                  key={style.id}
                  onClick={() => { setPending({ type: "caption", item: style }); onPendingCaption?.(style.id); }}
                  style={{
                    marginBottom: 8, borderRadius: 6, overflow: "hidden", cursor: "pointer",
                    border: isSelected ? "1px solid var(--onyx-cyan)" : "0.5px solid var(--onyx-hairline-strong)",
                    transition: "border-color 0.15s",
                  }}
                >
                  <div style={{
                    background: "linear-gradient(135deg, #1a2035 0%, #111827 50%, #0d1420 100%)",
                    display: "flex", alignItems: "flex-end", justifyContent: "center",
                    minHeight: 60, paddingBottom: 10, paddingTop: 10,
                    position: "relative",
                  }}>
                    {/* Simulated video content */}
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "linear-gradient(to bottom, rgba(30,40,60,0.4) 0%, rgba(10,15,25,0.7) 100%)",
                      pointerEvents: "none",
                    }} />
                    <div style={{ ...previewStyle, position: "relative", zIndex: 1 }}>
                      {style.label} caption style
                    </div>
                  </div>
                  <div style={{
                    padding: "5px 12px", background: "var(--onyx-surface)",
                    fontSize: 11, color: "#94a3b8", display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span>{style.label}{style.desc ? ` — ${style.desc}` : ""}</span>
                    {selectedCaption === style.id && (
                      <span style={{ fontSize: 9, color: "#22c55e", fontWeight: 700, textTransform: "uppercase" }}>Applied</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "custom" && (
          <div>
            {/* Caption Colours section */}
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 10, textTransform: "uppercase", letterSpacing: "1px" }}>
              Caption Colours
            </div>

            {/* Text colour */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Text colour</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="color"
                  value={customCaption.color}
                  onChange={e => setCustomCaption(c => ({ ...c, color: e.target.value }))}
                  style={{ width: 32, height: 28, borderRadius: 4, border: "1px solid #2b3442", background: "none", cursor: "pointer", padding: 2, flexShrink: 0 }}
                />
                <input
                  type="text"
                  value={customCaption.color}
                  onChange={e => setCustomCaption(c => ({ ...c, color: e.target.value }))}
                  style={{ ...inputStyle }}
                />
              </div>
            </div>

            {/* Background colour */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Background colour</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="color"
                  value={customCaption.bgColor.startsWith("rgba") ? "#000000" : customCaption.bgColor}
                  onChange={e => setCustomCaption(c => ({ ...c, bgColor: e.target.value }))}
                  disabled={customCaption.transparentBg}
                  style={{ width: 32, height: 28, borderRadius: 4, border: "1px solid #2b3442", background: "none", cursor: customCaption.transparentBg ? "not-allowed" : "pointer", padding: 2, flexShrink: 0, opacity: customCaption.transparentBg ? 0.4 : 1 }}
                />
                <input
                  type="text"
                  value={customCaption.transparentBg ? "transparent" : customCaption.bgColor}
                  onChange={e => setCustomCaption(c => ({ ...c, bgColor: e.target.value }))}
                  disabled={customCaption.transparentBg}
                  style={{ ...inputStyle, opacity: customCaption.transparentBg ? 0.4 : 1 }}
                />
              </div>
            </div>

            {/* Transparent bg toggle */}
            <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                id="transparentBg"
                checked={customCaption.transparentBg}
                onChange={e => setCustomCaption(c => ({ ...c, transparentBg: e.target.checked }))}
                style={{ accentColor: "var(--onyx-cyan)", cursor: "pointer" }}
              />
              <label htmlFor="transparentBg" style={{ fontSize: 11, color: "#94a3b8", cursor: "pointer" }}>
                Transparent background
              </label>
            </div>

            {/* Karaoke highlight colour */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--onyx-text-faint)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Karaoke Highlight</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="color"
                  value={customCaption.highlightColor || "#ffe566"}
                  onChange={e => setCustomCaption(c => ({ ...c, highlightColor: e.target.value }))}
                  style={{ width: 32, height: 26, border: "none", background: "none", cursor: "pointer", padding: 0 }}
                />
                <span style={{ fontSize: 11, color: "var(--onyx-text-dim)" }}>{customCaption.highlightColor || "#ffe566"}</span>
              </div>
            </div>

            {/* Position */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Position</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setCustomCaption(c => ({ ...c, position: "top" }))} style={posBtn("top")}>Top</button>
                <button onClick={() => setCustomCaption(c => ({ ...c, position: "middle" }))} style={posBtn("middle")}>Middle</button>
                <button onClick={() => setCustomCaption(c => ({ ...c, position: "bottom" }))} style={posBtn("bottom")}>Bottom</button>
              </div>
            </div>

            {/* Font */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Font</div>
              <select
                value={customCaption.font || "sans-serif"}
                onChange={e => setCustomCaption(c => ({ ...c, font: e.target.value }))}
                style={{ width: "100%", background: "var(--input-bg)", border: "0.5px solid var(--onyx-hairline-strong)", borderRadius: 6, padding: "7px 10px", color: "var(--onyx-text)", fontSize: 12, outline: "none" }}
              >
                {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>

            {/* Font size */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>
                Font size — <span style={{ color: "#e2e8f0" }}>{customCaption.fontSize}px</span>
              </div>
              <input
                type="range"
                min={12} max={36} step={1}
                value={customCaption.fontSize}
                onChange={e => setCustomCaption(c => ({ ...c, fontSize: Number(e.target.value) }))}
                style={{ width: "100%", accentColor: "var(--onyx-cyan)" }}
              />
            </div>

            {/* Font */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Font</div>
              <select
                value={customCaption.font}
                onChange={e => setCustomCaption(c => ({ ...c, font: e.target.value }))}
                style={{ ...inputStyle }}
              >
                {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>

            {/* Preview strip */}
            <div style={{
              borderRadius: 6, overflow: "hidden", marginBottom: 16,
              border: "1px solid #2b3442",
            }}>
              <div style={{
                background: "linear-gradient(135deg, #1a2035 0%, #111827 50%, #0d1420 100%)",
                display: "flex", alignItems: "flex-end", justifyContent: "center",
                minHeight: 60, paddingBottom: 10,
              }}>
                <div style={{
                  background: customPreviewBg,
                  color: customCaption.color,
                  fontFamily: customCaption.font,
                  fontSize: Math.min(customCaption.fontSize, 18),
                  padding: "4px 14px",
                  borderRadius: 2,
                }}>
                  Preview caption text
                </div>
              </div>
              <div style={{ padding: "5px 12px", background: "var(--onyx-surface)", fontSize: 10, color: "#64748b" }}>
                {customCaption.font} · {customCaption.fontSize}px · {customCaption.position}
              </div>
            </div>

            {/* Apply custom caption */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <button
                onClick={() => applyCustomCaption("this")}
                style={{
                  flex: 1, padding: "7px 0", borderRadius: 4, fontSize: 11, fontWeight: 700,
                  background: "var(--chip-bg-strong)", border: "1px solid var(--onyx-cyan)",
                  color: "#93c5fd", cursor: "pointer",
                }}
              >
                Apply to this scene
              </button>
              <button
                onClick={() => applyCustomCaption("all")}
                style={{
                  flex: 1, padding: "7px 0", borderRadius: 4, fontSize: 11, fontWeight: 700,
                  background: "var(--btn-primary-grad)", border: "none", color: "var(--btn-primary-text)",
                  cursor: "pointer",
                }}
              >
                Apply to all
              </button>
            </div>

            {/* Custom Palette section */}
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 10, textTransform: "uppercase", letterSpacing: "1px" }}>
              Custom Palette
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {customPalette.map((color, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <input
                    type="color"
                    value={color}
                    onChange={e => {
                      const next = [...customPalette];
                      next[i] = e.target.value;
                      setCustomPalette(next);
                    }}
                    style={{ width: "100%", height: 32, borderRadius: 4, border: "1px solid #2b3442", background: "none", cursor: "pointer", padding: 2 }}
                  />
                  <div style={{ fontSize: 9, color: "#64748b", letterSpacing: "0.3px" }}>{color}</div>
                </div>
              ))}
            </div>

            {/* Preset palettes */}
            <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "1px" }}>
              Preset Palettes
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
              {PRESET_PALETTES.map(preset => (
                <button
                  key={preset.name}
                  onClick={() => setCustomPalette([...preset.colors])}
                  style={{
                    display: "flex", alignItems: "center", gap: 5, padding: "6px 8px",
                    borderRadius: 5, border: "0.5px solid var(--onyx-hairline-strong)", background: "var(--input-bg)",
                    cursor: "pointer", textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                    {preset.colors.map((c, i) => (
                      <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c, border: "1px solid rgba(255,255,255,0.1)" }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 10, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{preset.name}</span>
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <button
                onClick={() => applyCustomPalette("this")}
                style={{
                  flex: 1, padding: "7px 0", borderRadius: 4, fontSize: 11, fontWeight: 700,
                  background: "var(--chip-bg-strong)", border: "1px solid var(--onyx-cyan)",
                  color: "#93c5fd", cursor: "pointer",
                }}
              >
                Apply to this scene
              </button>
              <button
                onClick={() => applyCustomPalette("all")}
                style={{
                  flex: 1, padding: "7px 0", borderRadius: 4, fontSize: 11, fontWeight: 700,
                  background: "var(--btn-primary-grad)", border: "none", color: "var(--btn-primary-text)",
                  cursor: "pointer",
                }}
              >
                Apply to all
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pictory-style sticky apply bar — appears when something is selected */}
      {hasPending && (
        <div style={{
          borderTop: "0.5px solid var(--onyx-hairline)",
          background: "#0d1117",
          padding: "10px 12px",
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "1px" }}>
            Apply {pending.item.label} to
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                if (pending.type === "theme") applyTheme(pending.item, "this");
                else applyCaption(pending.item, "this");
              }}
              style={{
                flex: 1, padding: "7px 0", borderRadius: 4, fontSize: 11, fontWeight: 700,
                background: "var(--chip-bg-strong)", border: "1px solid var(--onyx-cyan)",
                color: "#93c5fd", cursor: "pointer",
              }}
            >
              This scene
            </button>
            <button
              onClick={() => {
                if (pending.type === "theme") applyTheme(pending.item, "all");
                else applyCaption(pending.item, "all");
              }}
              style={{
                flex: 1, padding: "7px 0", borderRadius: 4, fontSize: 11, fontWeight: 700,
                background: "var(--btn-primary-grad)", border: "none", color: "var(--btn-primary-text)",
                cursor: "pointer",
              }}
            >
              All scenes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
