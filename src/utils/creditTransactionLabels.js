// Plain-English labels for credit_transactions.reason, keyed by the exact
// reason string every deductCredits/refundCredits call site in the backend
// passes (see lib/creditGate.js, lib/creditTransactions.js). New reason
// strings appear whenever a route adopts the shared credit-gate pattern --
// add a row here, no backend change or redeploy needed. Anything not
// listed (including any reason string introduced after this file was
// written) falls through to prettifyReason() below rather than breaking.
//
// `describe(metadata)` is optional -- when present, its return value (if
// any) is appended to the label as "Label — detail". Keep these terse;
// they render inline in a single activity row.
const MODEL_DISPLAY_NAMES = {
  "wan-2.5": "Wan 2.5",
  "wan-2.7": "Wan 2.7",
  "veo-3.1": "Veo 3.1",
  "seedance-2.0": "Seedance 2.0",
  "seedance-2.5": "Seedance 2.5",
  kling: "Kling",
};

function modelLabel(model) {
  if (!model) return null;
  return MODEL_DISPLAY_NAMES[model] || model;
}

function sceneDetail(metadata) {
  const parts = [];
  const model = modelLabel(metadata?.model);
  if (model) parts.push(model);
  if (metadata?.duration) parts.push(`${metadata.duration}s`);
  return parts.length ? parts.join(", ") : null;
}

export const REASON_LABELS = {
  // Video generation -- Kling/Wan/Veo/Seedance (all share kling_jobs/kling.js)
  kling_generate_scene: { label: "AI Video Generation", describe: sceneDetail },
  kling_generate_pipeline: { label: "AI Video Generation (Batch)", describe: (m) => m?.model ? `${modelLabel(m.model)}, ${m.sceneCount ?? "?"} scenes` : null },
  kling_refund_generate_error: { label: "AI Video Generation", refund: true, describe: sceneDetail },
  kling_refund_pipeline_error: { label: "AI Video Generation (Batch)", refund: true },
  kling_refund_orphaned_job: { label: "AI Video Generation", refund: true },
  kling_refund_failed_job: { label: "AI Video Generation", refund: true },
  kling_refund_sync_surcharge: { label: "Lip-Sync Surcharge", refund: true },

  // Video generation -- Luma (on ice, kept for historical rows)
  luma_generate_scene: { label: "AI Video Generation (Luma)" },
  luma_generate_pipeline: { label: "AI Video Generation (Luma, Batch)", describe: (m) => m?.sceneCount ? `${m.sceneCount} scenes` : null },
  luma_refund_generate_error: { label: "AI Video Generation (Luma)", refund: true },
  luma_refund_pipeline_error: { label: "AI Video Generation (Luma, Batch)", refund: true },

  // Upscale
  upscale_generate: { label: "Video Upscale", describe: (m) => m?.model || null },
  upscale_refund_submit_failed: { label: "Video Upscale", refund: true },
  upscale_refund_failed_job: { label: "Video Upscale", refund: true },
  upscale_refund_orphaned_job: { label: "Video Upscale", refund: true },

  // Export / render
  render_download: { label: "Reel Export", describe: (m) => m?.sceneCount ? `${m.sceneCount} scenes` : null },
  render_download_refund_stock_quota: { label: "Reel Export", refund: true },
  render_download_refund_failed_job: { label: "Reel Export", refund: true },

  // Conversion tools
  audio_to_video_transcribe: { label: "Audio to Video" },
  audio_to_video_transcribe_refund: { label: "Audio to Video", refund: true },
  video_to_reel_process: { label: "Video to Reel" },
  video_to_reel_process_refund: { label: "Video to Reel", refund: true },
  url_to_video_analyse: { label: "URL to Video" },
  url_to_video_analyse_refund: { label: "URL to Video", refund: true },
  ppt_to_video_extract: { label: "PPT to Video" },
  ppt_to_video_extract_refund: { label: "PPT to Video", refund: true },

  // Reel scoring
  score_reel_analyse: { label: "Reel Score — Analysis" },
  score_reel_analyse_refund: { label: "Reel Score — Analysis", refund: true },
  score_reel_generate: { label: "Reel Score — Generation" },
  score_reel_generate_refund: { label: "Reel Score — Generation", refund: true },

  // HeyGen
  heygen_avatar_video: { label: "AI Avatar Video", describe: (m) => m?.estimatedMins ? `~${m.estimatedMins} min` : null },
  heygen_photo_avatar_video: { label: "AI Photo Avatar Video", describe: (m) => m?.estimatedMins ? `~${m.estimatedMins} min` : null },
  heygen_translate: { label: "Video Translation", describe: (m) => m?.targetLanguage || null },

  // Scripting / analysis
  analyse_script: { label: "Script Analysis" },
  analyse_script_refund: { label: "Script Analysis", refund: true },
  analyse_caption: { label: "Caption Analysis" },
  analyse_caption_refund: { label: "Caption Analysis", refund: true },
  analyse_title: { label: "Title Analysis" },
  analyse_title_refund: { label: "Title Analysis", refund: true },

  // Content Plan
  content_plan_hook: { label: "Content Plan — Hook Generation" },

  // Viral Hooks
  viral_hooks_generate: { label: "Viral Hooks Generation" },
  viral_hooks_caption: { label: "Viral Hooks — Caption" },

  // Music
  suno_generate: { label: "AI Music Generation (Suno)" },
  suno_refund_generate_error: { label: "AI Music Generation (Suno)", refund: true },
  music_generate: { label: "AI Music Generation" },
  music_refund_generate_error: { label: "AI Music Generation", refund: true },

  // Fadr (audio analysis/stems/instrumental) -- fadr_<operation> is dynamic,
  // see the prefix handler below; these three are the known operations.
  fadr_analyse: { label: "Audio Analysis" },
  fadr_instrumental: { label: "Instrumental Track" },
  fadr_stems: { label: "Stem Separation" },
  fadr_refund_analyse_failed: { label: "Audio Analysis", refund: true },
  fadr_refund_stems_failed: { label: "Stem Separation", refund: true },
  fadr_refund_instrumental_missing_stem: { label: "Instrumental Track", refund: true },
  fadr_refund_instrumental_failed: { label: "Instrumental Track", refund: true },

  // Premium TTS
  tts_generate: { label: "Premium Voiceover", describe: (m) => m?.charCount ? `${m.charCount} characters` : null },

  // Account-level
  admin_grant: { label: "Credit Grant" },
  stripe_purchase: { label: "Credits Purchased" },

  // Legacy (pre-dates the current reason-string convention, kept so old
  // rows still render something sensible instead of falling through)
  regen_scene: { label: "Scene Regeneration" },
};

// Any fadr_<operation> not explicitly listed above (new Fadr operation
// added later) still gets a readable label instead of falling all the way
// through to prettifyReason's raw-string guess.
function fadrPrefixLabel(reason) {
  if (!reason.startsWith("fadr_") || reason.startsWith("fadr_refund_")) return null;
  const operation = reason.slice("fadr_".length);
  return { label: `${operation.charAt(0).toUpperCase()}${operation.slice(1)} (Fadr)` };
}

// Last-resort fallback for any reason string with no entry above --
// "content_plan_hook" -> "Content Plan Hook". Ensures a new reason string
// introduced by a future route never renders as raw snake_case.
function prettifyReason(reason) {
  return reason
    .replace(/_refund.*$/, "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Returns { label, detail, isRefund } for a credit_transactions row.
export function describeTransaction(reason, metadata) {
  const entry = REASON_LABELS[reason] || fadrPrefixLabel(reason);
  const isRefund = entry?.refund ?? /_refund/.test(reason);
  const label = entry?.label || prettifyReason(reason);
  const detail = entry?.describe ? entry.describe(metadata || {}) : null;
  return { label, detail, isRefund };
}
