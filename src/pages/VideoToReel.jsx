import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthHeaders } from '../utils/auth.js';
import TemplateSelectorPill from '../components/TemplateSelectorPill.jsx';
import ThemeSelectorPill from '../components/ThemeSelectorPill.jsx';

const THEMES = [
  { id: 'cinematic', label: '🎬 Cinematic', desc: 'Dark, dramatic, film-like' },
  { id: 'vibrant', label: '✨ Vibrant', desc: 'Bold colors, energetic' },
  { id: 'minimal', label: '⬜ Minimal', desc: 'Clean, modern, simple' },
  { id: 'vintage', label: '📷 Vintage', desc: 'Warm, retro, nostalgic' },
  { id: 'neon', label: '💜 Neon', desc: 'Dark background, glowing accents' },
];

const RATIOS = [
  { id: '9:16', label: '9:16', desc: 'TikTok / Reels / Shorts' },
  { id: '16:9', label: '16:9', desc: 'YouTube / Landscape' },
  { id: '1:1', label: '1:1', desc: 'Instagram Square' },
];

export default function VideoToReel() {
  const navigate = useNavigate();
  const [clips, setClips] = useState([]);
  const [theme, setTheme] = useState('cinematic');
  const [ratio, setRatio] = useState('9:16');
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const addFiles = useCallback((files) => {
    const valid = Array.from(files).filter(f => /\.(mp4|mov|webm|m4v)$/i.test(f.name));
    if (!valid.length) return setError('Please upload MP4, MOV, or WEBM files only.');
    setError('');
    setClips(prev => [...prev, ...valid].slice(0, 8));
  }, []);

  function onDrop(e) {
    e.preventDefault(); setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  function removeClip(idx) {
    setClips(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleGenerate() {
    if (clips.length < 1) return setError('Upload at least 1 video clip.');
    setProcessing(true); setError(''); setProgress('Uploading clips...');

    try {
      const headers = await getAuthHeaders();
      const formData = new FormData();
      clips.forEach(clip => formData.append('clips', clip));
      formData.append('theme', theme);
      formData.append('ratio', ratio);
      if (selectedTemplateId) formData.append('template_id', selectedTemplateId);
      if (selectedTheme) formData.append('theme_id', selectedTheme.id);

      setProgress('Processing clips...');
      const res = await fetch('/api/video-to-reel/process', {
        method: 'POST',
        headers: { Authorization: headers.Authorization },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Processing failed');

      setProgress('Opening editor...');
      navigate(`/editor?reelId=${data.reelId}`);
    } catch (err) {
      setError(err.message);
      setProcessing(false);
      setProgress('');
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#070b10', color: '#f1f5f9', padding: '40px 24px', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px' }}>🎬 Video to Reel</h1>
        <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>Upload your clips and we'll edit them into a ready-to-post social media reel.</p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? '#7c3aed' : '#1f2937'}`,
          borderRadius: 16, padding: '40px 24px',
          textAlign: 'center', cursor: 'pointer', marginBottom: 24,
          background: dragging ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.02)',
          transition: 'all 0.2s',
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
        <p style={{ color: '#94a3b8', margin: '0 0 6px', fontSize: 15 }}>Drag & drop your video clips here</p>
        <p style={{ color: '#334155', margin: 0, fontSize: 13 }}>MP4, MOV, WEBM · Up to 8 clips · 500MB each</p>
        <input ref={fileInputRef} type="file" multiple accept=".mp4,.mov,.webm,.m4v" style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />
      </div>

      {/* Clip list */}
      {clips.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            {clips.length} clip{clips.length !== 1 ? 's' : ''} selected
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {clips.map((clip, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid #1f2937' }}>
                <span style={{ fontSize: 20 }}>🎥</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clip.name}</div>
                  <div style={{ fontSize: 11, color: '#475569' }}>{(clip.size / 1024 / 1024).toFixed(1)} MB</div>
                </div>
                <button onClick={e => { e.stopPropagation(); removeClip(i); }} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16, padding: '4px 8px' }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Theme selector */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Style / Theme</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {THEMES.map(t => (
            <button key={t.id} onClick={() => setTheme(t.id)} style={{
              padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 13,
              border: `1px solid ${theme === t.id ? '#7c3aed' : '#1f2937'}`,
              background: theme === t.id ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)',
              color: theme === t.id ? '#c4b5fd' : '#64748b',
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Template & Occasion Theme */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Branding</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <TemplateSelectorPill value={selectedTemplateId} onChange={setSelectedTemplateId} />
          <ThemeSelectorPill selectedTheme={selectedTheme} onSelect={setSelectedTheme} />
        </div>
      </div>

      {/* Ratio selector */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 12, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Aspect Ratio</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {RATIOS.map(r => (
            <button key={r.id} onClick={() => setRatio(r.id)} style={{
              padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 13,
              border: `1px solid ${ratio === r.id ? '#3b82f6' : '#1f2937'}`,
              background: ratio === r.id ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
              color: ratio === r.id ? '#93c5fd' : '#64748b',
            }}>
              <div style={{ fontWeight: 600 }}>{r.label}</div>
              <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{r.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', color: '#f87171', fontSize: 14, marginBottom: 20 }}>{error}</div>}

      <button
        onClick={handleGenerate}
        disabled={processing || clips.length === 0}
        style={{
          width: '100%', padding: '16px', borderRadius: 12, border: 'none',
          background: processing || clips.length === 0 ? '#1f2937' : 'linear-gradient(135deg, #7c3aed, #ec4899)',
          color: processing || clips.length === 0 ? '#475569' : '#fff',
          fontSize: 16, fontWeight: 700, cursor: processing || clips.length === 0 ? 'not-allowed' : 'pointer',
        }}
      >
        {processing ? `⏳ ${progress}` : '🎬 Create Reel'}
      </button>

      {processing && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <div style={{ height: 3, background: '#1f2937', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, #7c3aed, #ec4899)', borderRadius: 3, width: '60%' }} />
          </div>
          <p style={{ color: '#475569', fontSize: 13, marginTop: 8 }}>{progress}</p>
        </div>
      )}
    </div>
  );
}
