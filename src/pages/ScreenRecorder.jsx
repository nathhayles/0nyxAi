import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient.js";
import BrandSelector from "../components/BrandSelector.jsx";

export default function ScreenRecorder() {
  const navigate = useNavigate();
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState(null); // blob URL
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [duration, setDuration] = useState(0);
  // Persists across recordings within the session (not reset by "Record Again").
  const [audioMode, setAudioMode] = useState("none"); // none | tab | mic
  const [includeWebcam, setIncludeWebcam] = useState(false);
  const [removeBackground, setRemoveBackground] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | countdown | recording | done | uploading
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [error, setError] = useState("");
  const [audioNotice, setAudioNotice] = useState("");
  const [brandId, setBrandId] = useState("");

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const webcamStreamRef = useRef(null);
  const micStreamRef = useRef(null);
  const timerRef = useRef(null);
  const previewRef = useRef(null);
  const canvasRef = useRef(null);
  const compositorRafRef = useRef(null);
  const canvasStreamRef = useRef(null);

  // Background removal (MediaPipe Selfie Segmentation) state
  const selfieSegmentationRef = useRef(null);
  const maskedWebcamCanvasRef = useRef(null);
  const maskReadyRef = useRef(false);
  const segmentationBusyRef = useRef(false);
  const segmentationLoopActiveRef = useRef(false);
  const segmentationRafRef = useRef(null);
  const removeBackgroundRef = useRef(removeBackground);
  useEffect(() => { removeBackgroundRef.current = removeBackground; }, [removeBackground]);

  // Binds the live preview <video> to the composited canvas stream once the
  // element actually exists. Runs on every "recording" status flip rather
  // than once at stream-creation time, since the <video> only mounts after
  // status renders as "recording" — by then the ref above had nothing to
  // attach to yet.
  useEffect(() => {
    if (status === "recording" && previewRef.current && canvasStreamRef.current) {
      previewRef.current.srcObject = canvasStreamRef.current;
    }
  }, [status]);

  useEffect(() => {
    return () => {
      stopAll();
    };
  }, []);

  function stopAll() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (compositorRafRef.current) clearInterval(compositorRafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (webcamStreamRef.current) webcamStreamRef.current.getTracks().forEach(t => t.stop());
    if (micStreamRef.current) micStreamRef.current.getTracks().forEach(t => t.stop());
    segmentationLoopActiveRef.current = false;
    if (segmentationRafRef.current) clearInterval(segmentationRafRef.current);
    if (selfieSegmentationRef.current) {
      selfieSegmentationRef.current.close?.();
      selfieSegmentationRef.current = null;
    }
    maskedWebcamCanvasRef.current = null;
    maskReadyRef.current = false;
    canvasStreamRef.current = null;
  }

  const SELFIE_SEGMENTATION_VERSION = "0.1.1675465747";
  const SELFIE_SEGMENTATION_CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@${SELFIE_SEGMENTATION_VERSION}/`;

  // MediaPipe's solutions packages aren't real ES modules — they only set
  // window globals — so they're loaded via a <script> tag rather than import().
  function loadSelfieSegmentationScript() {
    if (window.SelfieSegmentation) return Promise.resolve();
    if (window.__selfieSegmentationLoading) return window.__selfieSegmentationLoading;
    window.__selfieSegmentationLoading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${SELFIE_SEGMENTATION_CDN}selfie_segmentation.js`;
      script.crossOrigin = "anonymous";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load background removal model"));
      document.body.appendChild(script);
    });
    return window.__selfieSegmentationLoading;
  }

  // Sets up real-time background removal on the webcam feed. Runs MediaPipe
  // Selfie Segmentation on its own loop, decoupled from the compositor's
  // requestAnimationFrame — if a frame is still processing when the next
  // tick fires, that tick is skipped rather than queued, so a slow device
  // degrades by dropping segmentation frames instead of blocking the
  // compositor (and therefore MediaRecorder).
  async function setupBackgroundRemoval(webcamVideo) {
    await loadSelfieSegmentationScript();

    const selfieSegmentation = new window.SelfieSegmentation({
      locateFile: (file) => `${SELFIE_SEGMENTATION_CDN}${file}`,
    });
    selfieSegmentation.setOptions({ modelSelection: 1, selfieMode: false });

    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = webcamVideo.videoWidth || 640;
    maskCanvas.height = webcamVideo.videoHeight || 480;
    const maskCtx = maskCanvas.getContext("2d");

    selfieSegmentation.onResults((results) => {
      maskCtx.save();
      maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      maskCtx.drawImage(results.segmentationMask, 0, 0, maskCanvas.width, maskCanvas.height);
      maskCtx.globalCompositeOperation = "source-in";
      maskCtx.drawImage(results.image, 0, 0, maskCanvas.width, maskCanvas.height);
      maskCtx.restore();
      maskReadyRef.current = true;
      segmentationBusyRef.current = false;
    });

    selfieSegmentationRef.current = selfieSegmentation;
    maskedWebcamCanvasRef.current = maskCanvas;

    segmentationLoopActiveRef.current = true;
    const segmentationTick = async () => {
      if (!segmentationLoopActiveRef.current) return;
      if (!segmentationBusyRef.current && webcamVideo.readyState >= 2) {
        segmentationBusyRef.current = true;
        try {
          await selfieSegmentation.send({ image: webcamVideo });
        } catch {
          segmentationBusyRef.current = false;
        }
      }
    };
    // setInterval, not requestAnimationFrame — rAF pauses in a backgrounded
    // tab, same reasoning as the main compositor loop above.
    segmentationRafRef.current = setInterval(segmentationTick, 1000 / 30);
  }

  async function startRecording() {
    setError("");
    setRecorded(null);
    setRecordedBlob(null);
    setUploadedUrl(null);
    setStatus("countdown");

    // Countdown 3 seconds
    let count = 3;
    setCountdown(count);
    await new Promise(resolve => {
      const interval = setInterval(() => {
        count--;
        setCountdown(count);
        if (count === 0) { clearInterval(interval); resolve(); }
      }, 1000);
    });

    setAudioNotice("");
    try {
      // Get screen stream
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: audioMode === "tab",
      });
      streamRef.current = screenStream;

      if (audioMode === "tab" && screenStream.getAudioTracks().length === 0) {
        setAudioNotice("Tab audio requires sharing a browser tab, not a window or screen — recording video only.");
      }

      // Set up screen video element for drawing
      const screenVideo = document.createElement("video");
      screenVideo.srcObject = screenStream;
      screenVideo.muted = true;
      await new Promise(r => { screenVideo.onloadedmetadata = r; });
      screenVideo.play();

      let webcamVideo = null;
      if (includeWebcam) {
        try {
          const webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          webcamStreamRef.current = webcamStream;
          webcamVideo = document.createElement("video");
          webcamVideo.srcObject = webcamStream;
          webcamVideo.muted = true;
          await new Promise(r => { webcamVideo.onloadedmetadata = r; });
          webcamVideo.play();
          if (removeBackground) {
            try { await setupBackgroundRemoval(webcamVideo); } catch { /* falls back to raw webcam feed */ }
          }
        } catch { /* webcam optional */ }
      }

      // Canvas compositor: draw screen + webcam PIP each frame
      const canvas = document.createElement("canvas");
      canvasRef.current = canvas;
      const W = screenVideo.videoWidth || 1920;
      const H = screenVideo.videoHeight || 1080;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");

      function drawFrame() {
        ctx.drawImage(screenVideo, 0, 0, W, H);
        if (webcamVideo && webcamVideo.readyState >= 2) {
          // PIP: bottom-right corner, 25% width
          const pipW = Math.round(W * 0.25);
          const pipH = Math.round(pipW * (webcamVideo.videoHeight / (webcamVideo.videoWidth || 1)));
          const margin = Math.round(W * 0.02);
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(W - pipW - margin, H - pipH - margin, pipW, pipH, 12);
          ctx.clip();
          const useMask = removeBackgroundRef.current && maskReadyRef.current && maskedWebcamCanvasRef.current;
          ctx.drawImage(useMask ? maskedWebcamCanvasRef.current : webcamVideo, W - pipW - margin, H - pipH - margin, pipW, pipH);
          ctx.restore();
          ctx.strokeStyle = "#3b82f6";
          ctx.lineWidth = Math.round(W * 0.003);
          ctx.beginPath();
          ctx.roundRect(W - pipW - margin, H - pipH - margin, pipW, pipH, 12);
          ctx.stroke();
        }
      }
      // Uses setInterval rather than requestAnimationFrame: rAF is fully
      // paused by the browser whenever this tab is backgrounded, which is
      // the normal case during a screen recording (the user tabs/alt-tabs
      // away to the window or screen being recorded). setInterval keeps
      // firing (throttled, but not stopped) in a hidden tab, so the
      // compositor — and therefore canvas.captureStream() — keeps producing
      // real frames instead of repeating the first one for the whole clip.
      compositorRafRef.current = setInterval(drawFrame, 1000 / 30);
      drawFrame();

      // Capture canvas + any audio tracks. canvas.captureStream() never
      // carries audio, so tab audio (from getDisplayMedia) and mic audio
      // (from getUserMedia) are added as separate tracks here.
      const canvasStream = canvas.captureStream(30);
      screenStream.getAudioTracks().forEach(t => canvasStream.addTrack(t));

      if (audioMode === "mic") {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = micStream;
          micStream.getAudioTracks().forEach(t => canvasStream.addTrack(t));
        } catch {
          setAudioNotice("Microphone access was denied — recording without narration audio.");
        }
      }

      // Point the live preview at the same composited stream MediaRecorder
      // uses, so what's shown during recording matches the final output
      // (webcam PIP / background removal included). The <video> element only
      // mounts once status flips to "recording" (a render still pending at
      // this point), so the ref isn't attached yet — stash the stream and
      // bind it from the effect below once the element exists.
      canvasStreamRef.current = canvasStream;

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
          ? "video/webm;codecs=vp8,opus"
          : MediaRecorder.isTypeSupported("video/webm")
            ? "video/webm"
            : "video/mp4";
      const recorder = new MediaRecorder(canvasStream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        if (compositorRafRef.current) clearInterval(compositorRafRef.current);
        const blobType = mimeType.startsWith("video/mp4") ? "video/mp4" : "video/webm";
        const blob = new Blob(chunksRef.current, { type: blobType });
        const url = URL.createObjectURL(blob);
        setRecorded(url);
        setRecordedBlob(blob);
        setStatus("done");
        stopAll();
      };

      // Stop if user ends screen share
      screenStream.getVideoTracks()[0].onended = () => stopRecording();

      recorder.start(1000);
      setRecording(true);
      setStatus("recording");
      setDuration(0);

      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (err) {
      setError(err.message || "Could not access screen. Make sure you allow screen sharing.");
      setStatus("idle");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  }

  async function uploadAndEdit() {
    if (!recordedBlob) return;
    setStatus("uploading");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const form = new FormData();
      form.append("files", recordedBlob, `screen_recording_${Date.now()}.webm`);
      form.append("assetType", "video");
      const res = await fetch("/api/media/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: form,
      });
      const data = await res.json();
      const file = data?.files?.[0] || data?.uploaded?.[0] || data?.[0];
      const url = file?.url;
      const thumbnailUrl = file?.thumbnailUrl || null;
      if (!url) throw new Error("Upload failed");
      setUploadedUrl(url);
      // Navigate to editor with the video as scene 1
      const handoffId = crypto.randomUUID();
      sessionStorage.setItem(`onyx_handoff_${handoffId}`, JSON.stringify({
        title: "Screen Recording",
        ratio: "16:9",
        thumbnailUrl,
        scenes: [{ id: 1, url, mediaType: "video", mode: "upload", narration: "", action: "Screen recording", duration }],
        activeScene: 1,
        activeMenu: "storyboard",
        savedAt: new Date().toISOString(),
        brandId,
      }));
      navigate(`/editor?handoff=${handoffId}`);
    } catch (err) {
      setError(err.message);
      setStatus("done");
    }
  }

  function fmt(s) { return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`; }

  const dark = { minHeight: "100vh", background: "var(--onyx-bg)", color: "var(--onyx-text)", fontFamily: "sans-serif", padding: "40px 24px" };
  const card = { background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", borderRadius: 12, padding: 24, marginBottom: 16 };
  const btn = (bg, disabled) => ({ padding: "13px 28px", borderRadius: 8, border: "none", background: disabled ? "#374151" : bg, color: "#fff", fontWeight: 700, fontSize: 15, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1 });

  return (
    <div style={dark}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <button onClick={() => navigate("/studio")} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, marginBottom: 24, padding: 0 }}>← Back to Studio</button>
        <h1 className="page-title">🖥️ Screen Recording</h1>
        <p style={{ color: "#64748b", fontSize: 15, marginBottom: 28 }}>Record your screen and turn it into a video reel with AI voiceover and captions.</p>

        {error && <div style={{ padding: "12px 16px", borderRadius: 8, marginBottom: 16, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: 14 }}>{error}</div>}
        {audioNotice && (status === "recording" || status === "done") && (
          <div style={{ padding: "12px 16px", borderRadius: 8, marginBottom: 16, background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)", color: "#facc15", fontSize: 14 }}>{audioNotice}</div>
        )}

        {/* Options */}
        {status === "idle" && (
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 16 }}>Recording Options</div>

            <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600, marginBottom: 8 }}>Audio</div>
            <div style={{ display: "inline-flex", borderRadius: 8, border: "1px solid var(--onyx-hairline-strong)", overflow: "hidden", marginBottom: 16 }}>
              {[
                { key: "none", label: "No Audio" },
                { key: "tab", label: "🔊 Tab Audio" },
                { key: "mic", label: "🎙️ Microphone" },
              ].map(opt => (
                <div key={opt.key} onClick={() => setAudioMode(opt.key)}
                  style={{ padding: "10px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600,
                    background: audioMode === opt.key ? "rgba(29,78,216,0.15)" : "var(--onyx-surface)",
                    color: audioMode === opt.key ? "#93c5fd" : "#94a3b8",
                    borderRight: opt.key !== "mic" ? "1px solid var(--onyx-hairline-strong)" : "none" }}>
                  {opt.label}
                </div>
              ))}
            </div>
            {audioMode === "tab" && (
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
                Tab audio requires sharing a browser tab, not a window or screen.
                <br />
                Tip: start playing audio in the tab before clicking Record for sound to be captured.
              </div>
            )}

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                { key: "includeWebcam", label: "📷 Picture-in-Picture Webcam", val: includeWebcam, set: setIncludeWebcam },
                { key: "removeBackground", label: "🪄 Remove Background (AI)", val: removeBackground, set: setRemoveBackground, disabled: !includeWebcam, hint: "Requires webcam PIP" },
              ].map(opt => (
                <div key={opt.key} onClick={() => !opt.disabled && opt.set(v => !v)}
                  title={opt.disabled ? opt.hint : undefined}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 8, cursor: opt.disabled ? "not-allowed" : "pointer",
                    opacity: opt.disabled ? 0.45 : 1,
                    background: opt.val ? "rgba(29,78,216,0.15)" : "var(--onyx-surface)",
                    border: opt.val ? "1px solid #3b82f6" : "1px solid var(--onyx-hairline-strong)" }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, background: opt.val ? "var(--btn-primary-grad)" : "#374151", border: "1px solid #4b5563", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
                    {opt.val ? "✓" : ""}
                  </div>
                  <span style={{ fontSize: 13, color: opt.val ? "#93c5fd" : "#94a3b8", fontWeight: 600 }}>{opt.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Countdown */}
        {status === "countdown" && (
          <div style={{ ...card, textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 80, fontWeight: 900, color: "#3b82f6", marginBottom: 16 }}>{countdown}</div>
            <div style={{ fontSize: 18, color: "#94a3b8" }}>Get ready...</div>
          </div>
        )}

        {/* Recording in progress */}
        {status === "recording" && (
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444", animation: "pulse 1s infinite" }} />
              <span style={{ fontSize: 16, fontWeight: 700, color: "#f87171" }}>Recording</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginLeft: "auto" }}>{fmt(duration)}</span>
            </div>
            {/* Same canvas captureStream() MediaRecorder records — preview now matches output exactly, PIP and background removal included. */}
            <video ref={previewRef} autoPlay muted style={{ width: "100%", borderRadius: 8, background: "#000", maxHeight: 300 }} />
          </div>
        )}

        {/* Preview after recording */}
        {status === "done" && recorded && (
          <div style={card}>
            <div style={{ fontSize: 13, color: "#4ade80", fontWeight: 600, marginBottom: 12 }}>Recording complete — {fmt(duration)}</div>
            <video src={recorded} controls style={{ width: "100%", borderRadius: 8, background: "#000", maxHeight: 360 }} />
          </div>
        )}

        {/* Uploading */}
        {status === "uploading" && (
          <div style={{ ...card, textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⬆️</div>
            <div style={{ color: "#94a3b8" }}>Uploading recording...</div>
          </div>
        )}

        {/* Actions */}
        {status === "idle" && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14, color: "#e2e8f0" }}>Brand (optional)</label>
            <BrandSelector value={brandId} onChange={(id) => setBrandId(id)} />
          </div>
        )}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {status === "idle" && (
            <button onClick={startRecording} className="btn-teal">
              🖥️ Start Recording
            </button>
          )}
          {status === "recording" && (
            <button onClick={stopRecording} style={btn("#ef4444", false)}>
              ⏹ Stop Recording
            </button>
          )}
          {status === "done" && (
            <>
              <button onClick={uploadAndEdit} className="btn-teal">
                Upload & Edit in Studio
              </button>
              <a href={recorded} download="screen_recording.webm">
                <button style={btn("#1f2937", false)}>⬇️ Download</button>
              </a>
              <button onClick={() => { setStatus("idle"); setRecorded(null); setDuration(0); }} style={btn("#374151", false)}>
                🔄 Record Again
              </button>
            </>
          )}
        </div>

        {/* How it works */}
        {status === "idle" && (
          <div style={{ ...card, marginTop: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 14 }}>How it works</div>
            {["Choose your recording options above", "Click Start — you'll get a 3-second countdown", "Select which screen or window to share", "Record your demo, tutorial, or presentation", "Click Stop then Upload & Edit to open in the editor", "Add AI voiceover, captions, music and publish"].map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(94,220,255,0.1)", border: "1px solid var(--onyx-cyan)", color: "var(--onyx-cyan)", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i+1}</div>
                <span style={{ fontSize: 13, color: "#94a3b8", paddingTop: 2 }}>{step}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
