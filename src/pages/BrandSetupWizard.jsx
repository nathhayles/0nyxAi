import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getAuthHeaders } from '../utils/auth.js';

const VOICES = [
  { id: 'alloy',   label: 'Alloy',   desc: 'Neutral, balanced' },
  { id: 'echo',    label: 'Echo',    desc: 'Clear, conversational' },
  { id: 'fable',   label: 'Fable',   desc: 'Warm, storytelling' },
  { id: 'onyx',    label: 'Onyx',    desc: 'Deep, authoritative' },
  { id: 'nova',    label: 'Nova',    desc: 'Energetic, bright' },
  { id: 'shimmer', label: 'Shimmer', desc: 'Soft, expressive' },
];

const FONTS = ['Inter', 'Montserrat', 'Oswald', 'Playfair Display', 'Roboto'];
const POSITIONS = ['top', 'center', 'bottom'];
const RATIOS = [
  { value: '9:16', label: '9:16', desc: 'Vertical — TikTok, Reels, Shorts' },
  { value: '16:9', label: '16:9', desc: 'Landscape — YouTube, Desktop' },
  { value: '1:1',  label: '1:1',  desc: 'Square — Instagram Feed' },
];

export default function BrandSetupWizard() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/dashboard';

  const [step, setStep]         = useState(1);
  const [saving, setSaving]     = useState(false);
  const [previewing, setPreviewing] = useState(null);
  const [checking, setChecking] = useState(true);

  const [voice, setVoice]             = useState('nova');
  const [captionColor, setCaptionColor] = useState('#ffffff');
  const [captionFont, setCaptionFont]   = useState('Inter');
  const [captionPos, setCaptionPos]     = useState('bottom');
  const [ratio, setRatio]               = useState('9:16');

  // Skip wizard if a default brand already exists
  useEffect(() => {
    getAuthHeaders().then(headers => {
      fetch('/api/brands', { headers })
        .then(r => r.json())
        .then(data => {
          const brands = Array.isArray(data) ? data : (data.brands || []);
          if (brands.some(b => b.is_default)) navigate(next, { replace: true });
        })
        .catch(() => {})
        .finally(() => setChecking(false));
    });
  }, []);

  const previewVoice = async (voiceId) => {
    if (previewing) return;
    setPreviewing(voiceId);
    try {
      const r = await fetch(`/api/tts/voice-preview-standard?voice=${voiceId}`);
      const blob = await r.blob();
      new Audio(URL.createObjectURL(blob)).play();
    } catch {}
    finally { setPreviewing(null); }
  };

  const save = async () => {
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const r = await fetch('/api/brands', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_label: 'My Brand',
          default_voice_id: voice,
          default_voice_provider: 'openai',
          caption_color: captionColor,
          caption_font: captionFont,
          caption_position: captionPos,
          aspect_ratio: ratio,
          is_default: true,
        }),
      });
      const brand = await r.json();
      const id = brand?.id;
      if (id) {
        await fetch(`/api/brands/${id}/set-default`, {
          method: 'POST',
          headers,
        });
      }
      navigate(next, { replace: true });
    } catch (e) {
      console.error('[BrandSetupWizard] save failed', e);
      setSaving(false);
    }
  };

  if (checking) return (
    <div style={s.page}>
      <p style={{ color: 'var(--onyx-cyan)' }}>Checking your account…</p>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* Header */}
        <div style={s.header}>
          <img src="/onyx-logo.svg" alt="Onyx" style={{ height: 28 }} onError={e => { e.target.style.display = 'none'; }} />
          <h1 style={s.title}>Set up your brand</h1>
          <p style={s.subtitle}>Takes 30 seconds. You can change this anytime in Settings.</p>
        </div>

        {/* Step indicator */}
        <div style={s.steps}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <div style={{
                ...s.stepDot,
                background: step >= n ? 'var(--onyx-cyan)' : 'var(--onyx-surface-2)',
                color: step >= n ? '#0a0f1a' : '#4a6a8a',
              }}>{n}</div>
              {n < 3 && <div style={{ width: 32, height: 1, background: step > n ? 'var(--onyx-cyan)' : 'var(--onyx-surface-2)' }} />}
            </div>
          ))}
        </div>

        {/* Step 1 — Voice */}
        {step === 1 && (
          <div>
            <h2 style={s.stepTitle}>Choose your narrator voice</h2>
            <div style={s.voiceGrid}>
              {VOICES.map(v => (
                <div key={v.id} onClick={() => setVoice(v.id)} style={{
                  ...s.voiceCard,
                  border: voice === v.id ? '1.5px solid var(--onyx-cyan)' : '1.5px solid var(--onyx-surface-2)',
                  background: voice === v.id ? 'var(--onyx-surface)' : 'var(--onyx-bg-2)',
                }}>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>{v.label}</div>
                  <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{v.desc}</div>
                  <button
                    onClick={e => { e.stopPropagation(); previewVoice(v.id); }}
                    style={s.previewBtn}
                    disabled={!!previewing}
                  >
                    {previewing === v.id ? '⏳' : '▶ Preview'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Captions */}
        {step === 2 && (
          <div>
            <h2 style={s.stepTitle}>Caption style</h2>

            <label style={s.label}>Font</label>
            <div style={s.chipRow}>
              {FONTS.map(f => (
                <div key={f} onClick={() => setCaptionFont(f)} style={{
                  ...s.chip,
                  border: captionFont === f ? '1.5px solid var(--onyx-cyan)' : '1.5px solid var(--onyx-surface-2)',
                  fontFamily: f,
                }}>{f}</div>
              ))}
            </div>

            <label style={s.label}>Colour</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
              <input type="color" value={captionColor} onChange={e => setCaptionColor(e.target.value)}
                style={{ width: 44, height: 36, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 6 }} />
              <span style={{ color: 'var(--onyx-text-dim)', fontSize: 13 }}>{captionColor}</span>
            </div>

            <label style={s.label}>Position</label>
            <div style={s.chipRow}>
              {POSITIONS.map(p => (
                <div key={p} onClick={() => setCaptionPos(p)} style={{
                  ...s.chip,
                  border: captionPos === p ? '1.5px solid var(--onyx-cyan)' : '1.5px solid var(--onyx-surface-2)',
                  textTransform: 'capitalize',
                }}>{p}</div>
              ))}
            </div>

            {/* Live preview */}
            <div style={{
              background: '#000', borderRadius: 8, padding: '24px 16px', marginTop: 16,
              minHeight: 80, display: 'flex',
              alignItems: captionPos === 'top' ? 'flex-start' : captionPos === 'center' ? 'center' : 'flex-end',
            }}>
              <span style={{ fontFamily: captionFont, color: captionColor, fontSize: 15, fontWeight: 600 }}>
                See the world from a view most people only dream about.
              </span>
            </div>
          </div>
        )}

        {/* Step 3 — Aspect ratio */}
        {step === 3 && (
          <div>
            <h2 style={s.stepTitle}>Default aspect ratio</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {RATIOS.map(r => (
                <div key={r.value} onClick={() => setRatio(r.value)} style={{
                  ...s.ratioCard,
                  border: ratio === r.value ? '1.5px solid var(--onyx-cyan)' : '1.5px solid var(--onyx-surface-2)',
                  background: ratio === r.value ? 'var(--onyx-surface)' : 'var(--onyx-bg-2)',
                }}>
                  <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 16 }}>{r.label}</div>
                  <div style={{ color: '#64748b', fontSize: 13 }}>{r.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
          {step > 1 && (
            <button onClick={() => setStep(n => n - 1)} style={s.backBtn}>← Back</button>
          )}
          {step < 3 ? (
            <button onClick={() => setStep(n => n + 1)} style={s.nextBtn}>Next →</button>
          ) : (
            <button onClick={save} disabled={saving} style={{ ...s.nextBtn, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : '✓ Save & continue'}
            </button>
          )}
        </div>

        <p style={{ color: '#334155', fontSize: 11, textAlign: 'center', marginTop: 16 }}>
          You can update these anytime in{' '}
          <span style={{ color: 'var(--onyx-cyan)' }}>Settings → Branding</span>
        </p>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh', background: 'var(--onyx-bg)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px 16px', fontFamily: 'Inter, system-ui, sans-serif',
  },
  card: {
    background: 'var(--onyx-bg-2)', border: '1px solid var(--onyx-hairline-strong)',
    borderRadius: 16, padding: '32px 28px',
    width: '100%', maxWidth: 480,
  },
  header:   { textAlign: 'center', marginBottom: 28 },
  title:    { color: '#e2e8f0', fontSize: 22, fontWeight: 700, margin: '12px 0 6px' },
  subtitle: { color: '#64748b', fontSize: 13 },
  steps:    { display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 28 },
  stepDot: {
    width: 28, height: 28, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 700,
  },
  stepTitle: { color: '#e2e8f0', fontSize: 16, fontWeight: 600, marginBottom: 16 },
  voiceGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  voiceCard: { borderRadius: 10, padding: '12px 14px', cursor: 'pointer', transition: 'border-color 0.15s' },
  previewBtn: {
    marginTop: 8, fontSize: 11, padding: '4px 10px',
    background: 'var(--onyx-surface-2)', border: 'none', borderRadius: 4,
    color: 'var(--onyx-cyan)', cursor: 'pointer',
  },
  label:   { display: 'block', color: 'var(--onyx-text-dim)', fontSize: 12, marginBottom: 8, marginTop: 16 },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  chip: {
    padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
    color: '#e2e8f0', fontSize: 13, background: 'var(--onyx-bg-2)',
    transition: 'border-color 0.15s',
  },
  ratioCard: { borderRadius: 10, padding: '14px 18px', cursor: 'pointer', transition: 'border-color 0.15s' },
  nextBtn: {
    flex: 1, padding: '12px 0', borderRadius: 8,
    background: 'var(--onyx-cyan)', color: 'var(--btn-primary-text)',
    fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
  },
  backBtn: {
    padding: '12px 20px', borderRadius: 8,
    background: 'var(--onyx-surface-2)', color: 'var(--onyx-text-dim)',
    fontSize: 14, border: 'none', cursor: 'pointer',
  },
};
