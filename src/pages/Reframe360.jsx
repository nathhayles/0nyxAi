import { useState, useRef, useCallback, useEffect } from 'react';
import { getAuthHeaders } from '../utils/auth.js';

const RATIOS = [
  { id: '9:16', label: '9:16', desc: 'TikTok / Reels / Shorts' },
  { id: '16:9', label: '16:9', desc: 'YouTube / Landscape' },
  { id: '1:1', label: '1:1', desc: 'Instagram Square' },
];

const MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024; // 2GB, matches GoPro Max/Insta360 export sizes

export default function Reframe360() {
  const [file, setFile] = useState(null);
  const [ratio, setRatio] = useState('9:16');
  const [dragging, setDragging] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const addFile = useCallback((files) => {
    const f = files?.[0];
    if (!f) return;
    if (!/\.(mp4|mov|insv)$/i.test(f.name)) {
      return setError('Please upload an MP4, MOV, or INSV file (pre-stitched equirectangular video from your GoPro Max or Insta360 app).');
    }
    if (f.size > MAX_FILE_BYTES) {
      return setError('File too large. Max 2GB.');
    }
    setError('');
    setFile(f);
  }, []);

  function onDrop(e) {
    e.preventDefault(); setDragging(false);
    addFile(e.dataTransfer.files);
  }

  async function handleSubmit() {
    if (!file) return setError('Upload an equirectangular 360° video first.');
    setError('');
    setStatus('uploading');

    try {
      const headers = await getAuthHeaders();
      const formData = new FormData();
      formData.append('video', file);
      formData.append('aspect_ratio', ratio);

      const res = await fetch('/api/reframe360/submit', {
        method: 'POST',
        headers: { Authorization: headers.Authorization },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setJobId(data.jobId);
      setStatus('pending');
    } catch (err) {
      setError(err.message);
      setStatus(null);
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
        if (data.status === 'completed') setResult(data);
        if (data.status === 'failed') setError(data.error || 'Processing failed');
      } catch (err) {
        setError(err.message);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [jobId, status]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--onyx-bg)', color: 'var(--onyx-text)', padding: '40px 24px', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(180,141,255,0.15)', border: '1px solid rgba(180,141,255,0.3)', color: '#c4a9ff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Beta</span>
      </div>
      <div style={{ marginBottom: 32 }}>
        <h1 className="page-title">360° to Reel</h1>
        <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>
          Upload a pre-stitched equirectangular video from your GoPro Max or Insta360 app.
          Onyx automatically detects and follows the person in frame, cropping it into a
          normal reel — no manual framing needed.
        </p>
      </div>

      {!jobId && (
        <>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? '#4dd0ff' : 'var(--onyx-surface-2)'}`,
              borderRadius: 16, padding: '40px 24px',
              textAlign: 'center', cursor: 'pointer', marginBottom: 24,
              background: dragging ? 'rgba(77,208,255,0.08)' : 'var(--onyx-surface)',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌐</div>
            <p style={{ color: 'var(--onyx-text-dim)', margin: '0 0 6px', fontSize: 15 }}>
              {file ? file.name : 'Drag & drop your 360° video here'}
            </p>
            <p style={{ color: 'var(--onyx-text-faint)', margin: 0, fontSize: 13 }}>MP4, MOV, INSV · Up to 2GB · Equirectangular format only</p>
            <input ref={fileInputRef} type="file" accept=".mp4,.mov,.insv" style={{ display: 'none' }} onChange={e => addFile(e.target.files)} />
          </div>

          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 12, color: 'var(--onyx-text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Output Aspect Ratio</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {RATIOS.map(r => (
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

          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', color: '#f87171', fontSize: 14, marginBottom: 20 }}>{error}</div>}

          <button
            onClick={handleSubmit}
            disabled={!file || status === 'uploading'}
            className="btn-teal"
            style={{ width: '100%' }}
          >
            {status === 'uploading' ? 'Uploading…' : 'Auto-Reframe'}
          </button>
        </>
      )}

      {jobId && status !== 'completed' && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ height: 3, background: 'var(--onyx-surface-2)', borderRadius: 3, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, #4dd0ff, #b48dff)', borderRadius: 3, width: status === 'failed' ? '100%' : '60%', animation: status === 'failed' ? 'none' : 'pulse 1.5s ease-in-out infinite' }} />
          </div>
          <p style={{ color: 'var(--onyx-text-dim)', fontSize: 14 }}>
            {status === 'pending' && 'Starting…'}
            {status === 'processing' && 'Tracking the face and rendering your reel — this can take a few minutes for longer clips.'}
            {status === 'failed' && `Failed: ${error}`}
          </p>
        </div>
      )}

      {result?.status === 'completed' && (
        <div style={{ textAlign: 'center' }}>
          <video
            src={result.output_url}
            controls
            style={{ width: '100%', maxWidth: 360, borderRadius: 12, margin: '0 auto 20px', display: 'block' }}
          />
          <p style={{ color: 'var(--onyx-text-faint)', fontSize: 13, marginBottom: 16 }}>
            {result.segment_count} segments tracked · {result.duration_seconds?.toFixed(1)}s
          </p>
          <a href={result.output_url} download className="btn-teal" style={{ display: 'inline-block', textDecoration: 'none' }}>
            Download Reel
          </a>
        </div>
      )}
    </div>
  );
}
