// Admin: ambassador accounts and the ads their exports carry. Superadmin
// only -- every action goes through a backend endpoint that re-checks the
// role and writes admin_audit_log (migration 087); a plain admin just sees
// the server's "Superadmin only" error here.
//   GET  /api/admin/ambassadors
//   POST /api/admin/users/:id/ambassador   { tier: "limited"|"pro"|null, monthly_cap?, vo_minutes_quota? }
//   GET  /api/admin/ad-variants
//   POST /api/admin/ad-variants            multipart: file, name, aspect_ratio, weight
//   PATCH /api/admin/ad-variants/:id       { active?, weight? }
import { useState, useEffect, useCallback } from 'react';
import { getAuthHeaders } from '../utils/auth';

const AD_RATIOS = ['9:16', '16:9', '1:1', '4:5'];

const st = {
  card: { background: 'var(--onyx-bg-2)', border: '1px solid var(--onyx-hairline-strong)', borderRadius: 10, padding: 16, marginBottom: 16 },
  h: { fontSize: 13, fontWeight: 700, color: '#7de0ff', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--onyx-hairline-strong)', color: 'var(--onyx-text-faint)' },
  td: { padding: '8px 10px', borderBottom: '1px solid #0d1825', verticalAlign: 'middle' },
  input: { padding: '5px 8px', background: 'var(--onyx-bg-2)', border: '1px solid var(--onyx-hairline-strong)', borderRadius: 6, color: '#e2e8f0', fontSize: 12 },
  btn: { padding: '5px 10px', background: '#4dd0ff22', border: '1px solid #4dd0ff44', borderRadius: 6, color: '#4dd0ff', cursor: 'pointer', fontWeight: 700, fontSize: 12 },
  danger: { padding: '5px 10px', background: '#f8717122', border: '1px solid #f8717166', borderRadius: 6, color: '#f87171', cursor: 'pointer', fontWeight: 700, fontSize: 12 },
  err: { color: '#f87171', fontSize: 12, marginTop: 8 },
  ok: { color: '#4ade80', fontSize: 12, marginTop: 8 },
  faint: { color: 'var(--onyx-text-faint)', fontSize: 12 },
};

async function api(path, { method = 'GET', body, form } = {}) {
  const headers = await getAuthHeaders();
  const res = await fetch(path, {
    method,
    headers: form ? headers : { ...headers, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: form || (body ? JSON.stringify(body) : undefined),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const intOrNull = (v) => (v === '' || v == null ? null : Number(v));
const validInt = (v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 100000);

// ── Ambassadors ───────────────────────────────────────────────────────────

export function AmbassadorsPanel({ users = [] }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setError('');
    try { setRows((await api('/api/admin/ambassadors')).ambassadors || []); }
    catch (e) { setError(e.message); setRows([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (userId, tier, cap, vo) => {
    setError(''); setNotice('');
    const monthly_cap = intOrNull(cap), vo_minutes_quota = intOrNull(vo);
    if (!validInt(monthly_cap) || !validInt(vo_minutes_quota)) { setError('Cap and voiceover quota must be whole numbers from 0 to 100000.'); return false; }
    try {
      const r = await api(`/api/admin/users/${userId}/ambassador`, { method: 'POST', body: { tier, monthly_cap, vo_minutes_quota } });
      setNotice(r.code === 'unchanged' ? 'No change.' : `Ambassador ${r.code}.`);
      await load();
      return true;
    } catch (e) { setError(e.message); return false; }
  };

  const remove = async (row) => {
    if (!window.confirm(`Remove ambassador status from ${row.email || row.user_id}? Their credit balance is not changed.`)) return;
    setError(''); setNotice('');
    try {
      await api(`/api/admin/users/${row.user_id}/ambassador`, { method: 'POST', body: { tier: null } });
      setNotice('Ambassador removed.');
      await load();
    } catch (e) { setError(e.message); }
  };

  return (
    <div>
      <AddAmbassador users={users} existing={(rows || []).map((r) => r.user_id)} onSave={save} />
      <div style={st.card}>
        <h3 style={st.h}>Ambassadors</h3>
        <div style={st.faint}>Limits reset on the 1st of each month (UTC). Credit grants never count toward the cap. Free render, download and share never count.</div>
        {rows === null ? <p style={st.faint}>Loading…</p> : rows.length === 0 ? <p style={st.faint}>No ambassadors yet.</p> : (
          <table style={{ ...st.table, marginTop: 10 }}>
            <thead><tr>
              {['User', 'Tier', 'Balance', 'Spent / cap', 'VO minutes', 'Monthly cap', 'VO quota', ''].map((h) => <th key={h} style={st.th}>{h}</th>)}
            </tr></thead>
            <tbody>{rows.map((r) => <AmbassadorRow key={r.user_id} row={r} onSave={save} onRemove={remove} />)}</tbody>
          </table>
        )}
        {error && <div style={st.err}>{error}</div>}
        {notice && <div style={st.ok}>{notice}</div>}
      </div>
    </div>
  );
}

function AmbassadorRow({ row, onSave, onRemove }) {
  const [tier, setTier] = useState(row.tier);
  const [cap, setCap] = useState(String(row.monthly_cap));
  const [vo, setVo] = useState(String(row.vo_minutes_quota));
  const [busy, setBusy] = useState(false);
  useEffect(() => { setTier(row.tier); setCap(String(row.monthly_cap)); setVo(String(row.vo_minutes_quota)); }, [row]);
  const dirty = tier !== row.tier || cap !== String(row.monthly_cap) || vo !== String(row.vo_minutes_quota);
  return (
    <tr>
      <td style={st.td}>
        <div style={{ color: '#e2e8f0' }}>{row.email || '—'}</div>
        <div style={{ ...st.faint, fontSize: 10, fontFamily: 'monospace' }}>{row.user_id.slice(0, 8)}…</div>
      </td>
      <td style={st.td}>
        <select value={tier} onChange={(e) => setTier(e.target.value)} style={st.input}>
          <option value="limited">Limited</option>
          <option value="pro">Pro</option>
        </select>
      </td>
      <td style={{ ...st.td, color: '#fbbf24', fontWeight: 600 }}>{row.balance}</td>
      <td style={st.td}>{row.spent_this_month} / {row.monthly_cap}</td>
      <td style={st.td}>{row.vo_minutes_used} / {row.vo_minutes_quota}</td>
      <td style={st.td}><input type="number" min={0} max={100000} value={cap} onChange={(e) => setCap(e.target.value)} style={{ ...st.input, width: 80 }} /></td>
      <td style={st.td}><input type="number" min={0} max={100000} value={vo} onChange={(e) => setVo(e.target.value)} style={{ ...st.input, width: 80 }} /></td>
      <td style={{ ...st.td, whiteSpace: 'nowrap' }}>
        <button style={st.btn} disabled={!dirty || busy} onClick={async () => { setBusy(true); await onSave(row.user_id, tier, cap, vo); setBusy(false); }}>Save</button>{' '}
        <button style={st.danger} disabled={busy} onClick={() => onRemove(row)}>Remove</button>
      </td>
    </tr>
  );
}

function AddAmbassador({ users, existing, onSave }) {
  const [q, setQ] = useState('');
  const [userId, setUserId] = useState('');
  const [tier, setTier] = useState('limited');
  const [cap, setCap] = useState('200');
  const [vo, setVo] = useState('200');
  const [busy, setBusy] = useState(false);
  const candidates = q.trim().length < 2 ? [] : users
    .filter((u) => !existing.includes(u.id) && !['admin', 'superadmin'].includes(u.role))
    .filter((u) => (u.email || '').toLowerCase().includes(q.trim().toLowerCase()) || u.id.startsWith(q.trim()))
    .slice(0, 8);
  const picked = users.find((u) => u.id === userId);
  return (
    <div style={st.card}>
      <h3 style={st.h}>Make an ambassador</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="Search user by email or id" value={q} onChange={(e) => { setQ(e.target.value); setUserId(''); }} style={{ ...st.input, width: 260 }} />
        <select value={tier} onChange={(e) => setTier(e.target.value)} style={st.input}>
          <option value="limited">Limited — text tools, stock, uploads</option>
          <option value="pro">Pro — plus 3 video models from granted credits</option>
        </select>
        <label style={st.faint}>Cap <input type="number" value={cap} onChange={(e) => setCap(e.target.value)} style={{ ...st.input, width: 80 }} /></label>
        <label style={st.faint}>VO minutes <input type="number" value={vo} onChange={(e) => setVo(e.target.value)} style={{ ...st.input, width: 80 }} /></label>
        <button style={st.btn} disabled={!userId || busy} onClick={async () => {
          setBusy(true);
          if (await onSave(userId, tier, cap, vo)) { setQ(''); setUserId(''); }
          setBusy(false);
        }}>Make ambassador</button>
      </div>
      {picked && <div style={{ ...st.faint, marginTop: 8 }}>Selected: <b style={{ color: '#e2e8f0' }}>{picked.email}</b> — enrolling does not change their credit balance.</div>}
      {!picked && candidates.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {candidates.map((u) => (
            <button key={u.id} onClick={() => setUserId(u.id)} style={{ ...st.btn, textAlign: 'left', background: 'transparent', color: '#e2e8f0', fontWeight: 500 }}>
              {u.email || u.id} <span style={st.faint}>· {u.plan} · {u.credits} credits</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Ad variants ───────────────────────────────────────────────────────────

export function AdVariantsPanel() {
  const [variants, setVariants] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setError('');
    try { setVariants((await api('/api/admin/ad-variants')).variants || []); }
    catch (e) { setError(e.message); setVariants([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const update = async (id, patch) => {
    setError(''); setNotice('');
    try { await api(`/api/admin/ad-variants/${id}`, { method: 'PATCH', body: patch }); await load(); }
    catch (e) { setError(e.message); }
  };

  const activeByRatio = Object.fromEntries(AD_RATIOS.map((r) => [r, (variants || []).filter((v) => v.aspect_ratio === r && v.active).length]));

  return (
    <div>
      <UploadAdVariant onUploaded={async (msg) => { setNotice(msg); await load(); }} onError={setError} />
      <div style={st.card}>
        <h3 style={st.h}>Ad variants</h3>
        <div style={st.faint}>
          Each ambassador export gets one active variant for its aspect ratio, picked at random by weight, about 70% of the way through.
          A ratio with no active variant can't be exported by ambassadors. Variants are never deleted; deactivate instead.
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          {AD_RATIOS.map((r) => (
            <span key={r} style={{ ...st.faint, color: activeByRatio[r] ? '#4ade80' : '#f87171', fontWeight: 600 }}>{r}: {activeByRatio[r]} active</span>
          ))}
        </div>
        {variants === null ? <p style={st.faint}>Loading…</p> : (
          <table style={{ ...st.table, marginTop: 10 }}>
            <thead><tr>{['Ratio', 'Name', 'Length', 'R2 key', 'Weight', 'Active'].map((h) => <th key={h} style={st.th}>{h}</th>)}</tr></thead>
            <tbody>
              {variants.map((v) => <AdVariantRow key={v.id} v={v} onUpdate={update} />)}
            </tbody>
          </table>
        )}
        {error && <div style={st.err}>{error}</div>}
        {notice && <div style={st.ok}>{notice}</div>}
      </div>
    </div>
  );
}

function AdVariantRow({ v, onUpdate }) {
  const [weight, setWeight] = useState(String(v.weight));
  useEffect(() => setWeight(String(v.weight)), [v.weight]);
  const w = Number(weight);
  const weightOk = Number.isInteger(w) && w >= 1 && w <= 100;
  return (
    <tr style={{ opacity: v.active ? 1 : 0.55 }}>
      <td style={st.td}>{v.aspect_ratio}</td>
      <td style={st.td}>{v.name}</td>
      <td style={st.td}>{Number(v.duration_seconds).toFixed(1)}s</td>
      <td style={{ ...st.td, fontFamily: 'monospace', fontSize: 11, color: 'var(--onyx-text-faint)' }}>{v.r2_key}</td>
      <td style={{ ...st.td, whiteSpace: 'nowrap' }}>
        <input type="number" min={1} max={100} value={weight} onChange={(e) => setWeight(e.target.value)} style={{ ...st.input, width: 60 }} />{' '}
        <button style={st.btn} disabled={!weightOk || w === v.weight} onClick={() => onUpdate(v.id, { weight: w })}>Set</button>
      </td>
      <td style={st.td}>
        <button style={v.active ? st.danger : st.btn} onClick={() => onUpdate(v.id, { active: !v.active })}>
          {v.active ? 'Deactivate' : 'Activate'}
        </button>
      </td>
    </tr>
  );
}

function UploadAdVariant({ onUploaded, onError }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [ratio, setRatio] = useState('9:16');
  const [weight, setWeight] = useState('1');
  const [busy, setBusy] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  const submit = async () => {
    onError('');
    const form = new FormData();
    form.append('file', file);
    form.append('name', name.trim());
    form.append('aspect_ratio', ratio);
    form.append('weight', weight);
    setBusy(true);
    try {
      const r = await api('/api/admin/ad-variants', { method: 'POST', form });
      setFile(null); setName(''); setWeight('1'); setInputKey((k) => k + 1);
      await onUploaded(`Uploaded to ${r.r2_key}. It is active now.`);
    } catch (e) { onError(e.message); }
    setBusy(false);
  };
  return (
    <div style={st.card}>
      <h3 style={st.h}>Upload an ad variant</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input key={inputKey} type="file" accept="video/mp4" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ ...st.input, width: 240 }} />
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} style={{ ...st.input, width: 200 }} />
        <select value={ratio} onChange={(e) => setRatio(e.target.value)} style={st.input}>
          {AD_RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <label style={st.faint}>Weight <input type="number" min={1} max={100} value={weight} onChange={(e) => setWeight(e.target.value)} style={{ ...st.input, width: 60 }} /></label>
        <button style={st.btn} disabled={!file || !name.trim() || busy} onClick={submit}>{busy ? 'Uploading…' : 'Upload'}</button>
      </div>
      <div style={{ ...st.faint, marginTop: 8 }}>MP4, up to 30 MB and 15 seconds, in the chosen ratio. It's resized to each export's frame and plays with the reel's music ducked under it.</div>
    </div>
  );
}
