import { useState, useRef, useCallback, useEffect } from 'react';
import { getAuthHeaders } from '../utils/auth.js';
import { runSeededTracking } from '../lib/seededTracking.js';
import Reframe360Viewer from '../components/Reframe360Viewer.jsx';

const RATIOS = [
  { id: '9:16', label: '9:16', desc: 'TikTok / Reels / Shorts' },
  { id: '16:9', label: '16:9', desc: 'YouTube / Landscape' },
  { id: '1:1', label: '1:1', desc: 'Instagram Square' },
];

const MAX_FILE_BYTES = 4 * 1024 * 1024 * 1024; // 4GB per file, matches backend's multer limit and nginx's 5G client_max_body_size for /api/

// Equirect preview image is 1280x640 (2:1) -- a click maps directly to
// yaw/pitch with simple linear math, matching services/reframe360/reframe.js's
// renderPreviewFrame. No lens-shape math needed here since the preview is
// always rendered as flat equirectangular regardless of the source format.
const PREVIEW_W = 1280;
const PREVIEW_H = 640;

let sceneLocalId = 0;

let pairLocalId = 0;

export default function Reframe360() {
  // upload (add a scene) | batch-review (drop of >2 raw files, confirm
  // auto-paired groupings before any upload starts) | scenes (list, pick one
  // to keyframe, or render all) | keyframe (editing one scene) | rendering | done
  const [stage, setStage] = useState('upload');
  const [mode, setMode] = useState('single'); // 'single' (pre-stitched) | 'dual' (raw front/back lenses)
  const [singleFile, setSingleFile] = useState(null);
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [ratio, setRatio] = useState('9:16');
  const [frontThumb, setFrontThumb] = useState(null);
  const [backThumb, setBackThumb] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  // Local (pre-upload) keyframe marking for the direct 2-file dual-lens
  // path (as opposed to a batch-review pair -- same idea, separate state
  // since there's no pendingPairs entry for a single pair added outside a
  // batch drop).
  const [directLocalT, setDirectLocalT] = useState(2);
  const [directLocalPreviewUrl, setDirectLocalPreviewUrl] = useState(null);
  const [directLocalPreviewLoading, setDirectLocalPreviewLoading] = useState(false);
  const [directLocalPreviewError, setDirectLocalPreviewError] = useState(null);
  const [directLocalKeyframes, setDirectLocalKeyframes] = useState([]);
  const directLocalPreviewImgRef = useRef(null);

  // Live WebGL orbit-viewer mode (as opposed to the still-frame click flow
  // above) -- 'still' | 'live', toggled by the user, both writing into the
  // same directLocalKeyframes array.
  const [viewerMode, setViewerMode] = useState('still');
  const directViewerRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const recordingBufferRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  // Set by Reframe360Viewer's onError callback if three.js/WebGL init fails
  // (e.g. no WebGL support in this browser). The still-frame UI above is
  // never removed when this happens -- it's the fallback path, already
  // fully usable, so no separate degraded-mode UI needs building here.
  const [viewerError, setViewerError] = useState(null);

  // Set when a batch of >2 raw files is dropped at once (a full raw dump for
  // several scenes) -- [{id, frontFile, backFile, frontThumb, backThumb}],
  // reviewed and correctable (per-pair swap/remove) before any of them
  // actually upload.
  const [pendingPairs, setPendingPairs] = useState([]);
  const [trackingPairId, setTrackingPairId] = useState(null);
  const [trackingError, setTrackingError] = useState(null);
  const [skippedLrvCount, setSkippedLrvCount] = useState(0);
  const [batchUploadIndex, setBatchUploadIndex] = useState(null); // null = not uploading; else 0-based progress
  // { pairIndex, phase: 'uploading'|'combining', loadedBytes, pairTotalBytes,
  //   totalBatchBytes, bytesDoneBeforeThisPair, speedBps, phaseStartedAt }
  // -- 'combining' means the browser finished sending bytes but the server
  // hasn't responded yet: /api/reframe360/upload runs combineDualFisheyeLenses
  // (measured ~4.7x the clip's own length, for a downscaled dual-fisheye
  // combine) BEFORE it replies, so a real multi-minute recording can sit
  // "stuck" at 100% transferred for a long time with no bytes moving -- this
  // is expected, not a hang, and the UI needs to say so explicitly rather
  // than look broken.
  const [batchProgress, setBatchProgress] = useState(null);
  const [renderElapsedMs, setRenderElapsedMs] = useState(0);

  // Ordered list of scenes -- a real skydive job is 5-6 separate raw
  // recordings (ground interview, plane, freefall, canopy, landing, second
  // interview), each needing its own upload + keyframe pass since the
  // subject's position is completely different per section. This list's
  // order IS the final reel's section order.
  const [scenes, setScenes] = useState([]); // [{id, uploadId, inputFormat, duration, label, keyframes}]
  const [activeSceneId, setActiveSceneId] = useState(null);

  const [scrubTime, setScrubTime] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);

  const fileInputRef = useRef(null);
  const frontInputRef = useRef(null);
  const previewImgRef = useRef(null);

  const activeScene = scenes.find((s) => s.id === activeSceneId) || null;

  // Grabs a frame straight out of the local file in-browser, entirely
  // client-side (no upload involved) -- just enough to let you visually
  // confirm which raw file is which before committing to an upload, since
  // the front/back filename-sort guess below is a guess, not a certainty.
  function grabThumbnail(file) {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.src = URL.createObjectURL(file);
      const cleanup = () => URL.revokeObjectURL(video.src);
      video.onloadedmetadata = () => { video.currentTime = Math.min(1, video.duration / 2); };
      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 240;
          canvas.height = Math.round(240 * (video.videoHeight / video.videoWidth || 1));
          canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } catch {
          resolve(null);
        } finally {
          cleanup();
        }
      };
      video.onerror = () => { cleanup(); resolve(null); };
    });
  }

  function updateActiveScene(updater) {
    setScenes((prev) => prev.map((s) => (s.id === activeSceneId ? updater(s) : s)));
  }

  // --- Local (pre-upload) subject marking -----------------------------
  // Lets the user mark keyframes against the raw local files BEFORE the
  // multi-GB upload even starts, instead of waiting hours for the upload
  // to finish before they can see anything. Grabs one frame from each lens
  // file locally (no upload), replicates the server's dual-fisheye combine
  // (services/reframe360/reframe.js combineDualFisheyeLenses: transpose the
  // front lens 90 deg, transpose+hflip+vflip the back lens -- net effect is
  // front rotated 90 CW, back rotated 90 CCW -- then side-by-side), and
  // posts just that one combined still to /api/reframe360/preview-still for
  // the same v360 equirect reprojection the real preview uses. The
  // resulting click-to-yaw/pitch keyframes are stored against the pending
  // pair and seeded onto the scene once the real upload completes, so the
  // user's keyframing work isn't wasted or blocked on the transfer.

  function grabVideoFrameCanvas(file, t) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.src = URL.createObjectURL(file);
      const cleanup = () => URL.revokeObjectURL(video.src);
      video.onloadedmetadata = () => {
        video.currentTime = Math.min(Math.max(0, t), Math.max(0, video.duration - 0.05));
      };
      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.getContext('2d').drawImage(video, 0, 0);
          resolve(canvas);
        } catch (err) {
          reject(err);
        } finally {
          cleanup();
        }
      };
      video.onerror = () => { cleanup(); reject(new Error(`Could not decode ${file.name} locally in this browser.`)); };
    });
  }

  // Rotates a canvas 90deg clockwise (matches ffmpeg's transpose=1, used on
  // the front lens) or 90deg counter-clockwise (matches transpose=1 followed
  // by hflip+vflip -- a net 90CW+180 = 90CCW -- used on the back lens).
  function rotateCanvas90(srcCanvas, direction) {
    const out = document.createElement('canvas');
    out.width = srcCanvas.height;
    out.height = srcCanvas.width;
    const ctx = out.getContext('2d');
    if (direction === 'cw') {
      ctx.translate(out.width, 0);
      ctx.rotate(Math.PI / 2);
    } else {
      ctx.translate(0, out.height);
      ctx.rotate(-Math.PI / 2);
    }
    ctx.drawImage(srcCanvas, 0, 0);
    return out;
  }

  function hstackCanvases(leftCanvas, rightCanvas) {
    const out = document.createElement('canvas');
    out.width = leftCanvas.width + rightCanvas.width;
    out.height = Math.max(leftCanvas.height, rightCanvas.height);
    const ctx = out.getContext('2d');
    ctx.drawImage(leftCanvas, 0, 0);
    ctx.drawImage(rightCanvas, leftCanvas.width, 0);
    return out;
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Failed to encode local frame.'))), 'image/jpeg', 0.92);
    });
  }

  // Grabs one frame from each raw lens file at time t, combines them
  // client-side into the same dual-fisheye layout the server expects, and
  // posts the result to /preview-still for reprojection -- returns an
  // object URL for the equirect preview image. No upload of the source
  // files themselves, just one small composed JPEG.
  async function fetchLocalDualFisheyePreview(frontFile, backFile, t) {
    const [frontCanvas, backCanvas] = await Promise.all([
      grabVideoFrameCanvas(frontFile, t),
      grabVideoFrameCanvas(backFile, t),
    ]);
    const combined = hstackCanvases(rotateCanvas90(frontCanvas, 'ccw'), rotateCanvas90(backCanvas, 'cw'));
    const blob = await canvasToBlob(combined);

    const headers = await getAuthHeaders();
    const formData = new FormData();
    formData.append('still', blob, 'still.jpg');
    formData.append('inputFormat', 'dfisheye');
    const res = await fetch('/api/reframe360/preview-still', {
      method: 'POST',
      headers: { Authorization: headers.Authorization },
      body: formData,
    });
    if (!res.ok) {
      let msg = 'Local preview failed';
      try { msg = (await res.json()).error || msg; } catch { /* non-JSON error body */ }
      throw new Error(msg);
    }
    const outBlob = await res.blob();
    return URL.createObjectURL(outBlob);
  }

  function localPreviewClickToKeyframe(e, imgEl, t) {
    const rect = imgEl.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    return { t, yaw: x * 360 - 180, pitch: 90 - y * 180 };
  }

  const addSingleFile = useCallback((files) => {
    const f = files?.[0];
    if (!f) return;
    if (!/\.(mp4|mov|insv)$/i.test(f.name)) return setError('Please upload an MP4, MOV, or INSV file.');
    if (f.size > MAX_FILE_BYTES) return setError('File too large. Max 4GB.');
    setError('');
    setSingleFile(f);
  }, []);

  function onDrop(e) {
    e.preventDefault(); setDragging(false);
    addSingleFile(e.dataTransfer.files);
  }

  // Insta360's raw export naming, confirmed against Nathan's real camera
  // dump 2026-08-19: PREFIX_DATE_TIME_LENS_SEQ.insv, e.g.
  // VID_20260816_172249_00_001.insv + VID_20260816_172249_10_001.insv is one
  // true recording (same DATE_TIME, lens 00 vs 10). The camera ALSO writes a
  // low-res "LRV" scrubbing-proxy shadow copy per file (same convention
  // GoPro uses) -- these do NOT share the VID files' timestamp pairing
  // (confirmed live: two LRV files adjacent after a plain alphabetical sort
  // had DIFFERENT timestamps, so naive consecutive-pairing grouped two
  // unrelated proxy clips together as a fake "pair"). Real footage only ever
  // comes from VID_, so LRV_ is dropped entirely rather than uploaded and
  // rendered as garbage scenes.
  const INSTA360_NAME_RE = /^(LRV|VID)_(\d{8})_(\d{6})_(\d{2})_(\d{3})$/i;

  function parseInsta360Name(file) {
    const base = file.name.replace(/\.\w+$/, '');
    const m = base.match(INSTA360_NAME_RE);
    if (!m) return null;
    return { prefix: m[1].toUpperCase(), date: m[2], time: m[3] };
  }

  // Drop (or pick) raw lens files -- either one scene's front+back pair, or
  // an entire raw dump for several scenes at once (a real skydive job is
  // 5-6 sections x 2 lens files = up to a dozen+ files). No requirement to
  // know which file is which. A single pair goes straight into the existing
  // one-scene flow; more than one pair goes to a review screen so a wrong
  // grouping or wrong front/back guess is fixed before anything uploads.
  const addLensFiles = useCallback((files) => {
    const list = Array.from(files || []).filter(f => /\.(mp4|mov|insv)$/i.test(f.name));
    if (list.length < 2) return setError('Drop the raw lens files together (front + back, or a whole batch of scene pairs).');
    if (list.some(f => f.size > MAX_FILE_BYTES)) return setError('File too large. Max 4GB per file.');

    // Recognized Insta360 naming: group by real DATE+TIME (the actual
    // recording moment), not file order, and drop LRV proxies automatically.
    const parsed = list.map((f) => ({ file: f, meta: parseInsta360Name(f) }));
    const allRecognized = parsed.every((p) => p.meta);
    let sorted;
    let skippedCount = 0;

    if (allRecognized) {
      const vidOnly = parsed.filter((p) => p.meta.prefix === 'VID');
      skippedCount = parsed.length - vidOnly.length;
      const groups = new Map();
      for (const p of vidOnly) {
        const key = `${p.meta.date}_${p.meta.time}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(p.file);
      }
      const badGroup = [...groups.entries()].find(([, grpFiles]) => grpFiles.length !== 2);
      if (badGroup) {
        return setError(`Found ${badGroup[1].length} file(s) for recording ${badGroup[0]} instead of 2 (front + back) -- can't auto-pair that one. Check for a missing or duplicate file.`);
      }
      if (groups.size === 0) return setError('No VID_ recordings found in what was dropped -- only recognized LRV proxy files, which are skipped automatically.');
      sorted = [...groups.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .flatMap(([, grpFiles]) => grpFiles.sort((x, y) => x.name.localeCompare(y.name)));
    } else {
      if (list.length % 2 !== 0) return setError(`Got ${list.length} files -- raw lens files come in pairs (front + back per scene), so an odd count can't be auto-grouped. Drop them in complete pairs.`);
      sorted = [...list].sort((x, y) => x.name.localeCompare(y.name));
    }

    setError('');
    setSkippedLrvCount(skippedCount);

    if (sorted.length === 2) {
      const [a, b] = sorted;
      setFrontFile(a);
      setBackFile(b);
      setFrontThumb(null);
      setBackThumb(null);
      grabThumbnail(a).then(setFrontThumb);
      grabThumbnail(b).then(setBackThumb);
      setDirectLocalPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return null; });
      setDirectLocalPreviewError(null);
      setDirectLocalKeyframes([]);
      return;
    }

    const pairs = [];
    for (let i = 0; i < sorted.length; i += 2) {
      pairs.push({
        id: `pair-${++pairLocalId}`, frontFile: sorted[i], backFile: sorted[i + 1], frontThumb: null, backThumb: null,
        localT: 2, localPreviewUrl: null, localPreviewLoading: false, localPreviewError: null, localKeyframes: [],
        // Live WebGL orbit-viewer state, mirroring the top-level
        // viewerMode/isRecording/viewerError used by the direct (single-pair)
        // flow -- kept on the pair object itself (via updatePair) since
        // batch-review can have several pairs, each needing its own
        // independent live-viewer state.
        viewerMode: 'still', viewerError: null, isRecording: false,
      });
    }
    setPendingPairs(pairs);
    setStage('batch-review');
    pairs.forEach((p) => {
      grabThumbnail(p.frontFile).then((t) => setPendingPairs((prev) => prev.map((x) => (x.id === p.id ? { ...x, frontThumb: t } : x))));
      grabThumbnail(p.backFile).then((t) => setPendingPairs((prev) => prev.map((x) => (x.id === p.id ? { ...x, backThumb: t } : x))));
    });
  }, []);

  function onLensDrop(e) {
    e.preventDefault(); e.stopPropagation(); setDragging(false);
    addLensFiles(e.dataTransfer.files);
  }

  function swapPair(id) {
    // Swapping front/back changes frontFile/backFile props on this pair's
    // Reframe360Viewer, which re-runs its init effect and unmounts/remounts
    // the viewer -- same hazard as handleUpload's frontFile/backFile reset.
    // If this pair is mid-recording, stop it first so the interval doesn't
    // leak and startPairRecording's re-entrancy guard doesn't get stuck.
    const pair = pendingPairs.find((p) => p.id === id);
    if (pair && pairRecordingIntervalsRef.current.has(id)) {
      stopPairRecording(pair);
    }
    setPendingPairs((prev) => prev.map((p) => (p.id === id ? { ...p, frontFile: p.backFile, backFile: p.frontFile, frontThumb: p.backThumb, backThumb: p.frontThumb } : p)));
  }

  // Shared by every code path that drops a pair from pendingPairs (explicit
  // Remove, a finished batch upload, and the "start over" reset) so none of
  // them can forget to tear down this pair's live-recording state -- an
  // uncleared interval keeps firing forever against a now-gone viewer ref.
  function cleanupPairRecordingState(id) {
    const interval = pairRecordingIntervalsRef.current.get(id);
    if (interval) clearInterval(interval);
    pairRecordingIntervalsRef.current.delete(id);
    pairRecordingBuffersRef.current.delete(id);
    viewerRefsByPairId.current.delete(id);
  }

  function removePair(id) {
    cleanupPairRecordingState(id);
    setPendingPairs((prev) => prev.filter((p) => p.id !== id));
  }

  function updatePair(id, patch) {
    setPendingPairs((prev) => prev.map((p) => (p.id === id ? { ...p, ...(typeof patch === 'function' ? patch(p) : patch) } : p)));
  }

  async function grabLocalPreviewForPair(pair) {
    updatePair(pair.id, { localPreviewLoading: true, localPreviewError: null });
    try {
      const url = await fetchLocalDualFisheyePreview(pair.frontFile, pair.backFile, pair.localT);
      updatePair(pair.id, (p) => {
        if (p.localPreviewUrl) URL.revokeObjectURL(p.localPreviewUrl);
        return { localPreviewUrl: url };
      });
    } catch (err) {
      updatePair(pair.id, { localPreviewError: err.message });
    } finally {
      updatePair(pair.id, { localPreviewLoading: false });
    }
  }

  function addLocalKeyframeForPair(pair, e, imgEl) {
    const kf = localPreviewClickToKeyframe(e, imgEl, pair.localT);
    updatePair(pair.id, (p) => {
      const withoutCurrent = p.localKeyframes.filter((k) => Math.abs(k.t - pair.localT) > 0.05);
      return { localKeyframes: [...withoutCurrent, kf].sort((a, b) => a.t - b.t) };
    });
  }

  function removeLocalKeyframeForPair(pairId, t) {
    updatePair(pairId, (p) => ({ localKeyframes: p.localKeyframes.filter((k) => k.t !== t) }));
  }

  function getLocalVideoDuration(file) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.src = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        const d = video.duration;
        URL.revokeObjectURL(video.src);
        resolve(d);
      };
      video.onerror = () => { URL.revokeObjectURL(video.src); reject(new Error(`Could not read duration for ${file.name}.`)); };
    });
  }

  // Click once, track the rest: seeds from whichever keyframe is currently
  // marked at pair.localT (the still the user just clicked), then follows
  // that point forward through the scene via optical flow, auto-filling
  // the rest of the keyframes. Still fully editable afterward through the
  // exact same manual add/remove keyframe UI -- a tracking failure
  // (occlusion, motion blur, subject leaves frame) just means fewer
  // auto-filled points, not a broken state; the user adds a manual
  // correction click same as always.
  async function handleTrackSubject(pair) {
    setTrackingError(null);
    const seedKf = pair.localKeyframes.find((k) => Math.abs(k.t - pair.localT) <= 0.05);
    if (!seedKf) {
      setTrackingError('Mark the subject on the current still first (click the preview), then track.');
      return;
    }
    setTrackingPairId(pair.id);
    try {
      const duration = await getLocalVideoDuration(pair.frontFile);
      const seed = {
        t: seedKf.t,
        xNorm: (seedKf.yaw + 180) / 360,
        yNorm: (90 - seedKf.pitch) / 180,
      };
      const { keyframes: tracked, trackedCount, expectedCount } = await runSeededTracking({
        seed,
        fetchPreviewAt: (t) => fetchLocalDualFisheyePreview(pair.frontFile, pair.backFile, t),
        sceneDuration: duration,
      });
      updatePair(pair.id, (p) => {
        const trackedTimes = new Set(tracked.map((k) => k.t));
        const keptManual = p.localKeyframes.filter((k) => ![...trackedTimes].some((t) => Math.abs(t - k.t) <= 0.05));
        return { localKeyframes: [...keptManual, ...tracked].sort((a, b) => a.t - b.t) };
      });
      if (trackedCount < expectedCount) {
        setTrackingError(`Tracked ${trackedCount} of ${expectedCount} points before losing the subject -- added a slow zoom-out for the rest of the scene, but add manual corrections if you want tighter framing.`);
      }
    } catch (err) {
      setTrackingError(err.message);
    } finally {
      setTrackingPairId(null);
    }
  }

  // Live WebGL orbit-viewer refs for the batch-review flow -- one viewer
  // instance per pending pair (unlike the direct flow's single
  // directViewerRef), keyed by pair.id. Populated/cleared via the viewer's
  // ref callback in the batch-review JSX below.
  const viewerRefsByPairId = useRef(new Map());
  const pairRecordingBuffersRef = useRef(new Map());
  const pairRecordingIntervalsRef = useRef(new Map());

  // Viewer-backed equivalent of addLocalKeyframeForPair, mirroring
  // addDirectViewerKeyframe: reads the live WebGL orbit viewer's own camera
  // orientation directly and writes into pair.localKeyframes via updatePair.
  function addPairViewerKeyframe(pair) {
    const viewer = viewerRefsByPairId.current.get(pair.id);
    if (!viewer || !viewer.isReady) return;
    const { yaw, pitch, fov } = viewer.getCameraState();
    const t = viewer.getCurrentTime();
    updatePair(pair.id, (p) => ({
      localKeyframes: [...p.localKeyframes.filter((k) => Math.abs(k.t - t) > 0.05), { t, yaw, pitch, fov }].sort((a, b) => a.t - b.t),
    }));
  }

  // Mirrors startDirectRecording, per-pair: samples this pair's viewer
  // camera state on a fixed wall-clock interval into a buffer keyed by
  // pair.id, independent of any other pair's recording.
  function startPairRecording(pair) {
    if (pairRecordingIntervalsRef.current.has(pair.id)) return;
    const viewer = viewerRefsByPairId.current.get(pair.id);
    if (!viewer || !viewer.isReady) return;
    pairRecordingBuffersRef.current.set(pair.id, []);
    updatePair(pair.id, { isRecording: true });
    viewer.play();
    const interval = setInterval(() => {
      const v = viewerRefsByPairId.current.get(pair.id);
      if (!v || !v.isReady) return;
      const { yaw, pitch, fov } = v.getCameraState();
      const t = v.getCurrentTime();
      const buf = pairRecordingBuffersRef.current.get(pair.id) || [];
      buf.push({ t, yaw, pitch, fov });
      pairRecordingBuffersRef.current.set(pair.id, buf);
    }, 400);
    pairRecordingIntervalsRef.current.set(pair.id, interval);
  }

  // Mirrors stopDirectRecording, per-pair. Returns the merged keyframes
  // array synchronously (computed from the `pair` passed in, not a stale
  // closure) so a caller that needs the committed result immediately --
  // handleBatchUpload, since setState from updatePair isn't visible until
  // the next render -- doesn't read pair.localKeyframes from before this
  // call and silently upload without the just-recorded samples.
  function stopPairRecording(pair) {
    const interval = pairRecordingIntervalsRef.current.get(pair.id);
    if (interval) clearInterval(interval);
    pairRecordingIntervalsRef.current.delete(pair.id);
    updatePair(pair.id, { isRecording: false });
    const viewer = viewerRefsByPairId.current.get(pair.id);
    viewer?.pause();

    const recorded = pairRecordingBuffersRef.current.get(pair.id) || [];
    pairRecordingBuffersRef.current.delete(pair.id);
    if (recorded.length === 0) return pair.localKeyframes;
    const startT = Math.min(...recorded.map((k) => k.t));
    const endT = Math.max(...recorded.map((k) => k.t));
    const outsideRange = pair.localKeyframes.filter((k) => k.t < startT - 0.05 || k.t > endT + 0.05);
    const merged = [...outsideRange, ...recorded].sort((a, b) => a.t - b.t);
    updatePair(pair.id, { localKeyframes: merged });
    return merged;
  }

  // Same unmount-safety guard as the direct flow's useEffect above, applied
  // per-pair: if a pair's viewerMode flips away from 'live' (or its viewer
  // errors out) while it's recording, its Reframe360Viewer instance
  // unmounts, so its interval must be stopped the same clean way rather
  // than left firing against a stale ref.
  useEffect(() => {
    for (const p of pendingPairs) {
      if ((p.viewerMode !== 'live' || p.viewerError) && pairRecordingIntervalsRef.current.has(p.id)) {
        stopPairRecording(p);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPairs]);

  function movePair(id, dir) {
    setPendingPairs((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      const swapIdx = idx + dir;
      if (idx < 0 || swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }

  function formatBytes(n) {
    if (n >= 1024 ** 3) return (n / 1024 ** 3).toFixed(2) + ' GB';
    if (n >= 1024 ** 2) return (n / 1024 ** 2).toFixed(0) + ' MB';
    return (n / 1024).toFixed(0) + ' KB';
  }

  function formatDuration(totalSeconds) {
    if (!isFinite(totalSeconds) || totalSeconds < 0) return '...';
    const m = Math.floor(totalSeconds / 60);
    const s = Math.round(totalSeconds % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  // Real byte-level progress requires XHR -- fetch() doesn't expose upload
  // progress in a widely-supported way. onProgress fires with loaded===total
  // the instant the browser finishes sending, which is the signal the caller
  // uses to switch the UI into the "combining server-side" phase (see
  // batchProgress comment above) rather than leaving a dead-looking bar.
  function uploadOnePairXHR(frontFile, backFile, authHeader, onProgress) {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('front', frontFile);
      formData.append('back', backFile);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/reframe360/upload');
      xhr.setRequestHeader('Authorization', authHeader);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress({ loaded: e.loaded, total: e.total });
      };
      xhr.onload = () => {
        let data;
        try { data = JSON.parse(xhr.responseText); } catch { data = null; }
        if (xhr.status >= 200 && xhr.status < 300 && data) resolve(data);
        else reject(new Error(data?.error || `Upload failed (HTTP ${xhr.status})`));
      };
      xhr.onerror = () => reject(new Error('Network error during upload -- connection may have dropped'));
      xhr.send(formData);
    });
  }

  async function handleBatchUpload() {
    if (pendingPairs.length === 0) return setError('No scenes to upload -- add at least one pair back.');
    setError('');
    setBatchUploadIndex(0);
    const totalBatchBytes = pendingPairs.reduce((sum, p) => sum + p.frontFile.size + p.backFile.size, 0);
    let bytesDoneBeforeThisPair = 0;
    let uploadedCount = 0;
    try {
      for (let i = 0; i < pendingPairs.length; i++) {
        setBatchUploadIndex(i);
        const p = pendingPairs[i];
        const pairTotalBytes = p.frontFile.size + p.backFile.size;
        const phaseStartedAt = Date.now();
        setBatchProgress({ pairIndex: i, phase: 'uploading', loadedBytes: 0, pairTotalBytes, totalBatchBytes, bytesDoneBeforeThisPair, speedBps: 0, phaseStartedAt });

        // Fetched fresh for EVERY pair, not once for the whole batch -- a
        // large multi-scene upload can run long enough (network transfer +
        // the server-side lens-combine step per scene) that a token grabbed
        // once at the start of the batch can expire before a later scene's
        // request goes out. getAuthHeaders() already proactively refreshes
        // when a token is near expiry; the bug was never re-calling it.
        const headers = await getAuthHeaders();
        const data = await uploadOnePairXHR(p.frontFile, p.backFile, headers.Authorization, ({ loaded, total }) => {
          const elapsedSec = (Date.now() - phaseStartedAt) / 1000;
          const speedBps = elapsedSec > 0.2 ? loaded / elapsedSec : 0;
          setBatchProgress((prev) => (prev ? { ...prev, loadedBytes: loaded, speedBps, phase: loaded >= total ? 'combining' : 'uploading' } : prev));
        });

        bytesDoneBeforeThisPair += pairTotalBytes;
        uploadedCount++;
        // A pair can still be mid-recording when its upload finishes
        // (nothing gates upload start on isRecording) -- commit that
        // in-progress recording into keyframesForUpload BEFORE building the
        // scene object below, not just clean up its timer afterward, or the
        // just-recorded samples silently never make it into the uploaded
        // scene (same defect class fixed for handleUpload/swapLenses/
        // swapPair -- this was the one call site that fix wave missed).
        const keyframesForUpload = pairRecordingIntervalsRef.current.has(p.id)
          ? stopPairRecording(p)
          : (p.localKeyframes || []);
        // Added to the visible scene list the moment THIS ONE finishes,
        // not batched until the whole set completes -- so scene 1 is
        // already keyframe-able while scenes 2+ are still uploading.
        setScenes((prev) => [...prev, {
          id: `scene-${++sceneLocalId}`,
          uploadId: data.uploadId,
          inputFormat: data.inputFormat,
          duration: data.duration,
          label: `Scene ${prev.length + 1}`,
          sourceLabel: `${p.frontFile.name} + ${p.backFile.name}`,
          // Seeded from whatever the user marked locally before this scene's
          // upload finished (see fetchLocalDualFisheyePreview above) --
          // often already complete, so the scene can go straight to render
          // without a second keyframing pass.
          keyframes: keyframesForUpload,
        }]);
        // Clears the interval/buffer/viewer-ref Map entries -- a no-op for
        // the interval/buffer if stopPairRecording already ran above (both
        // deletes are idempotent), but viewerRefsByPairId still needs this
        // regardless since stopPairRecording never touches it.
        cleanupPairRecordingState(p.id);
        setPendingPairs((prev) => prev.filter((x) => x.id !== p.id));
      }
      setStage('scenes');
    } catch (err) {
      // Scenes that already succeeded were added to the list immediately as
      // each one finished (above), so there's nothing to salvage here --
      // just report what happened. The pair that actually failed is left in
      // pendingPairs (not removed) so it's easy to retry without re-picking
      // files.
      setError(`Scene ${uploadedCount + 1} of ${pendingPairs.length} failed: ${err.message}. ${uploadedCount} earlier scene(s) uploaded OK and were kept.`);
    } finally {
      setBatchUploadIndex(null);
      setBatchProgress(null);
    }
  }

  function swapLenses() {
    // Swapping front/back changes the frontFile/backFile props passed to
    // Reframe360Viewer, which re-runs its init effect and unmounts/remounts
    // the viewer -- same hazard as handleUpload's frontFile/backFile reset.
    // Stop an in-progress recording first so its interval doesn't leak and
    // startDirectRecording's re-entrancy guard doesn't get permanently
    // stuck. (directLocalKeyframes gets cleared right below regardless, so
    // there's nothing worth committing from the buffer here.)
    if (recordingIntervalRef.current) {
      stopDirectRecording();
      setViewerMode('still');
    }
    setFrontFile(backFile);
    setBackFile(frontFile);
    setFrontThumb(backThumb);
    setBackThumb(frontThumb);
    // A swap changes which lens is "front" for the combine step, so any
    // local keyframes marked against the old orientation would be wrong --
    // clearer to drop them and let the user re-mark than silently keep
    // stale yaw/pitch values.
    setDirectLocalPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return null; });
    setDirectLocalKeyframes([]);
  }

  async function grabDirectLocalPreview() {
    if (!frontFile || !backFile) return;
    setDirectLocalPreviewLoading(true);
    setDirectLocalPreviewError(null);
    try {
      const url = await fetchLocalDualFisheyePreview(frontFile, backFile, directLocalT);
      setDirectLocalPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return url; });
    } catch (err) {
      setDirectLocalPreviewError(err.message);
    } finally {
      setDirectLocalPreviewLoading(false);
    }
  }

  function addDirectLocalKeyframe(e) {
    const img = directLocalPreviewImgRef.current;
    if (!img) return;
    const kf = localPreviewClickToKeyframe(e, img, directLocalT);
    setDirectLocalKeyframes((prev) => [...prev.filter((k) => Math.abs(k.t - directLocalT) > 0.05), kf].sort((a, b) => a.t - b.t));
  }

  function removeDirectLocalKeyframe(t) {
    setDirectLocalKeyframes((prev) => prev.filter((k) => k.t !== t));
  }

  // Viewer-backed equivalent of addDirectLocalKeyframe: reads the live
  // WebGL orbit viewer's own camera orientation directly (no click-to-pixel
  // math needed) and writes into the same directLocalKeyframes array.
  function addDirectViewerKeyframe() {
    const viewer = directViewerRef.current;
    if (!viewer || !viewer.isReady) return;
    const { yaw, pitch, fov } = viewer.getCameraState();
    const t = viewer.getCurrentTime();
    setDirectLocalKeyframes((prev) => [...prev.filter((k) => Math.abs(k.t - t) > 0.05), { t, yaw, pitch, fov }].sort((a, b) => a.t - b.t));
  }

  // Live-record mode: samples the viewer's camera state on a fixed
  // wall-clock interval (independent of render/frame rate) while the video
  // plays, then on stop replaces any existing keyframes that fall inside the
  // recorded [startT, endT] range with the newly recorded points.
  function startDirectRecording() {
    // Re-entrancy guard: if an interval is already armed, a second rapid
    // click (before React re-renders isRecording) must not overwrite the
    // ref and orphan the first interval, which would then double-sample
    // into recordingBufferRef forever with no way to stop it.
    if (recordingIntervalRef.current) return;
    const viewer = directViewerRef.current;
    if (!viewer || !viewer.isReady) return;
    recordingBufferRef.current = [];
    setIsRecording(true);
    viewer.play();
    recordingIntervalRef.current = setInterval(() => {
      // Defensive: bail out if the viewer ref went stale/unmounted (e.g.
      // viewerMode flipped away from 'live') so this callback can't throw
      // even if the mode-change effect below hasn't cleared the interval
      // yet.
      const v = directViewerRef.current;
      if (!v || !v.isReady) return;
      const { yaw, pitch, fov } = v.getCameraState();
      const t = v.getCurrentTime();
      recordingBufferRef.current.push({ t, yaw, pitch, fov });
    }, 400);
  }

  // Returns the resulting keyframes array (after merging in whatever was
  // recorded) so callers that need the up-to-date list synchronously --
  // e.g. handleUpload, which reads directLocalKeyframes into the uploaded
  // scene in the same tick -- don't have to wait on the setState below to
  // flush, which wouldn't happen in time.
  function stopDirectRecording() {
    clearInterval(recordingIntervalRef.current);
    recordingIntervalRef.current = null;
    setIsRecording(false);
    const viewer = directViewerRef.current;
    viewer?.pause();

    const recorded = recordingBufferRef.current;
    recordingBufferRef.current = [];
    if (recorded.length === 0) return directLocalKeyframes;
    // min/max of the actual recorded timestamps, not first/last by array
    // position -- Reframe360Viewer autoplays with loop=true, so a session
    // that runs longer than the video's duration can wrap back toward 0
    // mid-recording, making the last sample's t SMALLER than the first's.
    // Using positional first/last in that case makes startT > endT, which
    // breaks the "outside range" filter below (nothing is ever outside an
    // inverted range) and silently degrades replace-on-overlap into pure
    // append.
    const startT = Math.min(...recorded.map((k) => k.t));
    const endT = Math.max(...recorded.map((k) => k.t));
    const outsideRange = directLocalKeyframes.filter((k) => k.t < startT - 0.05 || k.t > endT + 0.05);
    const merged = [...outsideRange, ...recorded].sort((a, b) => a.t - b.t);
    setDirectLocalKeyframes(merged);
    return merged;
  }

  // If the user switches viewerMode away from 'live' while a recording is
  // in progress, Reframe360Viewer unmounts (it's conditionally rendered),
  // but nothing else would ever clear the setInterval armed in
  // startDirectRecording -- it would keep firing every 400ms against a
  // stale/unmounted viewer ref. Stop cleanly the same way stopDirectRecording
  // does whenever that happens.
  useEffect(() => {
    if ((viewerMode !== 'live' || viewerError) && recordingIntervalRef.current) {
      stopDirectRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerMode, viewerError]);

  // Same seeded-tracking flow as handleTrackSubject, for the single-pair
  // direct-upload path (frontFile/backFile at the top level) rather than a
  // pendingPairs batch entry -- this is the code path a plain 2-file drop
  // actually hits, so the feature needs to live here too, not just in
  // batch-review.
  async function handleTrackSubjectDirect() {
    setTrackingError(null);
    const seedKf = directLocalKeyframes.find((k) => Math.abs(k.t - directLocalT) <= 0.05);
    if (!seedKf) {
      setTrackingError('Mark the subject on the current still first (click the preview), then track.');
      return;
    }
    setTrackingPairId('direct');
    try {
      const duration = await getLocalVideoDuration(frontFile);
      const seed = {
        t: seedKf.t,
        xNorm: (seedKf.yaw + 180) / 360,
        yNorm: (90 - seedKf.pitch) / 180,
      };
      const { keyframes: tracked, trackedCount, expectedCount } = await runSeededTracking({
        seed,
        fetchPreviewAt: (t) => fetchLocalDualFisheyePreview(frontFile, backFile, t),
        sceneDuration: duration,
      });
      setDirectLocalKeyframes((prev) => {
        const trackedTimes = tracked.map((k) => k.t);
        const keptManual = prev.filter((k) => !trackedTimes.some((t) => Math.abs(t - k.t) <= 0.05));
        return [...keptManual, ...tracked].sort((a, b) => a.t - b.t);
      });
      if (trackedCount < expectedCount) {
        setTrackingError(`Tracked ${trackedCount} of ${expectedCount} points before losing the subject -- added a slow zoom-out for the rest of the scene, but add manual corrections if you want tighter framing.`);
      }
    } catch (err) {
      setTrackingError(err.message);
    } finally {
      setTrackingPairId(null);
    }
  }

  async function handleUpload() {
    setError('');
    if (mode === 'single' && !singleFile) return setError('Upload a pre-stitched equirectangular video first.');
    if (mode === 'dual' && (!frontFile || !backFile)) return setError('Drop both the front and back lens files.');

    // Below, on success, frontFile/backFile get reset to null, which
    // unmounts Reframe360Viewer. If a recording is still running at that
    // point, its interval would leak (harmless no-op thanks to a defensive
    // guard, but never cleared) and recordingIntervalRef.current staying
    // non-null would permanently trip startDirectRecording's re-entrancy
    // guard, disabling Record for the rest of the session. Stop it first,
    // synchronously, and use ITS return value (not directLocalKeyframes,
    // which wouldn't reflect the just-finished recording since setState
    // hasn't flushed yet) for the scene we're about to upload.
    let keyframesForUpload = directLocalKeyframes;
    if (mode === 'dual' && recordingIntervalRef.current) {
      keyframesForUpload = stopDirectRecording();
      setViewerMode('still');
    }

    setUploading(true);
    try {
      const headers = await getAuthHeaders();
      const formData = new FormData();
      if (mode === 'single') formData.append('video', singleFile);
      else { formData.append('front', frontFile); formData.append('back', backFile); }

      const res = await fetch('/api/reframe360/upload', {
        method: 'POST',
        headers: { Authorization: headers.Authorization },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      const label = mode === 'single' ? singleFile.name : `${frontFile.name} + ${backFile.name}`;
      const newScene = {
        id: `scene-${++sceneLocalId}`,
        uploadId: data.uploadId,
        inputFormat: data.inputFormat,
        duration: data.duration,
        label: `Scene ${scenes.length + 1}`,
        sourceLabel: label,
        keyframes: mode === 'dual' ? keyframesForUpload : [],
      };
      setScenes((prev) => [...prev, newScene]);
      setSingleFile(null);
      setFrontFile(null);
      setBackFile(null);
      setFrontThumb(null);
      setBackThumb(null);
      setDirectLocalPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return null; });
      setDirectLocalKeyframes([]);
      setStage('scenes');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  const loadPreview = useCallback(async (uploadId, inputFormat, t) => {
    if (!uploadId) return;
    setPreviewLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/reframe360/preview/${uploadId}?t=${t}&inputFormat=${inputFormat}`, { headers });
      if (!res.ok) throw new Error('Preview failed');
      const blob = await res.blob();
      setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
    } catch (err) {
      setError(err.message);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  function openSceneForKeyframing(scene) {
    setActiveSceneId(scene.id);
    const t = Math.min(1, scene.duration / 2);
    setScrubTime(t);
    setStage('keyframe');
    loadPreview(scene.uploadId, scene.inputFormat, t);
  }

  function handlePreviewClick(e) {
    if (!activeScene) return;
    const img = previewImgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const yaw = x * 360 - 180;
    const pitch = 90 - y * 180;

    updateActiveScene((s) => {
      const withoutCurrent = s.keyframes.filter((k) => Math.abs(k.t - scrubTime) > 0.05);
      return { ...s, keyframes: [...withoutCurrent, { t: scrubTime, yaw, pitch }].sort((a, b) => a.t - b.t) };
    });
  }

  function removeKeyframe(t) {
    updateActiveScene((s) => ({ ...s, keyframes: s.keyframes.filter((k) => k.t !== t) }));
  }

  async function handleScrub(t) {
    setScrubTime(t);
    if (activeScene) await loadPreview(activeScene.uploadId, activeScene.inputFormat, t);
  }

  function removeScene(id) {
    setScenes((prev) => prev.filter((s) => s.id !== id));
  }

  function moveScene(id, dir) {
    setScenes((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      const swapIdx = idx + dir;
      if (idx < 0 || swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }

  const allScenesReady = scenes.length > 0 && scenes.every((s) => s.keyframes.length > 0);

  // Rough estimate only, not a real progress signal -- render.js has no
  // per-scene progress reporting yet. Ratio is the upper end of what was
  // measured on real footage for the keyframed single-pass render step
  // (2-3.3x scene duration; combining already happened at upload time, not
  // here), biased high on purpose so the shown number is a safe "no later
  // than" rather than one that gets broken by the first slow scene.
  const RENDER_TIME_RATIO = 3.5;
  const totalSceneSeconds = scenes.reduce((sum, s) => sum + s.duration, 0);
  const estimatedRenderSeconds = totalSceneSeconds * RENDER_TIME_RATIO;

  useEffect(() => {
    if (stage !== 'rendering') { setRenderElapsedMs(0); return; }
    const startedAt = Date.now();
    const interval = setInterval(() => setRenderElapsedMs(Date.now() - startedAt), 1000);
    return () => clearInterval(interval);
  }, [stage]);

  async function handleRenderAll() {
    if (!allScenesReady) return setError('Every scene needs at least 1 keyframe before rendering.');
    setError('');
    setStage('rendering');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/reframe360/render-multi', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenes: scenes.map((s) => ({ uploadId: s.uploadId, inputFormat: s.inputFormat, keyframes: s.keyframes })),
          aspect_ratio: ratio,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Render failed to start');
      setJobId(data.jobId);
      setStatus('pending');
    } catch (err) {
      setError(err.message);
      setStage('scenes');
    }
  }

  useEffect(() => {
    if (!jobId || status === 'completed' || status === 'failed') return;
    const interval = setInterval(async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/reframe360/status/${jobId}`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Status check failed');
        setStatus(data.status);
        if (data.status === 'completed') { setResult(data); setStage('done'); }
        if (data.status === 'failed') { setError(data.error || 'Processing failed'); setStage('scenes'); }
      } catch (err) {
        setError(err.message);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [jobId, status]);

  const currentKeyframe = activeScene?.keyframes.find((k) => Math.abs(k.t - scrubTime) <= 0.05);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--onyx-bg)', color: 'var(--onyx-text)', padding: '40px 24px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(180,141,255,0.15)', border: '1px solid rgba(180,141,255,0.3)', color: '#c4a9ff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Beta</span>
      </div>
      <div style={{ marginBottom: 32 }}>
        <h1 className="page-title">360° to Reel</h1>
        <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>
          Upload each raw 360° section (ground interview, plane, freefall, canopy, landing —
          as many as you need), click where the subject is a few times in each, and Onyx
          crops and joins them into one reel.
        </p>
      </div>

      {(stage === 'upload' || stage === 'scenes') && scenes.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: 'var(--onyx-text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Scenes ({scenes.length}) — will be joined in this order
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {scenes.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--onyx-surface)', borderRadius: 10, border: '1px solid var(--onyx-hairline-strong)' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--onyx-text-faint)', width: 20 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--onyx-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.sourceLabel}</div>
                  <div style={{ fontSize: 11, color: s.keyframes.length ? 'var(--onyx-text-faint)' : '#f87171' }}>
                    {s.duration.toFixed(1)}s · {s.keyframes.length} keyframe{s.keyframes.length === 1 ? '' : 's'}{s.keyframes.length === 0 ? ' — needs at least 1' : ''}
                  </div>
                </div>
                <button onClick={() => moveScene(s.id, -1)} disabled={i === 0} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--onyx-hairline-strong)', background: 'transparent', color: i === 0 ? 'var(--onyx-text-faint)' : 'var(--onyx-text-dim)', cursor: i === 0 ? 'default' : 'pointer' }}>↑</button>
                <button onClick={() => moveScene(s.id, 1)} disabled={i === scenes.length - 1} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--onyx-hairline-strong)', background: 'transparent', color: i === scenes.length - 1 ? 'var(--onyx-text-faint)' : 'var(--onyx-text-dim)', cursor: i === scenes.length - 1 ? 'default' : 'pointer' }}>↓</button>
                <button onClick={() => openSceneForKeyframing(s)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 7, border: '1px solid #4dd0ff', background: 'rgba(77,208,255,0.1)', color: '#7de0ff', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {s.keyframes.length ? 'Edit keyframes' : 'Set keyframes'}
                </button>
                <button onClick={() => removeScene(s.id)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: 'none', background: 'transparent', color: '#f87171', cursor: 'pointer' }}>Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {stage === 'upload' && (
        <>
          {scenes.length > 0 && (
            <button onClick={() => setStage('scenes')} style={{ fontSize: 13, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--onyx-hairline-strong)', background: 'transparent', color: 'var(--onyx-text-dim)', cursor: 'pointer', marginBottom: 16 }}>
              ← Back to scene list
            </button>
          )}
          <div style={{ fontSize: 12, color: 'var(--onyx-text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            {scenes.length > 0 ? `Add scene ${scenes.length + 1}` : 'Add your first scene'}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button onClick={() => setMode('single')} style={{
              flex: 1, padding: '12px', borderRadius: 10, cursor: 'pointer', fontSize: 13, textAlign: 'left',
              border: `1px solid ${mode === 'single' ? '#4dd0ff' : 'var(--onyx-surface-2)'}`,
              background: mode === 'single' ? 'rgba(77,208,255,0.1)' : 'var(--onyx-surface)',
              color: mode === 'single' ? '#7de0ff' : 'var(--onyx-text-dim)',
            }}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>Pre-stitched file</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>Already equirectangular (from GoPro/Insta360's own app)</div>
            </button>
            <button onClick={() => setMode('dual')} style={{
              flex: 1, padding: '12px', borderRadius: 10, cursor: 'pointer', fontSize: 13, textAlign: 'left',
              border: `1px solid ${mode === 'dual' ? '#4dd0ff' : 'var(--onyx-surface-2)'}`,
              background: mode === 'dual' ? 'rgba(77,208,255,0.1)' : 'var(--onyx-surface)',
              color: mode === 'dual' ? '#7de0ff' : 'var(--onyx-text-dim)',
            }}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>Raw camera files</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>Front + back lens, straight off the SD card — no vendor app needed</div>
            </button>
          </div>

          {mode === 'single' ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? '#4dd0ff' : 'var(--onyx-surface-2)'}`,
                borderRadius: 16, padding: '40px 24px', textAlign: 'center', cursor: 'pointer', marginBottom: 24,
                background: dragging ? 'rgba(77,208,255,0.08)' : 'var(--onyx-surface)',
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>🌐</div>
              <p style={{ color: 'var(--onyx-text-dim)', margin: '0 0 6px', fontSize: 15 }}>
                {singleFile ? singleFile.name : 'Drag & drop your equirectangular 360° video here'}
              </p>
              <p style={{ color: 'var(--onyx-text-faint)', margin: 0, fontSize: 13 }}>MP4, MOV, INSV · Up to 4GB</p>
              <input ref={fileInputRef} type="file" accept=".mp4,.mov,.insv" style={{ display: 'none' }} onChange={(e) => addSingleFile(e.target.files)} />
            </div>
          ) : (
            <div style={{ marginBottom: 24 }}>
              <div
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onLensDrop}
                onClick={() => frontInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragging ? '#4dd0ff' : 'var(--onyx-surface-2)'}`,
                  borderRadius: 16, padding: '40px 24px', textAlign: 'center', cursor: 'pointer',
                  background: dragging ? 'rgba(77,208,255,0.08)' : 'var(--onyx-surface)',
                }}
              >
                {frontFile && backFile ? (
                  <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 10 }} onClick={(e) => e.stopPropagation()}>
                    {[{ file: frontFile, thumb: frontThumb, label: 'Front' }, { file: backFile, thumb: backThumb, label: 'Back' }].map(({ file, thumb, label }) => (
                      <div key={label} style={{ width: 120 }}>
                        <div style={{ width: 120, height: 120, borderRadius: 10, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--onyx-hairline-strong)' }}>
                          {thumb ? <img src={thumb} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 11, color: 'var(--onyx-text-faint)' }}>Loading…</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--onyx-text-faint)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label} (guess): {file.name}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📹📹</div>
                    <p style={{ color: 'var(--onyx-text-dim)', margin: '0 0 6px', fontSize: 15 }}>
                      Drag & drop both raw lens files here at once
                    </p>
                  </>
                )}
                <p style={{ color: 'var(--onyx-text-faint)', margin: 0, fontSize: 13 }}>
                  No need to know which is front or back, or upload one scene at a time — drop your whole raw dump (all scenes' files at once) and they'll be grouped automatically, up to 4GB each
                </p>
                <input
                  ref={frontInputRef} type="file" accept=".mp4,.mov,.insv" multiple style={{ display: 'none' }}
                  onChange={(e) => addLensFiles(e.target.files)}
                />
              </div>
              {frontFile && backFile && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 10, padding: '10px 14px', background: 'var(--onyx-surface)', borderRadius: 10, border: '1px solid var(--onyx-hairline-strong)' }}>
                  <button onClick={swapLenses} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 7, border: '1px solid var(--onyx-hairline-strong)', background: 'transparent', color: '#7de0ff', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    ⇄ Swap front/back
                  </button>
                </div>
              )}
              <p style={{ color: 'var(--onyx-text-faint)', fontSize: 12, marginTop: 8 }}>
                If the rendered preview looks wrong (flickers or looks stitched backwards), come back here and hit Swap — no re-upload needed.
              </p>

              {frontFile && backFile && (
                <div style={{ marginTop: 16, padding: 14, background: 'var(--onyx-surface)', borderRadius: 12, border: '1px solid var(--onyx-hairline-strong)' }}>
                  <div style={{ fontSize: 12, color: 'var(--onyx-text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                    Mark subject now (optional) — before the upload starts
                  </div>
                  <p style={{ color: 'var(--onyx-text-dim)', fontSize: 12, marginBottom: 10 }}>
                    Grab a frame straight from these local files and click the subject — no upload needed for this. Any keyframes you set here carry straight onto the scene the moment its upload finishes.
                  </p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                    <label style={{ fontSize: 12, color: 'var(--onyx-text-faint)' }}>
                      Timestamp (s):{' '}
                      <input type="number" min={0} step={0.5} value={directLocalT} onChange={(e) => setDirectLocalT(parseFloat(e.target.value) || 0)}
                        style={{ width: 64, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--onyx-hairline-strong)', background: 'transparent', color: 'var(--onyx-text)' }} />
                    </label>
                    <button onClick={grabDirectLocalPreview} disabled={directLocalPreviewLoading} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 7, border: '1px solid #4dd0ff', background: 'rgba(77,208,255,0.1)', color: '#7de0ff', cursor: 'pointer' }}>
                      {directLocalPreviewLoading ? 'Grabbing…' : 'Grab frame & preview'}
                    </button>
                  </div>
                  {directLocalPreviewError && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 10 }}>{directLocalPreviewError}</div>}
                  {directLocalPreviewUrl && (
                    <div style={{ position: 'relative', width: '100%', aspectRatio: `${PREVIEW_W}/${PREVIEW_H}`, background: '#000', borderRadius: 10, overflow: 'hidden', marginBottom: 10, cursor: 'crosshair' }}>
                      <img ref={directLocalPreviewImgRef} src={directLocalPreviewUrl} onClick={addDirectLocalKeyframe} alt="Local 360° preview — click the subject" style={{ width: '100%', height: '100%', display: 'block' }} />
                      {directLocalKeyframes.filter((k) => Math.abs(k.t - directLocalT) <= 0.05).map((k) => (
                        <div key={k.t} style={{
                          position: 'absolute', left: `${((k.yaw + 180) / 360) * 100}%`, top: `${((90 - k.pitch) / 180) * 100}%`,
                          width: 18, height: 18, marginLeft: -9, marginTop: -9, borderRadius: '50%', border: '3px solid #4dd0ff',
                          boxShadow: '0 0 12px rgba(77,208,255,0.8)', pointerEvents: 'none',
                        }} />
                      ))}
                    </div>
                  )}
                  {directLocalPreviewUrl && (
                    <div style={{ marginBottom: 10 }}>
                      <button onClick={handleTrackSubjectDirect} disabled={trackingPairId === 'direct'}
                        title="Follows the point you just clicked forward through the rest of the scene automatically (optical flow) -- review/correct the results below same as any manual keyframe."
                        style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: '1px solid #a855f7', background: 'rgba(168,85,247,0.1)', color: '#c9a3ff', cursor: 'pointer' }}>
                        {trackingPairId === 'direct' ? 'Tracking…' : '✨ Track subject through scene'}
                      </button>
                      {trackingError && trackingPairId === null && (
                        <div style={{ color: '#f87171', fontSize: 11, marginTop: 6 }}>{trackingError}</div>
                      )}
                    </div>
                  )}
                  {directLocalKeyframes.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {directLocalKeyframes.map((k) => (
                        <div key={k.t} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: 'var(--onyx-surface-2)', borderRadius: 7, fontSize: 12 }}>
                          <span style={{ flex: 1, color: 'var(--onyx-text)' }}>t = {k.t.toFixed(1)}s · yaw {k.yaw.toFixed(0)}° · pitch {k.pitch.toFixed(0)}°</span>
                          <button onClick={() => removeDirectLocalKeyframe(k.t)} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: 'none', background: 'transparent', color: '#f87171', cursor: 'pointer' }}>Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {frontFile && backFile && (
                <div style={{ marginTop: 16, padding: 14, background: 'var(--onyx-surface)', borderRadius: 12, border: '1px solid var(--onyx-hairline-strong)' }}>
                  <button onClick={() => { setViewerError(null); setViewerMode(viewerMode === 'live' ? 'still' : 'live'); }}
                    style={{ fontSize: 12, padding: '6px 12px', borderRadius: 7, border: '1px solid #4dd0ff', background: 'rgba(77,208,255,0.1)', color: '#7de0ff', cursor: 'pointer' }}>
                    {viewerMode === 'live' ? 'Switch to still-frame mode' : 'Switch to live orbit view'}
                  </button>
                  {viewerMode === 'live' && !viewerError && (
                    <div style={{ marginTop: 10 }}>
                      <Reframe360Viewer ref={directViewerRef} frontFile={frontFile} backFile={backFile} onError={setViewerError} />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button onClick={() => directViewerRef.current?.play()}
                          style={{ fontSize: 12, padding: '6px 12px', borderRadius: 7, border: '1px solid var(--onyx-hairline-strong)', background: 'transparent', color: 'var(--onyx-text)', cursor: 'pointer' }}>
                          Play
                        </button>
                        <button onClick={() => directViewerRef.current?.pause()} disabled={isRecording}
                          title={isRecording ? 'Pausing mid-recording is disabled -- it would sample duplicate timestamps while paused.' : undefined}
                          style={{ fontSize: 12, padding: '6px 12px', borderRadius: 7, border: '1px solid var(--onyx-hairline-strong)', background: 'transparent', color: 'var(--onyx-text)', cursor: isRecording ? 'not-allowed' : 'pointer', opacity: isRecording ? 0.5 : 1 }}>
                          Pause
                        </button>
                        <button onClick={addDirectViewerKeyframe}
                          style={{ fontSize: 12, padding: '6px 12px', borderRadius: 7, border: '1px solid #a855f7', background: 'rgba(168,85,247,0.1)', color: '#c9a3ff', cursor: 'pointer' }}>
                          Add keyframe
                        </button>
                        <button onClick={isRecording ? stopDirectRecording : startDirectRecording}
                          style={{ fontSize: 12, padding: '6px 12px', borderRadius: 7, border: '1px solid #f87171', background: isRecording ? 'rgba(248,113,113,0.25)' : 'rgba(248,113,113,0.1)', color: '#fca5a5', cursor: 'pointer' }}>
                          {isRecording ? 'Stop recording' : 'Record'}
                        </button>
                      </div>
                    </div>
                  )}
                  {viewerMode === 'live' && viewerError && (
                    <p style={{ color: '#f87171', fontSize: 12, marginTop: 8 }}>
                      Live viewer unavailable ({viewerError}) — using still-frame mode instead.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {scenes.length === 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 12, color: 'var(--onyx-text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Output Aspect Ratio</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {RATIOS.map((r) => (
                  <button key={r.id} onClick={() => setRatio(r.id)} style={{
                    padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 13,
                    border: `1px solid ${ratio === r.id ? '#3b82f6' : 'var(--onyx-surface-2)'}`,
                    background: ratio === r.id ? 'rgba(59,130,246,0.15)' : 'var(--onyx-surface)',
                    color: ratio === r.id ? '#93c5fd' : 'var(--onyx-text-dim)',
                  }}>
                    <div style={{ fontWeight: 600 }}>{r.label}</div>
                    <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', color: '#f87171', fontSize: 14, marginBottom: 20 }}>{error}</div>}

          <button onClick={handleUpload} disabled={uploading} className="btn-teal" style={{ width: '100%' }}>
            {uploading ? 'Uploading & preparing…' : scenes.length > 0 ? 'Add this scene' : 'Continue'}
          </button>
        </>
      )}

      {stage === 'batch-review' && (
        <>
          <p style={{ color: 'var(--onyx-text-dim)', fontSize: 13, marginBottom: 8 }}>
            Grouped {pendingPairs.length} scene{pendingPairs.length === 1 ? '' : 's'} from your files, in this order — check each pair looks right (swap if a front/back guess is wrong, reorder if a scene's out of place), then upload them all.
          </p>
          {skippedLrvCount > 0 && (
            <p style={{ color: '#7de0ff', fontSize: 12, marginBottom: 16 }}>
              Skipped {skippedLrvCount} low-res proxy file{skippedLrvCount === 1 ? '' : 's'} (LRV_...) automatically — only the full-quality VID_ recordings are used.
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {pendingPairs.map((p, i) => (
              <div key={p.id} style={{ padding: '10px 12px', background: 'var(--onyx-surface)', borderRadius: 10, border: '1px solid var(--onyx-hairline-strong)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--onyx-text-faint)', width: 20 }}>{i + 1}</span>
                  {[{ file: p.frontFile, thumb: p.frontThumb, label: 'F' }, { file: p.backFile, thumb: p.backThumb, label: 'B' }].map(({ file, thumb, label }) => (
                    <div key={label} style={{ width: 52, height: 52, borderRadius: 8, overflow: 'hidden', background: '#000', flexShrink: 0, position: 'relative' }}>
                      {thumb ? <img src={thumb} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                      <span style={{ position: 'absolute', bottom: 2, left: 4, fontSize: 9, fontWeight: 700, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{label}</span>
                    </div>
                  ))}
                  <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--onyx-text-faint)' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.frontFile.name}</div>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.backFile.name}</div>
                    {p.localKeyframes.length > 0 && (
                      <div style={{ color: '#7de0ff', marginTop: 2 }}>{p.localKeyframes.length} keyframe{p.localKeyframes.length === 1 ? '' : 's'} marked locally — carries onto the scene automatically</div>
                    )}
                  </div>
                  <button onClick={() => movePair(p.id, -1)} disabled={i === 0} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--onyx-hairline-strong)', background: 'transparent', color: i === 0 ? 'var(--onyx-text-faint)' : 'var(--onyx-text-dim)', cursor: i === 0 ? 'default' : 'pointer' }}>↑</button>
                  <button onClick={() => movePair(p.id, 1)} disabled={i === pendingPairs.length - 1} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--onyx-hairline-strong)', background: 'transparent', color: i === pendingPairs.length - 1 ? 'var(--onyx-text-faint)' : 'var(--onyx-text-dim)', cursor: i === pendingPairs.length - 1 ? 'default' : 'pointer' }}>↓</button>
                  <button onClick={() => swapPair(p.id)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--onyx-hairline-strong)', background: 'transparent', color: '#7de0ff', cursor: 'pointer', whiteSpace: 'nowrap' }}>⇄ Swap</button>
                  <button onClick={() => removePair(p.id)} disabled={batchUploadIndex !== null} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: 'none', background: 'transparent', color: '#f87171', cursor: 'pointer' }}>Remove</button>
                </div>

                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--onyx-hairline-strong)' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--onyx-text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mark subject now (optional)</span>
                    <label style={{ fontSize: 12, color: 'var(--onyx-text-faint)', marginLeft: 'auto' }}>
                      t (s):{' '}
                      <input type="number" min={0} step={0.5} value={p.localT} disabled={batchUploadIndex !== null}
                        onChange={(e) => updatePair(p.id, { localT: parseFloat(e.target.value) || 0 })}
                        style={{ width: 56, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--onyx-hairline-strong)', background: 'transparent', color: 'var(--onyx-text)' }} />
                    </label>
                    <button onClick={() => grabLocalPreviewForPair(p)} disabled={p.localPreviewLoading || batchUploadIndex !== null} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: '1px solid #4dd0ff', background: 'rgba(77,208,255,0.1)', color: '#7de0ff', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {p.localPreviewLoading ? 'Grabbing…' : 'Grab & preview'}
                    </button>
                  </div>
                  {p.localPreviewError && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 8 }}>{p.localPreviewError}</div>}
                  {p.localPreviewUrl && (
                    <div style={{ position: 'relative', width: '100%', maxWidth: 480, aspectRatio: `${PREVIEW_W}/${PREVIEW_H}`, background: '#000', borderRadius: 10, overflow: 'hidden', marginBottom: 8, cursor: 'crosshair' }}>
                      <img
                        src={p.localPreviewUrl}
                        onClick={(e) => addLocalKeyframeForPair(p, e, e.currentTarget)}
                        alt="Local 360° preview — click the subject"
                        style={{ width: '100%', height: '100%', display: 'block' }}
                      />
                      {p.localKeyframes.filter((k) => Math.abs(k.t - p.localT) <= 0.05).map((k) => (
                        <div key={k.t} style={{
                          position: 'absolute', left: `${((k.yaw + 180) / 360) * 100}%`, top: `${((90 - k.pitch) / 180) * 100}%`,
                          width: 16, height: 16, marginLeft: -8, marginTop: -8, borderRadius: '50%', border: '3px solid #4dd0ff',
                          boxShadow: '0 0 12px rgba(77,208,255,0.8)', pointerEvents: 'none',
                        }} />
                      ))}
                    </div>
                  )}
                  {p.localPreviewUrl && (
                    <div style={{ marginBottom: 8 }}>
                      <button onClick={() => handleTrackSubject(p)} disabled={trackingPairId === p.id || batchUploadIndex !== null}
                        title="Follows the point you just clicked forward through the rest of the scene automatically (optical flow) -- review/correct the results below same as any manual keyframe."
                        style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: '1px solid #a855f7', background: 'rgba(168,85,247,0.1)', color: '#c9a3ff', cursor: 'pointer' }}>
                        {trackingPairId === p.id ? 'Tracking…' : '✨ Track subject through scene'}
                      </button>
                      {trackingError && trackingPairId === null && (
                        <div style={{ color: '#f87171', fontSize: 11, marginTop: 6 }}>{trackingError}</div>
                      )}
                    </div>
                  )}
                  {p.localKeyframes.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {p.localKeyframes.map((k) => (
                        <div key={k.t} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', background: 'var(--onyx-surface-2)', borderRadius: 6, fontSize: 11 }}>
                          <span style={{ flex: 1, color: 'var(--onyx-text)' }}>t={k.t.toFixed(1)}s · yaw {k.yaw.toFixed(0)}° · pitch {k.pitch.toFixed(0)}°</span>
                          <button onClick={() => removeLocalKeyframeForPair(p.id, k.t)} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 5, border: 'none', background: 'transparent', color: '#f87171', cursor: 'pointer' }}>Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--onyx-hairline-strong)' }}>
                  <button
                    onClick={() => updatePair(p.id, { viewerError: null, viewerMode: p.viewerMode === 'live' ? 'still' : 'live' })}
                    disabled={batchUploadIndex !== null}
                    style={{ fontSize: 12, padding: '6px 12px', borderRadius: 7, border: '1px solid #4dd0ff', background: 'rgba(77,208,255,0.1)', color: '#7de0ff', cursor: 'pointer' }}
                  >
                    {p.viewerMode === 'live' ? 'Switch to still-frame mode' : 'Switch to live orbit view'}
                  </button>
                  {p.viewerMode === 'live' && !p.viewerError && (
                    <div style={{ marginTop: 10 }}>
                      <Reframe360Viewer
                        ref={(el) => { if (el) viewerRefsByPairId.current.set(p.id, el); else viewerRefsByPairId.current.delete(p.id); }}
                        frontFile={p.frontFile}
                        backFile={p.backFile}
                        onError={(msg) => updatePair(p.id, { viewerError: msg })}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button onClick={() => viewerRefsByPairId.current.get(p.id)?.play()}
                          style={{ fontSize: 12, padding: '6px 12px', borderRadius: 7, border: '1px solid var(--onyx-hairline-strong)', background: 'transparent', color: 'var(--onyx-text)', cursor: 'pointer' }}>
                          Play
                        </button>
                        <button onClick={() => viewerRefsByPairId.current.get(p.id)?.pause()} disabled={p.isRecording}
                          title={p.isRecording ? 'Pausing mid-recording is disabled -- it would sample duplicate timestamps while paused.' : undefined}
                          style={{ fontSize: 12, padding: '6px 12px', borderRadius: 7, border: '1px solid var(--onyx-hairline-strong)', background: 'transparent', color: 'var(--onyx-text)', cursor: p.isRecording ? 'not-allowed' : 'pointer', opacity: p.isRecording ? 0.5 : 1 }}>
                          Pause
                        </button>
                        <button onClick={() => addPairViewerKeyframe(p)}
                          style={{ fontSize: 12, padding: '6px 12px', borderRadius: 7, border: '1px solid #a855f7', background: 'rgba(168,85,247,0.1)', color: '#c9a3ff', cursor: 'pointer' }}>
                          Add keyframe
                        </button>
                        <button onClick={() => (p.isRecording ? stopPairRecording(p) : startPairRecording(p))}
                          style={{ fontSize: 12, padding: '6px 12px', borderRadius: 7, border: '1px solid #f87171', background: p.isRecording ? 'rgba(248,113,113,0.25)' : 'rgba(248,113,113,0.1)', color: '#fca5a5', cursor: 'pointer' }}>
                          {p.isRecording ? 'Stop recording' : 'Record'}
                        </button>
                      </div>
                    </div>
                  )}
                  {p.viewerMode === 'live' && p.viewerError && (
                    <p style={{ color: '#f87171', fontSize: 12, marginTop: 8 }}>
                      Live viewer unavailable ({p.viewerError}) — using still-frame mode instead.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', color: '#f87171', fontSize: 14, marginBottom: 20 }}>{error}</div>}

          {batchProgress && (() => {
            const doneBytes = batchProgress.bytesDoneBeforeThisPair + Math.min(batchProgress.loadedBytes, batchProgress.pairTotalBytes);
            const pct = batchProgress.totalBatchBytes > 0 ? (doneBytes / batchProgress.totalBatchBytes) * 100 : 0;
            const remainingBytes = batchProgress.totalBatchBytes - doneBytes;
            const eta = batchProgress.speedBps > 0 ? formatDuration(remainingBytes / batchProgress.speedBps) : '...';
            return (
              <div style={{ marginBottom: 16 }}>
                <div style={{ height: 6, background: 'var(--onyx-surface-2)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#4dd0ff,#b48dff)', transition: 'width 0.2s' }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--onyx-text-dim)' }}>
                  {formatBytes(doneBytes)} / {formatBytes(batchProgress.totalBatchBytes)} ({pct.toFixed(0)}%)
                  {batchProgress.phase === 'uploading' && batchProgress.speedBps > 0 && (
                    <> · {formatBytes(batchProgress.speedBps)}/s · ~{eta} remaining</>
                  )}
                </div>
                {batchProgress.phase === 'combining' && (
                  <div style={{ fontSize: 12, color: '#7de0ff', marginTop: 4 }}>
                    Scene {batchProgress.pairIndex + 1} finished transferring — server is now combining the front/back lenses. This can take several minutes for longer clips; it's not stuck.
                  </div>
                )}
              </div>
            );
          })()}

          <button onClick={() => { pendingPairs.forEach((p) => cleanupPairRecordingState(p.id)); setPendingPairs([]); setStage('upload'); }} disabled={batchUploadIndex !== null} style={{ fontSize: 13, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--onyx-hairline-strong)', background: 'transparent', color: 'var(--onyx-text-dim)', cursor: 'pointer', marginBottom: 12, marginRight: 8 }}>
            Cancel
          </button>
          <button onClick={handleBatchUpload} disabled={batchUploadIndex !== null || pendingPairs.length === 0} className="btn-teal" style={{ width: '100%' }}>
            {batchUploadIndex !== null ? `Uploading scene ${batchUploadIndex + 1} of ${pendingPairs.length}…` : `Upload all ${pendingPairs.length} scenes`}
          </button>
        </>
      )}

      {stage === 'scenes' && (
        <>
          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', color: '#f87171', fontSize: 14, marginBottom: 20 }}>{error}</div>}
          <button onClick={() => setStage('upload')} className="btn-teal" style={{ width: '100%', marginBottom: 12 }}>
            + Add another scene
          </button>
          {allScenesReady && (
            <p style={{ fontSize: 12, color: 'var(--onyx-text-faint)', textAlign: 'center', marginBottom: 8 }}>
              Rough estimate: up to ~{formatDuration(estimatedRenderSeconds)} to render (not a guarantee — depends on scene length and server load)
            </p>
          )}
          <button onClick={handleRenderAll} disabled={!allScenesReady} style={{
            width: '100%', padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: allScenesReady ? 'pointer' : 'default',
            border: 'none', background: allScenesReady ? 'linear-gradient(90deg,#4dd0ff,#b48dff)' : 'var(--onyx-surface-2)',
            color: allScenesReady ? '#0a0a12' : 'var(--onyx-text-faint)',
          }}>
            Render all {scenes.length} scene{scenes.length === 1 ? '' : 's'} into one reel
          </button>
        </>
      )}

      {stage === 'keyframe' && activeScene && (
        <>
          <button onClick={() => setStage('scenes')} style={{ fontSize: 13, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--onyx-hairline-strong)', background: 'transparent', color: 'var(--onyx-text-dim)', cursor: 'pointer', marginBottom: 16 }}>
            ← Back to scene list
          </button>
          <p style={{ color: 'var(--onyx-text-dim)', fontSize: 13, marginBottom: 12 }}>
            <strong>{activeScene.label}</strong> ({activeScene.sourceLabel}) — scrub to a moment, then <strong>click on the subject's face</strong> in the preview below.
            Do this once for calm shots, or a few times where the subject moves a lot — it's fine
            if the subject drifts out of frame briefly (e.g. during mandatory freefall checks), you
            don't need a keyframe for every instant.
          </p>

          <div style={{ position: 'relative', width: '100%', aspectRatio: `${PREVIEW_W}/${PREVIEW_H}`, background: '#000', borderRadius: 12, overflow: 'hidden', marginBottom: 12, cursor: 'crosshair' }}>
            {previewUrl && (
              <img
                ref={previewImgRef}
                src={previewUrl}
                onClick={handlePreviewClick}
                alt="360° preview — click where the subject is"
                style={{ width: '100%', height: '100%', display: 'block', opacity: previewLoading ? 0.5 : 1 }}
              />
            )}
            {currentKeyframe && (
              <div style={{
                position: 'absolute',
                left: `${((currentKeyframe.yaw + 180) / 360) * 100}%`,
                top: `${((90 - currentKeyframe.pitch) / 180) * 100}%`,
                width: 20, height: 20, marginLeft: -10, marginTop: -10,
                borderRadius: '50%', border: '3px solid #4dd0ff', boxShadow: '0 0 12px rgba(77,208,255,0.8)',
                pointerEvents: 'none',
              }} />
            )}
            {previewLoading && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13 }}>Loading preview…</div>}
          </div>

          <input
            type="range" min={0} max={activeScene.duration} step={0.1} value={scrubTime}
            onChange={(e) => handleScrub(parseFloat(e.target.value))}
            style={{ width: '100%', marginBottom: 8 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--onyx-text-faint)', marginBottom: 20 }}>
            <span>{scrubTime.toFixed(1)}s</span>
            <span>{activeScene.duration.toFixed(1)}s total</span>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: 'var(--onyx-text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              Keyframes ({activeScene.keyframes.length})
            </div>
            {activeScene.keyframes.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--onyx-text-faint)' }}>None yet — click the preview above to add one.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {activeScene.keyframes.map((k) => (
                  <div key={k.t} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--onyx-surface)', borderRadius: 8, border: '1px solid var(--onyx-hairline-strong)' }}>
                    <span style={{ fontSize: 13, color: 'var(--onyx-text)', flex: 1 }}>t = {k.t.toFixed(1)}s · yaw {k.yaw.toFixed(0)}° · pitch {k.pitch.toFixed(0)}°</span>
                    <button onClick={() => handleScrub(k.t)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--onyx-hairline-strong)', background: 'transparent', color: 'var(--onyx-text-dim)', cursor: 'pointer' }}>Jump</button>
                    <button onClick={() => removeKeyframe(k.t)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: 'none', background: 'transparent', color: '#f87171', cursor: 'pointer' }}>Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', color: '#f87171', fontSize: 14, marginBottom: 20 }}>{error}</div>}

          <button onClick={() => setStage('scenes')} disabled={activeScene.keyframes.length < 1} className="btn-teal" style={{ width: '100%' }}>
            Done with this scene
          </button>
        </>
      )}

      {stage === 'rendering' && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ height: 3, background: 'var(--onyx-surface-2)', borderRadius: 3, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, #4dd0ff, #b48dff)', borderRadius: 3, width: '60%', animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
          <p style={{ color: 'var(--onyx-text-dim)', fontSize: 14, marginBottom: 6 }}>
            {status === 'pending' && 'Starting…'}
            {status === 'processing' && `Rendering ${scenes.length} scene${scenes.length === 1 ? '' : 's'} and joining them…`}
          </p>
          <p style={{ color: 'var(--onyx-text-faint)', fontSize: 12 }}>
            Elapsed: {formatDuration(renderElapsedMs / 1000)} · rough estimate: up to ~{formatDuration(estimatedRenderSeconds)}
          </p>
        </div>
      )}

      {stage === 'done' && result && (
        <div style={{ textAlign: 'center' }}>
          <video src={result.output_url} controls style={{ width: '100%', maxWidth: 360, borderRadius: 12, margin: '0 auto 20px', display: 'block' }} />
          <p style={{ color: 'var(--onyx-text-faint)', fontSize: 13, marginBottom: 16 }}>{result.duration_seconds?.toFixed(1)}s</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {result.reel_id ? (
              <a href={`/editor-v2?reelId=${result.reel_id}`} className="btn-teal" style={{ display: 'inline-block', textDecoration: 'none' }}>
                Open in Editor
              </a>
            ) : (
              <p style={{ color: '#f87171', fontSize: 12, width: '100%' }}>
                Couldn't save this to your project list automatically — download below and it'll still work, just won't appear in your Dashboard.
              </p>
            )}
            <a href={result.output_url} download style={{ display: 'inline-block', textDecoration: 'none', padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, border: '1px solid var(--onyx-hairline-strong)', color: 'var(--onyx-text-dim)' }}>
              Download Reel
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
