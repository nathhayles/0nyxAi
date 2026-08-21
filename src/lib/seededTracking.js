// Tracks one clicked subject point forward through a scene using template
// (block) matching -- NOT optical flow via OpenCV.js. That was the first
// approach tried here, but @techstark/opencv-js's WASM glue calls
// `new Function(...)` during init, which violates this site's CSP
// (script-src allows 'wasm-unsafe-eval' but deliberately NOT 'unsafe-eval' --
// confirmed live, the exact error: "Evaluating a string as JavaScript
// violates... 'unsafe-eval' is not an allowed source"). Loosening the CSP
// site-wide for one feature's convenience is a real security trade-off, not
// something to do unilaterally -- so this uses plain JS instead: extract a
// small patch around the last known point, search a window in the next
// frame for the best-matching patch, same principle video codecs use for
// motion estimation. No WASM, no eval, no new dependency risk. Fully
// sufficient for this use case -- tracking a single point across a handful
// of discrete stills a few seconds apart, not dense real-time flow across
// every video frame.

function loadImageToCanvas(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.onerror = () => reject(new Error("Failed to decode preview frame for tracking"));
    img.src = url;
  });
}

// Uint8ClampedArray grayscale buffer, one byte per pixel.
function canvasToGray(canvas) {
  const ctx = canvas.getContext("2d");
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0, p = 0; p < gray.length; i += 4, p++) {
    gray[p] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
  }
  return { gray, width, height };
}

// Normalized cross-correlation between the fixed reference patch (prev,
// centered at px/py) and a candidate patch (next, centered at nx/ny).
// Returns [-1, 1], higher is better. Unlike raw pixel-difference (SAD), NCC
// is invariant to brightness/contrast shifts between the two frames --
// real handheld 360 footage moving between sky, shade, and ground changes
// exposure between samples even when the subject hasn't moved much, which
// was defeating a SAD-based matcher on real footage (verified live).
function ncc(prevGray, prevW, px, py, nextGray, nextW, nx, ny, half) {
  let sumP = 0, sumQ = 0;
  const n = (half * 2 + 1) ** 2;
  for (let dy = -half; dy <= half; dy++) {
    const prevRow = (py + dy) * prevW;
    const nextRow = (ny + dy) * nextW;
    for (let dx = -half; dx <= half; dx++) {
      sumP += prevGray[prevRow + px + dx];
      sumQ += nextGray[nextRow + nx + dx];
    }
  }
  const meanP = sumP / n;
  const meanQ = sumQ / n;

  let num = 0, denP = 0, denQ = 0;
  for (let dy = -half; dy <= half; dy++) {
    const prevRow = (py + dy) * prevW;
    const nextRow = (ny + dy) * nextW;
    for (let dx = -half; dx <= half; dx++) {
      const p = prevGray[prevRow + px + dx] - meanP;
      const q = nextGray[nextRow + nx + dx] - meanQ;
      num += p * q;
      denP += p * p;
      denQ += q * q;
    }
  }
  const denom = Math.sqrt(denP * denQ);
  return denom < 1e-6 ? 0 : num / denom;
}

// Simple 2x2-box downsample -- halves resolution on both axes.
function downsample2x({ gray, width, height }) {
  const w2 = width >> 1;
  const h2 = height >> 1;
  const out = new Uint8ClampedArray(w2 * h2);
  for (let y = 0; y < h2; y++) {
    for (let x = 0; x < w2; x++) {
      const x0 = x * 2;
      const y0 = y * 2;
      const a = gray[y0 * width + x0];
      const b = gray[y0 * width + x0 + 1];
      const c = gray[(y0 + 1) * width + x0];
      const d = gray[(y0 + 1) * width + x0 + 1];
      out[y * w2 + x] = (a + b + c + d) >> 2;
    }
  }
  return { gray: out, width: w2, height: h2 };
}

// Exhaustive (stepped) search for the best-matching patch center within a
// window, by highest NCC.
function searchWindow(prevGray, prevW, px, py, nextGray, nextW, patchHalf, xLo, xHi, yLo, yHi, step) {
  let bestScore = -Infinity;
  let bestX = px;
  let bestY = py;
  for (let ny = yLo; ny <= yHi; ny += step) {
    for (let nx = xLo; nx <= xHi; nx += step) {
      const score = ncc(prevGray, prevW, px, py, nextGray, nextW, nx, ny, patchHalf);
      if (score > bestScore) { bestScore = score; bestX = nx; bestY = ny; }
    }
  }
  return { bestScore, bestX, bestY };
}

// Two-level coarse-to-fine (pyramid) search -- the same principle real
// optical-flow implementations use, and for the same reason: a single-scale
// search can only afford a small radius (checking every pixel in a wide
// window is expensive), but real handheld 360 footage between samples can
// move the subject well beyond what a cheap single-scale radius covers.
// Searching a WIDE radius at half resolution first (4x fewer pixels per
// candidate, so a much bigger radius costs the same as a small one at full
// res) finds the right neighborhood cheaply, then a small full-res
// refinement search around that locks in the precise position.
//
// searchCenter (not necessarily prevX/prevY) -- lets the caller center the
// search on a MOTION-PREDICTED position instead of just the last known
// point, which matters when the subject is consistently moving/turning in
// one direction (a "search around where it was" approach systematically
// lags a moving subject). radiusScale widens the search when retrying after
// a skipped/lost sample, since more real time (and therefore more possible
// displacement) has passed since the last confirmed position.
function trackPoint(prev, next, searchCenterX, searchCenterY, { patchHalf = 15, coarseRadius = 100, fineRadius = 16, radiusScale = 1 } = {}) {
  const px = Math.round(searchCenterX);
  const py = Math.round(searchCenterY);
  if (
    px < patchHalf || px >= prev.width - patchHalf ||
    py < patchHalf || py >= prev.height - patchHalf
  ) return null;

  const prevHalf = downsample2x(prev);
  const nextHalf = downsample2x(next);
  const halfPatch = Math.max(4, patchHalf >> 1);
  const hx = Math.round(px / 2);
  const hy = Math.round(py / 2);
  if (
    hx < halfPatch || hx >= prevHalf.width - halfPatch ||
    hy < halfPatch || hy >= prevHalf.height - halfPatch
  ) return null;

  const coarseHalfRadius = Math.round((coarseRadius * radiusScale) / 2);
  const hxLo = Math.max(halfPatch, hx - coarseHalfRadius);
  const hxHi = Math.min(nextHalf.width - halfPatch - 1, hx + coarseHalfRadius);
  const hyLo = Math.max(halfPatch, hy - coarseHalfRadius);
  const hyHi = Math.min(nextHalf.height - halfPatch - 1, hy + coarseHalfRadius);
  const coarse = searchWindow(
    prevHalf.gray, prevHalf.width, hx, hy,
    nextHalf.gray, nextHalf.width, halfPatch,
    hxLo, hxHi, hyLo, hyHi, 1,
  );

  // Coarse hit, scaled back to full resolution, seeds the fine search.
  const fineRadiusScaled = Math.round(fineRadius * radiusScale);
  const seedX = Math.min(Math.max(patchHalf, coarse.bestX * 2), next.width - patchHalf - 1);
  const seedY = Math.min(Math.max(patchHalf, coarse.bestY * 2), next.height - patchHalf - 1);
  const xLo = Math.max(patchHalf, seedX - fineRadiusScaled);
  const xHi = Math.min(next.width - patchHalf - 1, seedX + fineRadiusScaled);
  const yLo = Math.max(patchHalf, seedY - fineRadiusScaled);
  const yHi = Math.min(next.height - patchHalf - 1, seedY + fineRadiusScaled);
  const fine = searchWindow(prev.gray, prev.width, px, py, next.gray, next.width, patchHalf, xLo, xHi, yLo, yHi, 1);

  // NCC of 1.0 is a perfect match, 0 is no correlation at all -- 0.5 is a
  // real, meaningfully-correlated match while still tolerating the natural
  // appearance change of a moving subject between samples (verified live:
  // stricter thresholds rejected genuinely-correct matches on real footage
  // with continuous subject motion).
  if (fine.bestScore < 0.5) return null;

  return { x: fine.bestX, y: fine.bestY };
}

function clampPitch(p) {
  return Math.max(-90, Math.min(90, p));
}
function wrapYaw(y) {
  let w = y % 360;
  if (w > 180) w -= 360;
  if (w < -180) w += 360;
  return w;
}

// Once tracking is genuinely lost (not just a single skipped sample -- see
// maxSkip below) for the rest of the scene, holding the last framing static
// reads as a technical failure (a "stall"), and having the search keep
// hunting around for a lost subject would look nervous/jittery on screen.
// Instead: a slow, decaying continuation of whatever drift was already
// happening, eased into a gentle zoom-out. A zoom-out reads as a deliberate
// creative choice regardless of what's actually in frame (no assumption
// needed about where anything interesting is), and matches the same
// "reveal" technique already used deliberately elsewhere in this app's
// reframe360 keyframing. Capped small so it can't wander into empty sky.
function buildArtisticFallbackTail(lastResults, sceneDuration, baseFov) {
  if (lastResults.length === 0) return [];
  const last = lastResults[lastResults.length - 1];
  if (last.t >= sceneDuration - 1e-6) return [];

  const prev = lastResults.length >= 2 ? lastResults[lastResults.length - 2] : null;
  const dt = prev ? Math.max(0.1, last.t - prev.t) : 1;
  const yawVelocity = prev ? wrapYaw(last.yaw - prev.yaw) / dt : 0;
  const pitchVelocity = prev ? (last.pitch - prev.pitch) / dt : 0;

  const remaining = sceneDuration - last.t;
  const midT = last.t + remaining * 0.5;

  // Establish the starting zoom level explicitly at the exact point
  // tracking stopped, so the widen-out transition begins smoothly from
  // whatever framing was already in effect, not a jump.
  const startPoint = { t: last.t + 0.01, yaw: last.yaw, pitch: clampPitch(last.pitch), fov: baseFov };
  // Half-decayed drift, partway zoomed out.
  const midPoint = {
    t: midT,
    yaw: wrapYaw(last.yaw + yawVelocity * remaining * 0.25),
    pitch: clampPitch(last.pitch + pitchVelocity * remaining * 0.25),
    fov: baseFov + (110 - baseFov) * 0.6,
  };
  // Settled, wide establishing framing by the end of the scene.
  const endPoint = {
    t: sceneDuration,
    yaw: wrapYaw(last.yaw + yawVelocity * remaining * 0.35),
    pitch: clampPitch(last.pitch + pitchVelocity * remaining * 0.35),
    fov: 110,
  };

  return [startPoint, midPoint, endPoint];
}

// seed: {t, xNorm, yNorm} -- normalized [0,1] position of the user's
// original click on the equirect preview at time seed.t (derive from an
// existing {yaw,pitch} keyframe via xNorm=(yaw+180)/360, yNorm=(90-pitch)/180).
// fetchPreviewAt: async (t) => object URL of the equirect preview JPEG at
// that timestamp (reuses fetchLocalDualFisheyePreview -- no upload, same
// local-still pipeline the manual click UI already uses).
// sceneDuration: total clip duration in seconds.
// sampleIntervalSec: fixed spacing between tracked samples (NOT count-based
// evenly-spread-across-duration -- a fixed interval keeps inter-sample
// displacement roughly constant regardless of clip length, which is what
// the search window is actually sized around).
//
// Returns { keyframes, trackedCount, expectedCount } -- keyframes includes
// both the successfully-tracked points AND (if tracking was lost before the
// scene ended) the artistic fallback tail, so the caller gets a complete,
// good-looking keyframe path for the whole scene either way. trackedCount/
// expectedCount describe only the real tracked portion, for UI reporting.
export async function runSeededTracking({ seed, fetchPreviewAt, sceneDuration, sampleIntervalSec = 1.2, maxSkip = 2, baseFov = 70 }) {
  const timestamps = [seed.t];
  for (let t = seed.t + sampleIntervalSec; t <= sceneDuration + 1e-6; t += sampleIntervalSec) {
    timestamps.push(t);
  }
  const expectedCount = timestamps.length;

  const results = [];
  let lastGoodFrame = null;
  let lastGoodX = null;
  let lastGoodY = null;
  let lastGoodT = null;
  let skipStreak = 0;

  for (let i = 0; i < timestamps.length; i++) {
    const t = timestamps[i];
    const url = await fetchPreviewAt(t);
    let canvas;
    try {
      canvas = await loadImageToCanvas(url);
    } finally {
      URL.revokeObjectURL(url);
    }
    const frame = canvasToGray(canvas);

    if (i === 0) {
      lastGoodX = seed.xNorm * frame.width;
      lastGoodY = seed.yNorm * frame.height;
      lastGoodT = t;
      results.push({ t, yaw: seed.xNorm * 360 - 180, pitch: 90 - seed.yNorm * 180 });
      lastGoodFrame = frame;
      continue;
    }

    // Motion-predicted search center: extrapolate from the last TWO
    // confirmed points (constant-velocity) rather than searching around
    // just the last known position, which systematically lags a subject
    // that's continuously moving/turning in one direction. Falls back to
    // the last known position when there's no velocity yet (first step, or
    // right after a skip) or no elapsed time to extrapolate over.
    //
    // Damped to 50% -- verified live that a full-weight 2-point velocity
    // estimate compounds: one slightly-off match nudges the next search
    // center further in the same direction, which nudges the next one
    // further still, snowballing into a runaway drift (observed live:
    // pitch walked steadily from 0deg to -90deg and got stuck at the
    // equirect projection's nadir pole -- a real failure mode, since that
    // region is heavily warped, low-detail, repetitive ground texture that
    // spuriously matches almost anywhere once the search drifts there).
    // Damping means a real, consistent motion still gets tracked (it keeps
    // reinforcing itself every step), while a one-off noisy estimate decays
    // rather than compounding.
    const elapsed = t - lastGoodT;
    let searchCenterX = lastGoodX;
    let searchCenterY = lastGoodY;
    if (results.length >= 2) {
      const prevResult = results[results.length - 2];
      const lastResult = results[results.length - 1];
      const resultDt = Math.max(0.1, lastResult.t - prevResult.t);
      const vx = (lastGoodX - (prevResult._x ?? lastGoodX)) / resultDt;
      const vy = (lastGoodY - (prevResult._y ?? lastGoodY)) / resultDt;
      const damping = 0.5;
      searchCenterX = lastGoodX + vx * elapsed * damping;
      searchCenterY = lastGoodY + vy * elapsed * damping;
    }

    const tracked = trackPoint(lastGoodFrame, frame, searchCenterX, searchCenterY, {
      radiusScale: 1 + skipStreak * 0.6,
    });

    // Reject matches landing in the equirect projection's near-pole band
    // (within ~12deg of straight up/down) -- that region is exactly the
    // degenerate, low-detail, repetitive-texture attractor described above.
    // A real subject landing there is rare (tracking would already be
    // pointed at a real face/body, not the sky or ground directly
    // overhead/underfoot); treating it as a failed match rather than a
    // successful one keeps the retry/fallback-tail logic in charge instead
    // of quietly reporting a wrong position.
    const trackedPitch = tracked ? 90 - (tracked.y / frame.height) * 180 : null;
    const nearPole = trackedPitch !== null && Math.abs(trackedPitch) > 78;

    if (!tracked || nearPole) {
      skipStreak++;
      if (skipStreak <= maxSkip) continue; // retry at the next sample, same last-good reference
      break; // genuinely lost -- stop tracking, fallback tail takes over below
    }

    skipStreak = 0;
    lastGoodX = tracked.x;
    lastGoodY = tracked.y;
    lastGoodT = t;
    lastGoodFrame = frame;
    results.push({
      t,
      yaw: (tracked.x / frame.width) * 360 - 180,
      pitch: trackedPitch,
      _x: tracked.x,
      _y: tracked.y,
    });
  }

  const trackedCount = results.length;
  const tail = buildArtisticFallbackTail(results, sceneDuration, baseFov);
  const keyframes = [...results, ...tail].map(({ t, yaw, pitch, fov }) =>
    fov !== undefined ? { t, yaw, pitch, fov } : { t, yaw, pitch }
  );

  return { keyframes, trackedCount, expectedCount };
}
