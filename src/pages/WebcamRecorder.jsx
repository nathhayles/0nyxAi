import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient.js";
import BrandSelector from "../components/BrandSelector.jsx";

export default function WebcamRecorder() {
  const navigate = useNavigate();
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [status, setStatus] = useState("idle");
  const [countdown, setCountdown] = useState(0);
  const [duration, setDuration] = useState(0);
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [error, setError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [brandId, setBrandId] = useState("");

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const liveRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => stopAll();
  }, []);

  async function startCamera() {
    try {
      const constraints = aspectRatio === "9:16"
        ? { video: { width: 1080, height: 1920, facingMode: "user" }, audio: true }
        : { video: { width: 1920, height: 1080, facingMode: "user" }, audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (liveRef.current) liveRef.current.srcObject = stream;
      setCameraReady(true);
    } catch (err) {
      setError("Camera access denied. Please allow camera and microphone access.");
    }
  }

  function stopAll() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  }

  async function startRecording() {
    setError("");
    setRecorded(null);
    setRecordedBlob(null);
    setStatus("countdown");

    let count = 3;
    setCountdown(count);
    await new Promise(resolve => {
      const interval = setInterval(() => {
        count--;
        setCountdown(count);
        if (count === 0) { clearInterval(interval); resolve(); }
      }, 1000);
    });

    if (!streamRef.current) { setError("No camera stream"); setStatus("idle"); return; }

    const recorder = new MediaRecorder(streamRef.current, { mimeType: "video/webm;codecs=vp9" });
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setRecorded(url);
      setRecordedBlob(blob);
      setStatus("done");
    };

    recorder.start(1000);
    setRecording(true);
    setStatus("recording");
    setDuration(0);
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
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
      form.append("files", recordedBlob, `webcam_recording_${Date.now()}.webm`);
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
      const handoffId = crypto.randomUUID();
      sessionStorage.setItem(`onyx_handoff_${handoffId}`, JSON.stringify({
        title: "Webcam Recording",
        ratio: aspectRatio,
        thumbnailUrl,
        scenes: [{ id: 1, url, mediaType: "video", mode: "upload", narration: "", action: "Webcam recording" }],
        activeScene: 1,
        activeMenu: "storyboard",
        savedAt: new Date().toISOString(),
        brandId,
      }));
      window.location.href = `/editor?handoff=${handoffId}`;
    } catch (err) {
      setError(err.message);
      setStatus("done");
    }
  }

  function fmt(s) { return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`; }

  const dark = { minHeight: "100vh", background: "#06070a", color: "#fff", fontFamily: "sans-serif", padding: "40px 24px" };
  const card = { background: "#0c1016", border: "1px solid #1f2937", borderRadius: 12, padding: 24, marginBottom: 16 };
  const btn = (bg, disabled) => ({ padding: "13px 28px", borderRadius: 8, border: "none", background: disabled ? "#374151" : bg, color: "#fff", fontWeight: 700, fontSize: 15, cursor: disabled ? "not-allowed" : "pointer" });
  const isPortrait = aspectRatio === "9:16";

  return (
    <div style={dark}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <button onClick={() => navigate("/studio")} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, marginBottom: 24, padding: 0 }}>← Back to Studio</button>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>📷 Webcam Recording</h1>
        <p style={{ color: "#64748b", fontSize: 15, marginBottom: 28 }}>Record yourself to camera and turn it into a polished reel with AI captions and music.</p>

        {error && <div style={{ padding: "12px 16px", borderRadius: 8, marginBottom: 16, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: 14 }}>{error}</div>}

        {/* Aspect ratio selector */}
        {(status === "idle" || status === "countdown") && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {["9:16", "16:9", "1:1"].map(r => (
              <button key={r} onClick={() => { setAspectRatio(r); stopAll(); setTimeout(startCamera, 100); }}
                style={{ padding: "8px 16px", borderRadius: 8, border: aspectRatio === r ? "1px solid #3b82f6" : "1px solid #1f2937",
                  background: aspectRatio === r ? "#1e3a5f" : "#111827", color: aspectRatio === r ? "#60a5fa" : "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {r} {r === "9:16" ? "📱" : r === "16:9" ? "🖥️" : "⬜"}
              </button>
            ))}
          </div>
        )}

        {/* Live camera preview */}
        <div style={{ ...card, position: "relative", padding: 0, overflow: "hidden", background: "#000" }}>
          <video ref={liveRef} autoPlay muted playsInline
            style={{ width: "100%", maxHeight: isPortrait ? 480 : 360, objectFit: "cover", display: "block" }} />

          {/* Countdown overlay */}
          {status === "countdown" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}>
              <div style={{ fontSize: 100, fontWeight: 900, color: "#3b82f6" }}>{countdown}</div>
            </div>
          )}

          {/* Recording indicator */}
          {status === "recording" && (
            <div style={{ position: "absolute", top: 16, left: 16, display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", background: "rgba(0,0,0,0.7)", borderRadius: 20 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{fmt(duration)}</span>
            </div>
          )}

          {!cameraReady && status === "idle" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#0c1016" }}>
              <div style={{ textAlign: "center", color: "#64748b" }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
                <div>Requesting camera access...</div>
              </div>
            </div>
          )}
        </div>

        {/* Playback after recording */}
        {status === "done" && recorded && (
          <div style={{ ...card }}>
            <div style={{ fontSize: 13, color: "#4ade80", fontWeight: 600, marginBottom: 12 }}>✅ Recording complete — {fmt(duration)}</div>
            <video src={recorded} controls style={{ width: "100%", borderRadius: 8, maxHeight: 360 }} />
          </div>
        )}

        {/* Actions */}
        {status === "idle" && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14, color: "#e2e8f0" }}>Brand (optional)</label>
            <BrandSelector value={brandId} onChange={(id) => setBrandId(id)} />
          </div>
        )}
        <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
          {(status === "idle") && (
            <button onClick={startRecording} disabled={!cameraReady} style={btn("linear-gradient(135deg, #1d4ed8, #7c3aed)", !cameraReady)}>
              🔴 Start Recording
            </button>
          )}
          {status === "recording" && (
            <button onClick={stopRecording} style={btn("#ef4444", false)}>
              ⏹ Stop Recording
            </button>
          )}
          {status === "done" && (
            <>
              <button onClick={uploadAndEdit} style={btn("linear-gradient(135deg, #1d4ed8, #7c3aed)", false)}>
                ✨ Upload & Edit in Studio
              </button>
              <a href={recorded} download="webcam_recording.webm">
                <button style={btn("#1f2937", false)}>⬇️ Download</button>
              </a>
              <button onClick={() => { setStatus("idle"); setRecorded(null); setDuration(0); startCamera(); }} style={btn("#374151", false)}>
                🔄 Record Again
              </button>
            </>
          )}
          {status === "uploading" && (
            <button disabled style={btn("#374151", true)}>⬆️ Uploading...</button>
          )}
        </div>
      </div>
    </div>
  );
}
