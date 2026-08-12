import { useState, useEffect } from 'react';
import { getAuthHeaders } from '../utils/auth';

// Tab restructure (2026-08-13): previously all 4 sections below the stats
// header rendered stacked on one long page. TABS drives both the nav bar
// and which single panel is mounted -- only the active tab's panel exists
// in the tree at a time (not just hidden via CSS), so switching tabs is
// also a cheap way to avoid every panel firing its own fetch on initial
// load.
const TABS = [
  { key: 'generations', label: 'Generations' },
  { key: 'users', label: 'Users' },
  { key: 'model-usage', label: 'Model Usage' },
  { key: 'flagged-uploads', label: 'Flagged Uploads' },
];

function TabBar({ active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid var(--onyx-hairline-strong)', paddingBottom: 12 }}>
      {TABS.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            ...s.grantBtn,
            background: active === t.key ? '#4dd0ff44' : 'transparent',
            borderColor: active === t.key ? '#4dd0ff' : 'var(--onyx-hairline-strong)',
            color: active === t.key ? '#7de0ff' : 'var(--onyx-text-faint)',
            fontSize: 13,
            padding: '7px 16px',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// Shared 10/20/Full display-limit control (2026-08-13) -- used by every
// row-list tab (Generations, Users, Flagged Uploads). Model Usage is an
// aggregate chart, not a row list, so it doesn't get one. "full" is a
// string sentinel, not a number, so callers can tell it apart from a
// numeric page size at a glance without a separate boolean flag.
function LimitControl({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[10, 20, 'full'].map(v => (
        <button
          key={v}
          onClick={() => onChange(v)}
          style={{
            ...s.grantBtn,
            background: value === v ? '#4dd0ff44' : 'transparent',
            borderColor: value === v ? '#4dd0ff' : 'var(--onyx-hairline-strong)',
            color: value === v ? '#7de0ff' : 'var(--onyx-text-faint)',
            fontSize: 11,
            padding: '4px 10px',
          }}
        >
          {v === 'full' ? 'Full' : v}
        </button>
      ))}
    </div>
  );
}

export default function AdminPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [grantingCredits, setGrantingCredits] = useState({});
  const [activeTab, setActiveTab] = useState('generations');

  useEffect(() => {
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const d = await fetch('/api/admin/users', { headers }).then(r => r.json());
        setData(d);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const grantCredits = async (userId, amount) => {
    setGrantingCredits(g => ({ ...g, [userId]: true }));
    const headers = await getAuthHeaders();
    await fetch(`/api/admin/users/${userId}/credits`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(amount) }),
    });
    const fresh = await fetch('/api/admin/users', { headers }).then(r => r.json());
    setData(fresh);
    setGrantingCredits(g => ({ ...g, [userId]: false }));
  };

  if (loading) return <div style={s.page}><p style={{ color: '#4dd0ff' }}>Loading...</p></div>;
  if (!data) return <div style={s.page}><p style={{ color: '#f87171' }}>Access denied or error.</p></div>;

  const { stats, users } = data;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Onyx Admin</h1>
        <p style={s.sub}>Internal dashboard — Onyx staff only</p>
      </div>

      <div style={s.statsGrid}>
        {[
          { label: 'Total Users',   value: stats.total_users },
          { label: 'Active Subs',   value: stats.active_subscriptions },
          { label: 'Total Reels',   value: stats.total_reels },
          { label: 'Total Exports', value: stats.total_renders },
          { label: 'Total Revenue', value: `$${(stats.total_revenue/100).toFixed(2)}` },
        ].map(card => (
          <div key={card.label} style={s.statCard}>
            <div style={s.statVal}>{card.value}</div>
            <div style={s.statLabel}>{card.label}</div>
          </div>
        ))}
      </div>

      <TabBar active={activeTab} onChange={setActiveTab} />

      {activeTab === 'generations' && <GenerationsPanel />}
      {activeTab === 'users' && <UsersPanel users={users} onGrant={grantCredits} grantingCredits={grantingCredits} />}
      {activeTab === 'model-usage' && <ModelUsagePanel />}
      {activeTab === 'flagged-uploads' && <FlaggedUploadsPanel />}
    </div>
  );
}

const MODEL_LABELS = {
  'wan-2.5': 'Wan 2.5',
  'wan-2.7': 'Wan 2.7',
  'kling-2.6-pro': 'Kling 3 Pro',
  'veo-3': 'Veo 3.1',
  'seedance-1-pro': 'Seedance 1 Pro',
  'vidu-q3-pro': 'Vidu Q3 Pro',
};

const PLAN_COLORS = {
  free: '#64748b',
  student: '#4dd0ff',
  starter: '#4ade80',
  creator: '#fbbf24',
  pro: '#f472b6',
  agency: '#a78bfa',
  unknown: '#334155',
};

const USAGE_WINDOWS = [
  { key: '7', label: '7d' },
  { key: '30', label: '30d' },
  { key: '90', label: '90d' },
  { key: 'all', label: 'All time' },
];

function ModelUsagePanel() {
  const [windowKey, setWindowKey] = useState('30');
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/admin/analytics/model-usage?window=${windowKey}`, { headers });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Failed to load');
        if (!cancelled) setUsage(d);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [windowKey]);

  const counts = usage?.counts || {};
  const models = Object.keys(counts).sort();
  const plans = Array.from(new Set(models.flatMap(m => Object.keys(counts[m])))).sort();
  const maxTotal = Math.max(1, ...models.map(m => Object.values(counts[m]).reduce((a, b) => a + b, 0)));

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ color: '#4dd0ff', fontSize: 14, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
          Model Selection by Plan Tier
        </h3>
        <div style={{ display: 'flex', gap: 6 }}>
          {USAGE_WINDOWS.map(w => (
            <button
              key={w.key}
              onClick={() => setWindowKey(w.key)}
              style={{
                ...s.grantBtn,
                background: windowKey === w.key ? '#4dd0ff44' : 'transparent',
                borderColor: windowKey === w.key ? '#4dd0ff' : 'var(--onyx-hairline-strong)',
                color: windowKey === w.key ? '#7de0ff' : 'var(--onyx-text-faint)',
                fontSize: 11,
                padding: '4px 10px',
              }}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--onyx-bg-2)', border: '1px solid var(--onyx-hairline-strong)', borderRadius: 10, padding: 20 }}>
        {loading ? (
          <p style={{ color: '#4dd0ff', fontSize: 13, margin: 0 }}>Loading...</p>
        ) : error ? (
          <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>Failed to load: {error}</p>
        ) : models.length === 0 ? (
          <p style={{ color: 'var(--onyx-text-faint)', fontSize: 13, margin: 0 }}>No model selections recorded for this window.</p>
        ) : (
          <>
            {models.map(model => {
              const modelPlans = counts[model];
              const total = Object.values(modelPlans).reduce((a, b) => a + b, 0);
              return (
                <div key={model} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{MODEL_LABELS[model] || model}</span>
                    <span style={{ color: 'var(--onyx-text-faint)' }}>{total}</span>
                  </div>
                  <div style={{ display: 'flex', height: 18, width: '100%', borderRadius: 4, overflow: 'hidden', background: '#0d1825' }}>
                    {plans.map(plan => {
                      const count = modelPlans[plan] || 0;
                      if (!count) return null;
                      const pct = (count / maxTotal) * 100;
                      return (
                        <div
                          key={plan}
                          title={`${plan}: ${count}`}
                          style={{ width: `${pct}%`, background: PLAN_COLORS[plan] || '#64748b' }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: 'var(--onyx-text-faint)', margin: '12px 0 20px' }}>
              {plans.map(plan => (
                <div key={plan} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: PLAN_COLORS[plan] || '#64748b', display: 'inline-block' }} />
                  {plan}
                </div>
              ))}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Model</th>
                    {plans.map(plan => <th key={plan} style={{ ...s.th, textAlign: 'right' }}>{plan}</th>)}
                    <th style={{ ...s.th, textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map(model => {
                    const modelPlans = counts[model];
                    const total = Object.values(modelPlans).reduce((a, b) => a + b, 0);
                    return (
                      <tr key={model} style={s.row}>
                        <td style={s.td}>{MODEL_LABELS[model] || model}</td>
                        {plans.map(plan => (
                          <td key={plan} style={{ ...s.td, textAlign: 'right' }}>{modelPlans[plan] || 0}</td>
                        ))}
                        <td style={{ ...s.td, textAlign: 'right', fontWeight: 700, color: '#fbbf24' }}>{total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const STATUS_COLORS = {
  completed: '#4ade80',
  failed: '#f87171',
  pending: '#4dd0ff',
  submitting: '#fbbf24',
  waiting: '#94a3b8',
};

// Per-generation list with user attribution -- lets support/admin trace a
// specific video (or a fal.ai/WaveSpeed request_id straight from their own
// dashboard) back to the Onyx user who made it. q matches task_id/
// fal_request_id/kling_task_id server-side, exactly the ids a provider
// dashboard or support ticket would hand you.
function GenerationsPanel() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // "full" maps to the server's own cap (500, see routes/admin.js) rather
  // than an unbounded query -- see LimitControl's own comment.
  const effectiveLimit = limit === 'full' ? 500 : limit;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const headers = await getAuthHeaders();
        const params = new URLSearchParams({ page: String(page), limit: String(effectiveLimit) });
        if (q.trim()) params.set('q', q.trim());
        const res = await fetch(`/api/admin/generations?${params}`, { headers });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Failed to load');
        if (!cancelled) { setRows(d.generations || []); setTotal(d.total || 0); }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [page, q, effectiveLimit]);

  const totalPages = Math.max(1, Math.ceil(total / effectiveLimit));

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12 }}>
        <h3 style={{ color: '#4dd0ff', fontSize: 14, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
          Generations
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'var(--onyx-text-faint)', fontSize: 12 }}>{total} total</span>
          <LimitControl value={limit} onChange={v => { setLimit(v); setPage(1); }} />
        </div>
      </div>

      <input
        value={q}
        onChange={e => { setQ(e.target.value); setPage(1); }}
        placeholder="Search by task ID or fal.ai/WaveSpeed request ID..."
        style={s.search}
      />

      <div style={{ overflowX: 'auto' }}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Video</th>
              <th style={s.th}>Model</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Cost</th>
              <th style={s.th}>User</th>
              <th style={s.th}>Request ID</th>
              <th style={s.th}>Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ ...s.td, color: '#4dd0ff' }}>Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={7} style={{ ...s.td, color: '#f87171' }}>Failed to load: {error}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} style={{ ...s.td, color: 'var(--onyx-text-faint)' }}>No generations found.</td></tr>
            ) : rows.map(g => (
              <tr key={g.task_id} style={s.row}>
                <td style={s.td}>
                  {g.video_url ? (
                    <a href={g.video_url} target="_blank" rel="noreferrer">
                      {g.thumbnail_url ? (
                        <img src={g.thumbnail_url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4, display: 'block' }} />
                      ) : (
                        <div style={{ width: 48, height: 48, borderRadius: 4, background: '#0d1825', border: '1px solid var(--onyx-hairline-strong)' }} />
                      )}
                    </a>
                  ) : g.thumbnail_url ? (
                    <img src={g.thumbnail_url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4, display: 'block' }} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: 4, background: '#0d1825' }} />
                  )}
                </td>
                <td style={s.td}>{MODEL_LABELS[g.model] || g.model || '—'}</td>
                <td style={s.td}>
                  <span style={{ ...s.badge, background: (STATUS_COLORS[g.status] || '#94a3b8') + '22', color: STATUS_COLORS[g.status] || '#94a3b8' }}>
                    {g.status}
                  </span>
                </td>
                <td style={{ ...s.td, color: '#fbbf24', fontWeight: 600 }}>
                  {typeof g.cost === 'number' ? `${g.cost} cr` : '—'}
                </td>
                <td style={s.td}>
                  <span style={{ color: '#e2e8f0', fontSize: 12 }}>{g.user_email || '—'}</span>
                </td>
                <td style={{ ...s.td, color: 'var(--onyx-text-faint)', fontSize: 10, fontFamily: 'monospace' }} title={g.fal_request_id || g.task_id || ''}>
                  {(g.fal_request_id || g.task_id || '').slice(0, 18)}...
                </td>
                <td style={{ ...s.td, color: 'var(--onyx-text-faint)', fontSize: 12 }}>
                  {new Date(g.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 10 }}>
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page <= 1 || loading}
          style={{ ...s.grantBtn, opacity: page <= 1 ? 0.4 : 1 }}
        >
          ← Prev
        </button>
        <span style={{ color: 'var(--onyx-text-faint)', fontSize: 12 }}>Page {page} of {totalPages}</span>
        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages || loading}
          style={{ ...s.grantBtn, opacity: page >= totalPages ? 0.4 : 1 }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// Content-classification gate log (routes/characters.js POST
// /:id/reference-images, is_real_person:true characters only) -- lets
// admin/support review what the upload-time classifier rejected, mirroring
// GenerationsPanel's fetch/pagination shape against a dedicated admin route.
function FlaggedUploadsPanel() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewing, setReviewing] = useState({});
  const [confirmingReject, setConfirmingReject] = useState(null);

  // "full" maps to the server's own cap (500, see routes/admin.js) rather
  // than an unbounded query -- see LimitControl's own comment.
  const effectiveLimit = limit === 'full' ? 500 : limit;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams({ page: String(page), limit: String(effectiveLimit) });
      const res = await fetch(`/api/admin/flagged-uploads?${params}`, { headers });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to load');
      setRows(d.flagged_uploads || []); setTotal(d.total || 0);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [page, effectiveLimit]);

  const review = async (id, decision) => {
    setReviewing(r => ({ ...r, [id]: true }));
    setConfirmingReject(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/flagged-uploads/${id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to review');
      await load();
    } catch (e) {
      setError(e.message);
    }
    setReviewing(r => ({ ...r, [id]: false }));
  };

  const totalPages = Math.max(1, Math.ceil(total / effectiveLimit));

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12 }}>
        <h3 style={{ color: '#4dd0ff', fontSize: 14, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
          Flagged Uploads
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'var(--onyx-text-faint)', fontSize: 12 }}>{total} total</span>
          <LimitControl value={limit} onChange={v => { setLimit(v); setPage(1); }} />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Image</th>
              <th style={s.th}>Character</th>
              <th style={s.th}>Category</th>
              <th style={s.th}>User</th>
              <th style={s.th}>Reviewed</th>
              <th style={s.th}>Flagged</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ ...s.td, color: '#4dd0ff' }}>Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={6} style={{ ...s.td, color: '#f87171' }}>Failed to load: {error}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} style={{ ...s.td, color: 'var(--onyx-text-faint)' }}>No flagged uploads.</td></tr>
            ) : rows.map(f => (
              <tr key={f.id} style={s.row}>
                <td style={s.td}>
                  {f.image_url ? (
                    <a href={f.image_url} target="_blank" rel="noreferrer">
                      <img src={f.image_url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4, display: 'block' }} />
                    </a>
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: 4, background: '#0d1825', border: '1px solid var(--onyx-hairline-strong)' }} />
                  )}
                </td>
                <td style={s.td}>
                  <span style={{ color: '#e2e8f0', fontSize: 12 }}>{f.character_name || '—'}</span>
                </td>
                <td style={s.td}>
                  <span style={{ ...s.badge, background: '#f8717122', color: '#f87171' }}>{f.category}</span>
                </td>
                <td style={s.td}>
                  <span style={{ color: '#e2e8f0', fontSize: 12 }}>{f.user_email || '—'}</span>
                </td>
                <td style={s.td}>
                  {f.reviewed ? (
                    f.reference_image_id ? (
                      <span style={{ ...s.badge, background: '#4ade8022', color: '#4ade80' }}>Approved</span>
                    ) : (
                      <span style={{ ...s.badge, background: '#f8717122', color: '#f87171' }}>Rejected</span>
                    )
                  ) : confirmingReject === f.id ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ color: '#f87171', fontSize: 11 }}>Confirm reject?</span>
                      <button
                        onClick={() => review(f.id, 'reject')}
                        disabled={reviewing[f.id]}
                        style={{ ...s.grantBtn, background: '#f8717122', border: '1px solid #f8717144', color: '#f87171' }}
                      >
                        Yes, reject
                      </button>
                      <button onClick={() => setConfirmingReject(null)} style={s.grantBtn}>Cancel</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => review(f.id, 'approve')}
                        disabled={reviewing[f.id]}
                        style={{ ...s.grantBtn, opacity: reviewing[f.id] ? 0.5 : 1 }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setConfirmingReject(f.id)}
                        disabled={reviewing[f.id]}
                        style={{ ...s.grantBtn, background: '#f8717122', border: '1px solid #f8717144', color: '#f87171', opacity: reviewing[f.id] ? 0.5 : 1 }}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
                <td style={{ ...s.td, color: 'var(--onyx-text-faint)', fontSize: 12 }}>
                  {new Date(f.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 10 }}>
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page <= 1 || loading}
          style={{ ...s.grantBtn, opacity: page <= 1 ? 0.4 : 1 }}
        >
          ← Prev
        </button>
        <span style={{ color: 'var(--onyx-text-faint)', fontSize: 12 }}>Page {page} of {totalPages}</span>
        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages || loading}
          style={{ ...s.grantBtn, opacity: page >= totalPages ? 0.4 : 1 }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// Extracted from AdminPanel's own body (2026-08-13 tab restructure) -- was
// inline JSX + inline search/sort state there, now self-contained so it can
// be mounted/unmounted per-tab like every other panel. `users` (the full
// list, already fetched once by AdminPanel alongside the stats cards) is
// passed down rather than re-fetched here -- no reason to pay for a second
// GET /api/admin/users just because this moved into its own component.
function UsersPanel({ users, onGrant, grantingCredits }) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ key: 'joined', dir: 'desc' });
  const [limit, setLimit] = useState(10);

  const filtered = users
    .filter(u => !search ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.id?.includes(search)
    )
    .sort((a, b) => {
      const av = a[sort.key] ?? 0;
      const bv = b[sort.key] ?? 0;
      return sort.dir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

  const visible = limit === 'full' ? filtered : filtered.slice(0, limit);

  const Col = ({ k, label }) => (
    <th onClick={() => setSort(s => ({ key: k, dir: s.key === k && s.dir === 'desc' ? 'asc' : 'desc' }))}
      style={{ ...s.th, color: sort.key === k ? '#4dd0ff' : 'var(--onyx-text-faint)', cursor: 'pointer' }}>
      {label} {sort.key === k ? (sort.dir === 'desc' ? '↓' : '↑') : ''}
    </th>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by email or user ID..."
          style={{ ...s.search, marginBottom: 0, flex: 1 }}
        />
        <span style={{ color: 'var(--onyx-text-faint)', fontSize: 12, whiteSpace: 'nowrap' }}>
          {visible.length} of {filtered.length}
        </span>
        <LimitControl value={limit} onChange={setLimit} />
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={s.table}>
          <thead>
            <tr>
              <Col k="email"               label="Email" />
              <Col k="plan"                label="Plan" />
              <Col k="subscription_status" label="Sub Status" />
              <Col k="credits"             label="Credits" />
              <Col k="reels"               label="Reels" />
              <Col k="renders"             label="Exports" />
              <Col k="publishes"           label="Publishes" />
              <th style={s.th}>YouTube</th>
              <Col k="referral_signups"    label="Referrals" />
              <Col k="joined"              label="Joined" />
              <th style={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(u => (
              <UserRow key={u.id} user={u} onGrant={onGrant} granting={grantingCredits[u.id]} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserRow({ user: u, onGrant, granting }) {
  const [credAmt, setCredAmt] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [msgResult, setMsgResult] = useState(null); // { ok, error }

  const sendMessage = async () => {
    setMsgSending(true);
    setMsgResult(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/users/${u.id}/message`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: msgSubject, body: msgBody }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');
      setMsgResult({ ok: true, to: data.sent_to });
      setMsgSubject('');
      setMsgBody('');
    } catch (e) {
      setMsgResult({ error: e.message });
    }
    setMsgSending(false);
  };

  const planColor = { pro: '#4ade80', creator: '#4dd0ff', free: '#94a3b8' }[u.plan] || '#94a3b8';
  const subColor = u.subscription_status === 'active' ? '#4ade80' : '#f87171';

  const loadDetail = async () => {
    if (detail) { setExpanded(e => !e); return; }
    setLoadingDetail(true);
    setExpanded(true);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { headers: await getAuthHeaders() });
      setDetail(await res.json());
    } catch {}
    setLoadingDetail(false);
  };

  return (
    <>
      <tr onClick={loadDetail} style={{ ...s.row, cursor: 'pointer' }}>
        <td style={s.td}>
          <div style={{ color: '#e2e8f0', fontSize: 13 }}>{u.email || '—'}</div>
          <div style={{ color: 'var(--onyx-text-faint)', fontSize: 10, fontFamily: 'monospace' }}>{u.id?.slice(0,8)}...</div>
        </td>
        <td style={s.td}>
          <span style={{ ...s.badge, background: planColor + '22', color: planColor }}>
            {u.plan}
          </span>
        </td>
        <td style={s.td}>
          <span style={{ ...s.badge, background: subColor + '22', color: subColor }}>
            {u.subscription_status}
          </span>
        </td>
        <td style={{ ...s.td, color: '#fbbf24', fontWeight: 600 }}>{u.credits}</td>
        <td style={s.td}>{u.reels}</td>
        <td style={s.td}>{u.renders}</td>
        <td style={s.td}>{u.publishes}</td>
        <td style={s.td}>
          {u.youtube_token_status === 'expired' && (
            <span style={{ ...s.badge, background: '#f8717122', color: '#f87171' }}>YT Expired</span>
          )}
          {u.youtube_token_status === 'expiring_soon' && (
            <span style={{ ...s.badge, background: '#fbbf2422', color: '#fbbf24' }}>YT Expiring</span>
          )}
        </td>
        <td style={s.td}>
          {u.referral_code ? (
            <div>
              <div style={{ color: '#7de0ff', fontSize: 12 }}>{u.referral_code}</div>
              <div style={{ color: 'var(--onyx-text-faint)', fontSize: 11 }}>{u.referral_signups} signups</div>
            </div>
          ) : '—'}
        </td>
        <td style={{ ...s.td, color: 'var(--onyx-text-faint)', fontSize: 12 }}>
          {new Date(u.joined).toLocaleDateString()}
        </td>
        <td style={s.td} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              value={credAmt}
              onChange={e => setCredAmt(e.target.value)}
              placeholder="±credits"
              style={s.credInput}
              type="number"
            />
            <button
              onClick={() => { onGrant(u.id, credAmt); setCredAmt(''); }}
              disabled={!credAmt || granting}
              style={s.grantBtn}
            >
              {granting ? '...' : '+'}
            </button>
            <button
              onClick={() => { setMsgOpen(o => !o); setMsgResult(null); }}
              style={{ ...s.grantBtn, background: '#4dd0ff22', borderColor: '#4dd0ff66', color: '#7de0ff', fontSize: 14, lineHeight: 1 }}
              title="Send email to user"
            >
              @
            </button>
          </div>
        </td>
      </tr>
      {msgOpen && (
        <tr>
          <td colSpan={10} style={{ background: 'var(--onyx-bg-2)', padding: '0 12px 14px' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: 'var(--onyx-bg-2)', border: '1px solid #2d1f6e', borderRadius: 8, padding: 16, marginTop: 4, maxWidth: 560 }}>
              <div style={{ fontSize: 11, color: '#7de0ff', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Email {u.email}
              </div>
              <input
                value={msgSubject}
                onChange={e => setMsgSubject(e.target.value)}
                placeholder="Subject"
                style={{ ...s.credInput, width: '100%', marginBottom: 8, boxSizing: 'border-box', background: 'var(--onyx-bg-2)', borderColor: '#2d1f6e', color: '#e2e8f0' }}
              />
              <textarea
                value={msgBody}
                onChange={e => setMsgBody(e.target.value)}
                placeholder="Message body..."
                rows={4}
                style={{ width: '100%', padding: '8px 10px', background: 'var(--onyx-bg-2)', border: '1px solid #2d1f6e', borderRadius: 6, color: '#e2e8f0', fontSize: 12, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 8 }}
              />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={sendMessage}
                  disabled={!msgSubject.trim() || !msgBody.trim() || msgSending}
                  style={{ ...s.grantBtn, background: '#4dd0ff44', borderColor: '#4dd0ff', color: '#7de0ff', padding: '6px 14px', fontSize: 12 }}
                >
                  {msgSending ? 'Sending...' : 'Send Email'}
                </button>
                <button onClick={() => setMsgOpen(false)} style={{ ...s.grantBtn, background: 'transparent', borderColor: 'var(--onyx-text-faint)', color: 'var(--onyx-text-faint)', padding: '6px 12px', fontSize: 12 }}>
                  Cancel
                </button>
                {msgResult?.ok && <span style={{ color: '#4ade80', fontSize: 12 }}>Sent to {msgResult.to}</span>}
                {msgResult?.error && <span style={{ color: '#f87171', fontSize: 12 }}>{msgResult.error}</span>}
              </div>
            </div>
          </td>
        </tr>
      )}
      {expanded && (
        <tr>
          <td colSpan={10} style={{ background: 'var(--onyx-bg)', padding: '0 12px 16px' }}>
            {loadingDetail ? (
              <p style={{ color: '#4dd0ff', padding: 16 }}>Loading...</p>
            ) : detail ? (
              <UserDetail user={u} detail={detail} />
            ) : null}
          </td>
        </tr>
      )}
    </>
  );
}

function UserDetail({ user: u, detail: d }) {
  if (!d) return null;
  const auth = d.auth || {};
  const sub = d.subscription || {};
  const aff = d.affiliate || {};

  return (
    <div style={{ background: 'var(--onyx-bg-2)', border: '1px solid var(--onyx-hairline-strong)', borderRadius: 10, padding: 20, marginTop: 8 }}>

      {/* Row 1: Account + Auth */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>
        <Section title="Account">
          <Row label="User ID"        value={u.id} mono />
          <Row label="Email"          value={auth.email || u.email || '—'} />
          <Row label="Role"           value={u.role || 'user'} />
          <Row label="Plan"           value={u.plan || 'free'} />
          <Row label="Stripe ID"      value={d.profile?.stripe_customer_id || '—'} mono />
          <Row label="Email Verified" value={auth.email_confirmed_at ? new Date(auth.email_confirmed_at).toLocaleDateString() : 'Not verified'} />
        </Section>

        <Section title="Activity">
          <Row label="Signed Up"    value={auth.created_at ? new Date(auth.created_at).toLocaleString() : '—'} />
          <Row label="Last Sign In" value={auth.last_sign_in_at ? new Date(auth.last_sign_in_at).toLocaleString() : '—'} highlight />
          <Row label="Total Reels"  value={d.reels_count ?? 0} />
          <Row label="Exports"      value={d.render_count ?? 0} />
          <Row label="Publishes"    value={d.recent_publishes?.length || 0} />
          <Row label="YouTube"      value={
            d.youtube?.connected
              ? `${d.youtube.channel_name || 'Connected'}${d.youtube.expired ? ' (Token expired)' : ''}`
              : '— Not connected'
          } />
          <Row label="LinkedIn"     value="— Not tracked yet" />
          <Row label="Instagram"    value="— Not tracked yet" />
        </Section>

        <Section title="Subscription & Credits">
          <Row label="Credits"       value={d.credits?.balance ?? u.credits} highlight />
          <Row label="Sub Status"    value={sub.status || 'none'} />
          <Row label="Sub Plan"      value={sub.plan || '—'} />
          <Row label="Amount"        value={sub.amount ? `$${(sub.amount/100).toFixed(2)}/mo` : '—'} />
          <Row label="Renews"        value={sub.current_period_end ? new Date(sub.current_period_end * 1000).toLocaleDateString() : '—'} />
          <Row label="Trial Ends"    value={sub.trial_end ? new Date(sub.trial_end * 1000).toLocaleDateString() : '—'} />
          <Row label="Sub Since"     value={sub.created_at ? new Date(sub.created_at).toLocaleDateString() : '—'} />
        </Section>
      </div>

      {/* Row 2: Referrals + Recent Reels + Recent Publishes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 20 }}>
        <Section title="Referrals">
          <Row label="Code"    value={aff.code || '—'} mono />
          <Row label="Clicks"  value={aff.clicks || 0} />
          <Row label="Signups" value={aff.signups || 0} />
        </Section>

        <Section title="Recent Reels">
          {d.recent_reels?.slice(0, 8).map(r => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
              <span style={{ color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                {r.title || 'Untitled'}
              </span>
              <span style={{ color: 'var(--onyx-text-faint)', fontSize: 11, flexShrink: 0, marginLeft: 8 }}>
                {r.ratio || '16:9'} · {new Date(r.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
          {!d.recent_reels?.length && <span style={{ color: 'var(--onyx-text-faint)', fontSize: 12 }}>No reels yet</span>}
        </Section>

        <Section title="Recent Publishes">
          {d.recent_publishes?.slice(0, 6).map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
              <span style={{ color: '#e2e8f0' }}>{p.platform || 'Unknown'}</span>
              <span style={{ color: 'var(--onyx-text-faint)', fontSize: 11 }}>{new Date(p.created_at).toLocaleDateString()}</span>
            </div>
          ))}
          {!d.recent_publishes?.length && <span style={{ color: 'var(--onyx-text-faint)', fontSize: 12 }}>No publishes yet</span>}
        </Section>
      </div>

      {/* Row 3: Credit History */}
      <div style={{ marginTop: 20 }}>
        <Section title="Credit History">
          {d.credit_transactions?.map((t, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
              <span style={{ color: t.amount > 0 ? '#4ade80' : '#f87171' }}>
                {t.amount > 0 ? '+' : ''}{t.amount} — {t.reason}
              </span>
              <span style={{ color: 'var(--onyx-text-faint)', fontSize: 11 }}>
                {t.balance_after != null ? `bal: ${t.balance_after} · ` : ''}{new Date(t.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
          {!d.credit_transactions?.length && <span style={{ color: 'var(--onyx-text-faint)', fontSize: 12 }}>No transactions yet</span>}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h4 style={{ color: '#4dd0ff', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12, margin: '0 0 12px 0' }}>
        {title}
      </h4>
      {children}
    </div>
  );
}

function Row({ label, value, mono, highlight }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
      <span style={{ color: 'var(--onyx-text-faint)', flexShrink: 0 }}>{label}</span>
      <span style={{
        color: highlight ? '#fbbf24' : '#e2e8f0',
        fontFamily: mono ? 'monospace' : 'inherit',
        fontSize: mono ? 10 : 12,
        maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis',
        whiteSpace: 'nowrap', textAlign: 'right', marginLeft: 8
      }}>{String(value ?? '—')}</span>
    </div>
  );
}

const s = {
  page: { background: 'var(--onyx-bg)', minHeight: '100vh', padding: '32px 24px', fontFamily: 'Inter, sans-serif', color: '#e2e8f0' },
  header: { marginBottom: 28 },
  title: { fontSize: 24, fontWeight: 800, color: '#4dd0ff', margin: 0 },
  sub: { color: 'var(--onyx-text-faint)', fontSize: 13, marginTop: 4 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 },
  statCard: { background: 'var(--onyx-bg-2)', border: '1px solid var(--onyx-hairline-strong)', borderRadius: 10, padding: '16px 20px' },
  statVal: { fontSize: 28, fontWeight: 800, color: '#4dd0ff' },
  statLabel: { fontSize: 12, color: 'var(--onyx-text-faint)', marginTop: 4 },
  search: { width: '100%', padding: '10px 14px', background: 'var(--onyx-bg-2)', border: '1px solid var(--onyx-hairline-strong)', borderRadius: 8, color: '#e2e8f0', fontSize: 13, marginBottom: 16, boxSizing: 'border-box' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--onyx-hairline-strong)', whiteSpace: 'nowrap' },
  row: { borderBottom: '1px solid #0d1825' },
  td: { padding: '10px 12px', verticalAlign: 'middle' },
  badge: { padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 },
  credInput: { width: 70, padding: '5px 8px', background: 'var(--onyx-bg-2)', border: '1px solid var(--onyx-hairline-strong)', borderRadius: 6, color: '#e2e8f0', fontSize: 12 },
  grantBtn: { padding: '5px 10px', background: '#4dd0ff22', border: '1px solid #4dd0ff44', borderRadius: 6, color: '#4dd0ff', cursor: 'pointer', fontWeight: 700 },
};
