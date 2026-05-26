import { useState, useEffect } from 'react';
import { PlayCircle as Youtube, X, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

const API = import.meta.env.VITE_API_URL ?? '';

const PRIVACY_OPTIONS = [
  { value: 'public',   label: 'Public',   desc: 'Anyone can find and watch' },
  { value: 'unlisted', label: 'Unlisted', desc: 'Anyone with the link can watch' },
  { value: 'private',  label: 'Private',  desc: 'Only you can watch' },
];

export default function YouTubePublishModal({ token, videoUrl, reelId, onClose }) {
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [tags,        setTags]        = useState('');
  const [privacy,     setPrivacy]     = useState('public');
  const [step,        setStep]        = useState(!videoUrl ? 'rendering' : 'form');
  const [result,      setResult]      = useState(null);
  const [errMsg,      setErrMsg]      = useState('');

  useEffect(() => {
    if (videoUrl && step === 'rendering') setStep('form');
  }, [videoUrl]);

  async function handlePublish() {
    if (!title.trim()) return alert('Please add a title');
    setStep('publishing');

    try {
      const tagArray = tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const res = await fetch(`${API}/api/youtube/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          videoUrl,
          reelId,
          title:       title.trim(),
          description: description.trim(),
          tags:        tagArray,
          privacy,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setResult(data);
      setStep('success');
    } catch (err) {
      setErrMsg(err.message);
      setStep('error');
    }
  }

  // ── Overlay ────────────────────────────────────────────────────────────────
  return (
    <div className="yt-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="yt-modal">

        {/* Header */}
        <div className="yt-modal-header">
          <Youtube size={20} className="yt-red" />
          <span>Publish to YouTube</span>
          <button className="yt-close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* ── FORM ── */}
        {step === 'rendering' && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ width: 48, height: 48, border: "3px solid rgba(255,0,0,0.2)", borderTopColor: "#FF0000", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 600, margin: "0 0 8px" }}>Preparing your video...</p>
          <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Rendering reel for YouTube upload</p>
        </div>
      )}

      {step === 'form' && (
          <div className="yt-modal-body">
            <label className="yt-field">
              <span>Title <em>*</em></span>
              <input
                type="text"
                maxLength={100}
                placeholder="My amazing reel"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
              <small>{title.length}/100</small>
            </label>

            <label className="yt-field">
              <span>Description</span>
              <textarea
                rows={4}
                maxLength={5000}
                placeholder="Tell viewers what this is about…"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </label>

            <label className="yt-field">
              <span>Tags <small>(comma separated)</small></span>
              <input
                type="text"
                placeholder="reel, onyx, video"
                value={tags}
                onChange={e => setTags(e.target.value)}
              />
            </label>

            <div className="yt-field">
              <span>Privacy</span>
              <div className="yt-privacy-group">
                {PRIVACY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={`yt-privacy-btn ${privacy === opt.value ? 'active' : ''}`}
                    onClick={() => setPrivacy(opt.value)}
                  >
                    <strong>{opt.label}</strong>
                    <small>{opt.desc}</small>
                  </button>
                ))}
              </div>
            </div>

            <button className="btn btn-publish" onClick={handlePublish}>
              <Youtube size={16} />
              Upload to YouTube
            </button>
          </div>
        )}

        {/* ── PUBLISHING ── */}
        {step === 'publishing' && (
          <div className="yt-modal-state">
            <Loader2 size={40} className="spin yt-red" />
            <p>Uploading to YouTube…</p>
            <small>This may take a minute for longer videos</small>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {step === 'success' && (
          <div className="yt-modal-state success">
            <CheckCircle2 size={40} className="green" />
            <p>Published successfully!</p>
            {result?.url && (
              <a href={result.url} target="_blank" rel="noreferrer" className="yt-link">
                View on YouTube <ExternalLink size={13} />
              </a>
            )}
            <button className="btn btn-ghost" onClick={onClose}>Done</button>
          </div>
        )}

        {/* ── ERROR ── */}
        {step === 'error' && (
          <div className="yt-modal-state error">
            <AlertCircle size={40} className="red" />
            <p>Upload failed</p>
            <small>{errMsg}</small>
            <div className="yt-error-actions">
              <button className="btn btn-ghost" onClick={() => setStep('form')}>Try again</button>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </div>
        )}

      </div>

      <style>{`
        .yt-modal-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.75);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }
        .yt-modal {
          background: #161616;
          border: 1px solid #2a2a2a;
          border-radius: 16px;
          width: 100%; max-width: 480px;
          display: flex; flex-direction: column;
          overflow: hidden;
        }
        .yt-modal-header {
          display: flex; align-items: center; gap: 10px;
          padding: 16px 20px;
          border-bottom: 1px solid #222;
          font-weight: 700; font-size: 16px; color: #fff;
        }
        .yt-modal-header .yt-close {
          margin-left: auto; background: none; border: none;
          color: #666; cursor: pointer;
        }
        .yt-modal-header .yt-close:hover { color: #fff; }
        .yt-modal-body {
          padding: 20px; display: flex; flex-direction: column; gap: 16px;
        }
        .yt-field {
          display: flex; flex-direction: column; gap: 6px;
          font-size: 13px; color: #aaa;
        }
        .yt-field span { font-weight: 600; color: #ddd; }
        .yt-field em { color: #FF0000; font-style: normal; }
        .yt-field input, .yt-field textarea {
          background: #1e1e1e; border: 1px solid #2a2a2a;
          border-radius: 8px; padding: 10px 12px;
          color: #fff; font-size: 14px; outline: none;
          transition: border-color 0.15s;
        }
        .yt-field input:focus, .yt-field textarea:focus {
          border-color: #FF0000;
        }
        .yt-field textarea { resize: vertical; min-height: 80px; }
        .yt-field small { color: #555; font-size: 11px; }
        .yt-privacy-group { display: flex; gap: 8px; flex-wrap: wrap; }
        .yt-privacy-btn {
          flex: 1; min-width: 120px;
          display: flex; flex-direction: column; gap: 2px;
          padding: 10px 12px; border-radius: 8px; cursor: pointer;
          background: #1e1e1e; border: 1px solid #2a2a2a;
          color: #aaa; text-align: left; transition: all 0.15s;
        }
        .yt-privacy-btn strong { font-size: 13px; color: #ddd; }
        .yt-privacy-btn small  { font-size: 11px; }
        .yt-privacy-btn.active { border-color: #FF0000; background: #2a0000; color: #fff; }
        .yt-privacy-btn.active strong { color: #fff; }
        .btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 10px 18px; border-radius: 10px; font-size: 14px;
          font-weight: 700; cursor: pointer; border: none; transition: opacity 0.15s;
        }
        .btn-publish { background: #FF0000; color: #fff; width: 100%; }
        .btn-publish:hover { opacity: 0.85; }
        .btn-ghost { background: #2a2a2a; color: #aaa; }
        .btn-ghost:hover { background: #333; color: #fff; }
        .yt-modal-state {
          padding: 40px 20px; display: flex; flex-direction: column;
          align-items: center; gap: 12px; text-align: center;
        }
        .yt-modal-state p { font-size: 18px; font-weight: 700; color: #fff; margin: 0; }
        .yt-modal-state small { font-size: 13px; color: #666; }
        .yt-link {
          display: inline-flex; align-items: center; gap: 5px;
          color: #FF0000; font-size: 14px; text-decoration: none;
        }
        .yt-link:hover { text-decoration: underline; }
        .yt-error-actions { display: flex; gap: 10px; margin-top: 4px; }
        .yt-red { color: #FF0000; }
        .green  { color: #4ade80; }
        .red    { color: #f87171; }
        .spin   { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
