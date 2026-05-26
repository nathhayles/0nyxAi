import { buildScenesFromAnalysis, buildScenesFromScript } from "./sceneEngine";

function pickByIndex(list, index) {
  if (!Array.isArray(list) || list.length === 0) return null;
  return list[index % list.length];
}

function cleanQueryText(value = "") {
  return String(value || "")
    .replace(/\r\n/g, " ")
    .replace(/\n/g, " ")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSceneSearchBase(scene) {
  if (scene?.stockQuery) return cleanQueryText(scene.stockQuery);
  const fromAction = cleanQueryText(String(scene?.action || "").split(",")[0]);
  const fromNarration = cleanQueryText(scene?.narration || "");
  const seed = fromAction || fromNarration || "business";
  const words = seed.split(/\s+/).filter(Boolean);
  return words.slice(0, 8).join(" ").trim() || "business";
}

function buildVariedQuery(baseQuery, index = 0) {
  const base = cleanQueryText(baseQuery) || "business";
  const suffix =
    index % 3 === 0
      ? "wide shot"
      : index % 3 === 1
      ? "close up"
      : "cinematic";

  return `${base} ${suffix}`.trim();
}

function normalizeMediaResult(picked, mediaType, query) {
  const mediaUrl =
    picked?.full ||
    picked?.url ||
    picked?.videoUrl ||
    picked?.link ||
    picked?.files?.[0]?.link ||
    null;

  if (!mediaUrl || !String(mediaUrl).startsWith("http")) {
    return null;
  }

  return {
    mediaUrl,
    mediaType,
    stockSource: "stock",
    stockQuery: query,
    stockAssetId: picked?.id ?? null,
    stockThumb:
      picked?.thumb ||
      picked?.thumbnail ||
      picked?.preview ||
      picked?.image ||
      mediaUrl,
  };
}

async function fetchStockVideo(query, index = 0, token, orientation = "landscape", minDuration = 0) {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const durationParam = minDuration > 0 ? `&min_duration=${minDuration}` : '';
    const res = await fetch(`/api/stock/videos?q=${encodeURIComponent(query)}&per_page=5&orientation=${orientation}${durationParam}`, { headers });

    let videos = res.ok ? ((await res.json().catch(() => ({}))).videos || []) : [];

    if (videos.length === 0 && minDuration > 0) {
      const fallbackRes = await fetch(`/api/stock/videos?q=${encodeURIComponent(query)}&per_page=5&orientation=${orientation}`, { headers });
      videos = fallbackRes.ok ? ((await fallbackRes.json().catch(() => ({}))).videos || []) : [];
    }

    const picked = pickByIndex(videos, index);
    if (!picked) return null;

    return normalizeMediaResult(picked, "video", query);
  } catch {
    return null;
  }
}

async function fetchStockImage(query, index = 0, token, orientation = "landscape") {
  try {
    const res = await fetch(`/api/stock/search?q=${encodeURIComponent(query)}&per_page=5&orientation=${orientation}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) return null;

    const data = await res.json().catch(() => ({}));
    const picked = pickByIndex(data?.images, index);
    if (!picked) return null;

    return normalizeMediaResult(picked, "image", query);
  } catch {
    return null;
  }
}

function buildFallbackImage(query) {
  const fallbackUrl = `https://source.unsplash.com/1600x900/?${encodeURIComponent(query)}`;

  return {
    mediaUrl: fallbackUrl,
    mediaType: "image",
    stockSource: "fallback",
    stockQuery: query,
    stockAssetId: null,
    stockThumb: fallbackUrl,
  };
}

export async function generateStoryboardFromScript({ script, theme, onProgress, token, orientation = "landscape" }) {
  onProgress?.({ step: "Analysing script", percent: 10 });

  let analysisResult = null;
  try {
    const analyseRes = await fetch('/api/analyse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ script, voices: [], theme, ratio: orientation === 'portrait' ? '9:16' : '16:9' }),
    });
    if (analyseRes.ok) analysisResult = await analyseRes.json();
  } catch (err) {
    console.warn('[createStoryboard] analyse failed, using fallback splitter:', err);
  }

  // Use GPT analysis if available, fall back to word-count splitter
  let scenes;
  if (analysisResult?.scenes?.length) {
    scenes = buildScenesFromAnalysis(analysisResult.scenes, theme);
  } else {
    scenes = buildScenesFromScript(script, theme);
  }

  if (!scenes.length) {
    throw new Error("No scenes could be generated from the provided script.");
  }

  onProgress?.({ step: "Building storyboard", percent: 45 });

  const enriched = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];

    onProgress?.({
      step: `Assigning media (${i + 1}/${scenes.length})`,
      percent: Math.min(90, 45 + Math.round(((i + 1) / scenes.length) * 45)),
    });

    const stockBaseQuery = buildSceneSearchBase(scene);
    const stockQuery = buildVariedQuery(stockBaseQuery, i);

    const narrationWords = (scene.narration || '').split(/\s+/).filter(Boolean).length;
    const minDuration = narrationWords > 0 ? Math.max(4, Math.ceil(narrationWords / 2.2)) : 0;

    let media = await fetchStockVideo(stockQuery, i, token, orientation, minDuration);

    if (!media) {
      media = await fetchStockImage(stockQuery, i, token, orientation);
    }

    if (!media) {
      // Try simple fallback query with no duration filter
      const simpleQuery = stockBaseQuery.split(' ')[0] || 'background';
      media = await fetchStockVideo(simpleQuery, i, token, orientation, 0);
    }

    if (!media) {
      media = await fetchStockImage(stockBaseQuery, i, token, orientation);
    }

    if (!media) {
      media = buildFallbackImage(stockQuery);
    }

    enriched.push({
      ...scene,
      mediaUrl: media.mediaUrl,
      mediaType: media.mediaType,
      url: media.mediaUrl,
      thumbnail: media.stockThumb || media.mediaUrl,
      stockBaseQuery,
      stockQuery,
      stockVariation: stockQuery,
      stockSource: media.stockSource || "stock",
      stockAssetId: media.stockAssetId || null,
      stockThumb: media.stockThumb || media.mediaUrl,
      voiceId: "alloy",
      voiceName: "Alloy",
      voiceProvider: "openai",
    });
  }

  onProgress?.({ step: "Finalizing", percent: 100 });

  return enriched;
}
