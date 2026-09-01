import { useState, useRef, useEffect } from 'react';
import { getAuthHeaders } from '../utils/auth.js';

// "Reshoot": video-editing mode built on fal.ai's Kling O1/O3 Pro
// video-to-video edit endpoints (backend/routes/kling.js POST /api/kling/edit).
// Unlike every other Create tool, this doesn't generate a new clip from a
// prompt/photo — it edits an EXISTING clip, changing only what the prompt
// asks for and leaving the rest (motion, lighting, untouched objects) alone.
// Named "Reshoot" rather than "Reframe" to avoid colliding with the existing
// 360°-auto-reframe feature (reframe360_jobs/routes/reframe360.js), which is
// a completely different tool that happens to share the "re-" naming family.
const MODELS = [
  { id: 'kling-o1-edit', label: 'Kling O1', desc: 'Fast video editing' },
  { id: 'kling-o3-pro-edit', label: 'Kling O3 Pro', desc: 'Higher-quality video editing' },
];

const MAX_FILE_BYTES = 200 * 1024 * 1024; // 200 MB — matches fal's real edit-endpoint limit

export default function ReshootVideo() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [prompt, setPrompt] = useState('');
  const [keepAudio, setKeepAudio] = useState(false);
  const [model, setModel] = useState(MODELS[0].id);

  const [editing, setEditing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState('');
  const [resultUrl, setResultUrl] = useState(null);
  const [dragging, setDragging] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => () => { if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl); }, [videoPreviewUrl]);

  async function handleFileSelect(file) {
    if (!file) return;
    setError('');
    if (!/\.(mp4|mov)$/i.test(file.name)) {
      return setError('Please upload an MP4 or MOV file.');
    }
    if (file.size > MAX_FILE_BYTES) {
      return setError(`File too large: ${(file.size / 1024 / 1024).toFixed(0)}MB. Max 200MB.`);
    }

    setVideoFile(file);
    setVideoPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(file); });
    setVideoUrl(null);
    setResultUrl(null);
    setUploading(true);
    try {
      const headers = await getAuthHeaders();
      const form = new FormData();
      form.append('files', file);
      form.append('assetType', 'video');
      const res = await fetch('/api/media/upload', { method: 'POST', headers, body: form });
      const data = await res.json();
      const uploaded = data?.files?.[0];
      if (!uploaded?.url) throw new Error(data?.error || 'Upload failed');
      setVideoUrl(uploaded.url);
    } catch (e) {
      console.error('[Reshoot] video upload failed:', e);
      setError(e.message || 'Video upload failed');
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e) {
    e.preventDefault(); setDragging(false);
    handleFileSelect(e.dataTransfer.files?.[0]);
  }

  const canSubmit = !!videoUrl && !!prompt.trim() && !editing && !uploading;

  async function handleSubmit() {
    if (!canSubmit) return;
    setEditing(true); setError(''); setResultUrl(null);
    setStatusText('Starting edit…');
    try {
      const h = await getAuthHeaders(); h['Content-Type'] = 'application/json';
      const submitRes = await fetch('/api/kling/edit', {
        method: 'POST',
        headers: h,
        body: JSON.stringify({
          prompt: prompt.trim(),
          video_url: videoUrl,
          keep_audio: keepAudio,
          model,
        }),
      });
      const submitData = await submitRes.json();
      if (!submitRes.ok) throw new Error(submitData.error || 'Edit failed to start');
      const { jobId } = submitData;
      if (!jobId) throw new Error('No jobId returned');

      setStatusText('Editing your clip — this can take a few minutes…');
      // Same 5s-poll / 20min-deadline pattern as Create.jsx/QuickCreatePanel.jsx
      // — falPoll takes up to 10 min server-side, plus download time.
      const deadline = Date.now() + 1200000;
      let result = null;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 5000));
        let poll;
        try {
          const ph = await getAuthHeaders();
          poll = await (await fetch(`/api/kling/status/${jobId}`, { headers: ph })).json();
        } catch (pollErr) {
          console.warn('[Reshoot] poll transient failure, retrying:', pollErr);
          continue;
        }
        if (poll.status === 'completed') {
          if (!poll.videoUrl) throw new Error('Edit completed but no video URL returned');
          result = poll;
          break;
        }
        if (poll.status === 'failed') throw new Error(poll.error || 'Edit failed');
      }
      if (!result) throw new Error('Timed out waiting for the edited video');

      setResultUrl(result.videoUrl);
    } catch (e) {
      console.error('[Reshoot] edit failed:', e);
      setError(e.message || 'Edit failed');
    } finally {
      setEditing(false);
      setStatusText('');
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--onyx-bg)', color: 'var(--onyx-text)', padding: '40px 24px', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 className="page-title">Reshoot</h1>
        <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>
          Change only what you ask for. Upload a clip, describe the edit, and everything else — motion, lighting, the rest of the shot — stays exactly as it was.
        </p>
      </div>

      {/* Drop zone / preview */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? '#4dd0ff' : 'var(--onyx-surface-2)'}`,
          borderRadius: 16, padding: videoPreviewUrl ? 12 : '40px 24px',
          textAlign: 'center', cursor: 'pointer', marginBottom: 24,
          background: dragging ? 'rgba(77,208,255,0.08)' : 'var(--onyx-surface)',
          transition: 'all 0.2s',
        }}
      >
        {videoPreviewUrl ? (
          <video src={videoPreviewUrl} controls style={{ width: '100%', maxHeight: 360, borderRadius: 10, opacity: uploading ? 0.6 : 1 }} />
        ) : (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
            <p style={{ color: 'var(--onyx-text-dim)', margin: '0 0 6px', fontSize: 15 }}>Drag & drop the clip you want to edit</p>
            <p style={{ color: 'var(--onyx-text-faint)', margin: 0, fontSize: 13 }}>MP4, MOV · 3–10s · 720–2160px · up to 200MB</p>
          </>
        )}
        <input ref={fileInputRef} type="file" accept=".mp4,.mov" style={{ display: 'none' }} onChange={(e) => handleFileSelect(e.target.files?.[0])} />
      </div>
      {uploading && <p style={{ fontSize: 12, color: 'var(--onyx-text-faint)', marginTop: -16, marginBottom: 20 }}>Uploading…</p>}

      {/* Prompt */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: 'var(--onyx-text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>What do you want to change?</div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Change the background to a rainy city street at night, keep the subject and camera movement exactly the same"
          rows={4}
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 10, boxSizing: 'border-box',
            border: '1px solid var(--onyx-hairline-strong)', background: 'var(--onyx-surface)',
            color: 'var(--onyx-text)', fontSize: 14, resize: 'vertical',
          }}
        />
      </div>

      {/* Model + audio */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: 'var(--onyx-text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Model</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {MODELS.map((m) => (
            <button key={m.id} onClick={() => setModel(m.id)} style={{
              padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 13,
              border: `1px solid ${model === m.id ? '#4dd0ff' : 'var(--onyx-surface-2)'}`,
              background: model === m.id ? 'rgba(77,208,255,0.15)' : 'var(--onyx-surface)',
              color: model === m.id ? '#7de0ff' : 'var(--onyx-text-dim)',
            }}>
              <div style={{ fontWeight: 600 }}>{m.label}</div>
              <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{m.desc}</div>
            </button>
          ))}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--onyx-text-dim)', cursor: 'pointer' }}>
          <input type="checkbox" checked={keepAudio} onChange={(e) => setKeepAudio(e.target.checked)} />
          Keep the original clip's audio
        </label>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', color: '#f87171', fontSize: 14, marginBottom: 20 }}>{error}</div>}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="btn-teal"
        style={{ width: '100%' }}
      >
        {editing ? statusText : 'Reshoot Clip'}
      </button>

      {editing && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <div style={{ height: 3, background: 'var(--onyx-surface-2)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, #4dd0ff, #ec4899)', borderRadius: 3, width: '60%' }} />
          </div>
          <p style={{ color: 'var(--onyx-text-faint)', fontSize: 13, marginTop: 8 }}>{statusText}</p>
        </div>
      )}

      {resultUrl && (
        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: 12, color: 'var(--onyx-text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Before / After</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--onyx-text-faint)', marginBottom: 6 }}>Original</div>
              <video src={videoPreviewUrl} controls style={{ width: '100%', borderRadius: 10 }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--onyx-text-faint)', marginBottom: 6 }}>Reshot</div>
              <video src={resultUrl} controls style={{ width: '100%', borderRadius: 10 }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
