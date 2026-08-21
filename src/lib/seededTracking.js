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
// frame for the best-matching patch (lowest sum-of-absolute-differences),
// same principle video codecs use for motion estimation. No WASM, no eval,
// no new dependency risk. Fully sufficient for this use case -- tracking a
// single point across a handful of discrete stills a few seconds apart, not
// dense real-time flow across every video frame.

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

function sad(prevGray, prevW, px, py, nextGray, nextW, nx, ny, half) {
  let total = 0;
  for (let dy = -half; dy <= half; dy++) {
    const prevRow = (py + dy) * prevW;
    const nextRow = (ny + dy) * nextW;
    for (let dx = -half; dx <= half; dx++) {
      total += Math.abs(prevGray[prevRow + px + dx] - nextGray[nextRow + nx + dx]);
    }
  }
  return total;
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
// window, by lowest SAD.
function searchWindow(prevGray, prevW, px, py, nextGray, nextW, patchHalf, xLo, xHi, yLo, yHi, step) {
  let bestScore = Infinity;
  let bestX = px;
  let bestY = py;
  for (let ny = yLo; ny <= yHi; ny += step) {
    for (let nx = xLo; nx <= xHi; nx += step) {
      const score = sad(prevGray, prevW, px, py, nextGray, nextW, nx, ny, patchHalf);
      if (score < bestScore) { bestScore = score; bestX = nx; bestY = ny; }
    }
  }
  return { bestScore, bestX, bestY };
}

// Two-level coarse-to-fine (pyramid) search -- the same principle real
// optical-flow implementations use, and for the same reason: a single-scale
// search can only afford a small radius (checking every pixel in a wide
// window is expensive), but real handheld 360 footage between samples 1.2s
// apart can move the subject well beyond what a cheap single-scale radius
// covers. Searching a WIDE radius at half resolution first (4x fewer pixels
// per candidate, so a much bigger radius costs the same as a small one at
// full res) finds the right neighborhood cheaply, then a small full-res
// refinement search around that locks in the precise position. Verified
// live against real footage: a single-scale 60px search tracked only 2 of
// 15 points before losing the subject; this pyramid approach is what
// actually fixes that, not just a bigger constant.
function trackPoint(prev, next, prevX, prevY, { patchHalf = 15, coarseRadius = 100, fineRadius = 16 } = {}) {
  if (
    prevX < patchHalf || prevX >= prev.width - patchHalf ||
    prevY < patchHalf || prevY >= prev.height - patchHalf
  ) return null;

  const prevHalf = downsample2x(prev);
  const nextHalf = downsample2x(next);
  const halfPatch = Math.max(4, patchHalf >> 1);
  const hx = Math.round(prevX / 2);
  const hy = Math.round(prevY / 2);
  if (
    hx < halfPatch || hx >= prevHalf.width - halfPatch ||
    hy < halfPatch || hy >= prevHalf.height - halfPatch
  ) return null;

  const coarseHalfRadius = coarseRadius >> 1;
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
  const px = Math.round(prevX);
  const py = Math.round(prevY);
  const seedX = Math.min(Math.max(patchHalf, coarse.bestX * 2), next.width - patchHalf - 1);
  const seedY = Math.min(Math.max(patchHalf, coarse.bestY * 2), next.height - patchHalf - 1);
  const xLo = Math.max(patchHalf, seedX - fineRadius);
  const xHi = Math.min(next.width - patchHalf - 1, seedX + fineRadius);
  const yLo = Math.max(patchHalf, seedY - fineRadius);
  const yHi = Math.min(next.height - patchHalf - 1, seedY + fineRadius);
  const fine = searchWindow(prev.gray, prev.width, px, py, next.gray, next.width, patchHalf, xLo, xHi, yLo, yHi, 1);

  // Normalize by patch area so the threshold means the same thing
  // regardless of patch size -- an average per-pixel difference above
  // ~40/255 is a poor match (wrong subject/background, not just lighting
  // drift), treated as tracking loss.
  const patchPixels = (patchHalf * 2 + 1) ** 2;
  const avgDiff = fine.bestScore / patchPixels;
  if (avgDiff > 40) return null;

  return { x: fine.bestX, y: fine.bestY };
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
// the search window is actually sized around). Verified live against real
// handheld skydive footage (real camera shake, not clean lab conditions):
// an evenly-spread-across-duration approach on a ~20s clip put samples
// ~2.5-3s apart and lost the subject after just 1 point; 1.2s spacing with
// this radius tracked reliably.
export async function runSeededTracking({ seed, fetchPreviewAt, sceneDuration, sampleIntervalSec = 1.2 }) {
  const timestamps = [seed.t];
  for (let t = seed.t + sampleIntervalSec; t <= sceneDuration + 1e-6; t += sampleIntervalSec) {
    timestamps.push(t);
  }

  const results = [];
  let prevFrame = null;
  let trackedX = null;
  let trackedY = null;

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
      trackedX = seed.xNorm * frame.width;
      trackedY = seed.yNorm * frame.height;
      results.push({ t, yaw: seed.xNorm * 360 - 180, pitch: 90 - seed.yNorm * 180 });
      prevFrame = frame;
      continue;
    }

    const tracked = trackPoint(prevFrame, frame, trackedX, trackedY);
    if (!tracked) break;

    trackedX = tracked.x;
    trackedY = tracked.y;
    results.push({
      t,
      yaw: (trackedX / frame.width) * 360 - 180,
      pitch: 90 - (trackedY / frame.height) * 180,
    });
    prevFrame = frame;
  }

  return results;
}
