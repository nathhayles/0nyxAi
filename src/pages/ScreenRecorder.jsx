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
  const [includeAudio, setIncludeAudio] = useState(true);
  const [includeWebcam, setIncludeWebcam] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | countdown | recording | done | uploading
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [error, setError] = useState("");
  const [brandId, setBrandId] = useState("");

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const webcamStreamRef = useRef(null);
  const timerRef = useRef(null);
  const previewRef = useRef(null);
  const webcamRef = useRef(null);

  useEffect(() => {
    return () => {
      stopAll();
    };
  }, []);

  function stopAll() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (webcamStreamRef.current) webcamStreamRef.current.getTracks().forEach(t => t.stop());
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

    try {
      // Get screen stream
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: includeAudio,
      });
      streamRef.current = screenStream;

      let combinedStream = screenStream;

      // Optionally mix in webcam
      if (includeWebcam) {
        try {
          const webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          webcamStreamRef.current = webcamStream;
          if (webcamRef.current) webcamRef.current.srcObject = webcamStream;
        } catch { /* webcam optional */ }
      }

      if (previewRef.current) previewRef.current.srcObject = screenStream;

      const recorder = new MediaRecorder(combinedStream, { mimeType: "video/webm;codecs=vp9" });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
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
        scenes: [{ id: 1, url, mediaType: "video", mode: "upload", narration: "", action: "Screen recording" }],
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

  const dark = { minHeight: "100vh", background: "#06070a", color: "#fff", fontFamily: "sans-serif", padding: "40px 24px" };
  const card = { background: "#0c1016", border: "1px solid #1f2937", borderRadius: 12, padding: 24, marginBottom: 16 };
  const btn = (bg, disabled) => ({ padding: "13px 28px", borderRadius: 8, border: "none", background: disabled ? "#374151" : bg, color: "#fff", fontWeight: 700, fontSize: 15, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1 });

  return (
    <div style={dark}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <button onClick={() => navigate("/studio")} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, marginBottom: 24, padding: 0 }}>← Back to Studio</button>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>🖥️ Screen Recording</h1>
        <p style={{ color: "#64748b", fontSize: 15, marginBottom: 28 }}>Record your screen and turn it into a video reel with AI voiceover and captions.</p>

        {error && <div style={{ padding: "12px 16px", borderRadius: 8, marginBottom: 16, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: 14 }}>{error}</div>}

        {/* Options */}
        {status === "idle" && (
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 16 }}>Recording Options</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                { key: "includeAudio", label: "🎙️ Include System Audio", val: includeAudio, set: setIncludeAudio },
                { key: "includeWebcam", label: "📷 Picture-in-Picture Webcam", val: includeWebcam, set: setIncludeWebcam },
              ].map(opt => (
                <div key={opt.key} onClick={() => opt.set(v => !v)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 8, cursor: "pointer",
                    background: opt.val ? "rgba(29,78,216,0.15)" : "#111827",
                    border: opt.val ? "1px solid #3b82f6" : "1px solid #1f2937" }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, background: opt.val ? "#1d4ed8" : "#374151", border: "1px solid #4b5563", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
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
            <video ref={previewRef} autoPlay muted style={{ width: "100%", borderRadius: 8, background: "#000", maxHeight: 300 }} />
            {includeWebcam && (
              <video ref={webcamRef} autoPlay muted style={{ position: "absolute", bottom: 20, right: 20, width: 160, borderRadius: 8, border: "2px solid #3b82f6" }} />
            )}
          </div>
        )}

        {/* Preview after recording */}
        {status === "done" && recorded && (
          <div style={card}>
            <div style={{ fontSize: 13, color: "#4ade80", fontWeight: 600, marginBottom: 12 }}>✅ Recording complete — {fmt(duration)}</div>
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
            <button onClick={startRecording} style={btn("linear-gradient(135deg, #1d4ed8, #7c3aed)", false)}>
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
              <button onClick={uploadAndEdit} style={btn("linear-gradient(135deg, #1d4ed8, #7c3aed)", false)}>
                ✨ Upload & Edit in Studio
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
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#1e3a5f", border: "1px solid #3b82f6", color: "#60a5fa", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i+1}</div>
                <span style={{ fontSize: 13, color: "#94a3b8", paddingTop: 2 }}>{step}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
