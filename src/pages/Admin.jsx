import { useState, useEffect } from 'react';
import { getAuthHeaders } from '../utils/auth';

export default function AdminPanel() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ key: 'joined', dir: 'desc' });
  const [loading, setLoading] = useState(true);
  const [grantingCredits, setGrantingCredits] = useState({});

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

  const Col = ({ k, label }) => (
    <th onClick={() => setSort(s => ({ key: k, dir: s.key === k && s.dir === 'desc' ? 'asc' : 'desc' }))}
      style={{ ...s.th, color: sort.key === k ? '#4dd0ff' : '#64748b', cursor: 'pointer' }}>
      {label} {sort.key === k ? (sort.dir === 'desc' ? '↓' : '↑') : ''}
    </th>
  );

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

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by email or user ID..."
        style={s.search}
      />

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
              <Col k="referral_signups"    label="Referrals" />
              <Col k="joined"              label="Joined" />
              <th style={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <UserRow key={u.id} user={u} onGrant={grantCredits} granting={grantingCredits[u.id]} />
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

  const planColor = { pro: '#4ade80', creator: '#4dd0ff', free: '#64748b' }[u.plan] || '#64748b';
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
          <div style={{ color: '#334155', fontSize: 10, fontFamily: 'monospace' }}>{u.id?.slice(0,8)}...</div>
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
          {u.referral_code ? (
            <div>
              <div style={{ color: '#a78bfa', fontSize: 12 }}>{u.referral_code}</div>
              <div style={{ color: '#64748b', fontSize: 11 }}>{u.referral_signups} signups</div>
            </div>
          ) : '—'}
        </td>
        <td style={{ ...s.td, color: '#64748b', fontSize: 12 }}>
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
              style={{ ...s.grantBtn, background: '#7c3aed22', borderColor: '#7c3aed66', color: '#a78bfa', fontSize: 14, lineHeight: 1 }}
              title="Send email to user"
            >
              ✉
            </button>
          </div>
        </td>
      </tr>
      {msgOpen && (
        <tr>
          <td colSpan={10} style={{ background: '#0a0818', padding: '0 12px 14px' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: '#0d0e1f', border: '1px solid #2d1f6e', borderRadius: 8, padding: 16, marginTop: 4, maxWidth: 560 }}>
              <div style={{ fontSize: 11, color: '#a78bfa', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Email {u.email}
              </div>
              <input
                value={msgSubject}
                onChange={e => setMsgSubject(e.target.value)}
                placeholder="Subject"
                style={{ ...s.credInput, width: '100%', marginBottom: 8, boxSizing: 'border-box', background: '#0a0818', borderColor: '#2d1f6e', color: '#e2e8f0' }}
              />
              <textarea
                value={msgBody}
                onChange={e => setMsgBody(e.target.value)}
                placeholder="Message body..."
                rows={4}
                style={{ width: '100%', padding: '8px 10px', background: '#0a0818', border: '1px solid #2d1f6e', borderRadius: 6, color: '#e2e8f0', fontSize: 12, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 8 }}
              />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={sendMessage}
                  disabled={!msgSubject.trim() || !msgBody.trim() || msgSending}
                  style={{ ...s.grantBtn, background: '#7c3aed44', borderColor: '#7c3aed', color: '#a78bfa', padding: '6px 14px', fontSize: 12 }}
                >
                  {msgSending ? 'Sending...' : 'Send Email'}
                </button>
                <button onClick={() => setMsgOpen(false)} style={{ ...s.grantBtn, background: 'transparent', borderColor: '#334155', color: '#64748b', padding: '6px 12px', fontSize: 12 }}>
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
          <td colSpan={10} style={{ background: '#060d16', padding: '0 12px 16px' }}>
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
    <div style={{ background: '#0a131e', border: '1px solid #1e2a38', borderRadius: 10, padding: 20, marginTop: 8 }}>

      {/* Row 1: Account + Auth */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>
        <Section title="Account">
          <Row label="User ID"        value={u.id} mono />
          <Row label="Email"          value={auth.email || u.email || '—'} />
          <Row label="Role"           value={u.role || 'user'} />
          <Row label="Plan"           value={u.plan || 'free'} />
          <Row label="Stripe ID"      value={d.profile?.stripe_customer_id || '—'} mono />
          <Row label="Email Verified" value={auth.email_confirmed_at ? '✅ ' + new Date(auth.email_confirmed_at).toLocaleDateString() : '❌ Not verified'} />
        </Section>

        <Section title="Activity">
          <Row label="Signed Up"    value={auth.created_at ? new Date(auth.created_at).toLocaleString() : '—'} />
          <Row label="Last Sign In" value={auth.last_sign_in_at ? new Date(auth.last_sign_in_at).toLocaleString() : '—'} highlight />
          <Row label="Total Reels"  value={d.reels_count ?? 0} />
          <Row label="Exports"      value={d.render_count ?? 0} />
          <Row label="Publishes"    value={d.recent_publishes?.length || 0} />
          <Row label="YouTube"      value={
            d.youtube?.connected
              ? `✅ ${d.youtube.channel_name || 'Connected'}${d.youtube.expired ? ' ⚠️ Token expired' : ''}`
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
                📹 {r.title || 'Untitled'}
              </span>
              <span style={{ color: '#334155', fontSize: 11, flexShrink: 0, marginLeft: 8 }}>
                {r.ratio || '16:9'} · {new Date(r.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
          {!d.recent_reels?.length && <span style={{ color: '#334155', fontSize: 12 }}>No reels yet</span>}
        </Section>

        <Section title="Recent Publishes">
          {d.recent_publishes?.slice(0, 6).map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
              <span style={{ color: '#e2e8f0' }}>📤 {p.platform || 'Unknown'}</span>
              <span style={{ color: '#334155', fontSize: 11 }}>{new Date(p.created_at).toLocaleDateString()}</span>
            </div>
          ))}
          {!d.recent_publishes?.length && <span style={{ color: '#334155', fontSize: 12 }}>No publishes yet</span>}
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
              <span style={{ color: '#334155', fontSize: 11 }}>
                {t.balance_after != null ? `bal: ${t.balance_after} · ` : ''}{new Date(t.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
          {!d.credit_transactions?.length && <span style={{ color: '#334155', fontSize: 12 }}>No transactions yet</span>}
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
      <span style={{ color: '#64748b', flexShrink: 0 }}>{label}</span>
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
  page: { background: '#060d16', minHeight: '100vh', padding: '32px 24px', fontFamily: 'Inter, sans-serif', color: '#e2e8f0' },
  header: { marginBottom: 28 },
  title: { fontSize: 24, fontWeight: 800, color: '#4dd0ff', margin: 0 },
  sub: { color: '#334155', fontSize: 13, marginTop: 4 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 },
  statCard: { background: '#0a131e', border: '1px solid #1e2a38', borderRadius: 10, padding: '16px 20px' },
  statVal: { fontSize: 28, fontWeight: 800, color: '#4dd0ff' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  search: { width: '100%', padding: '10px 14px', background: '#0a131e', border: '1px solid #1e2a38', borderRadius: 8, color: '#e2e8f0', fontSize: 13, marginBottom: 16, boxSizing: 'border-box' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid #1e2a38', whiteSpace: 'nowrap' },
  row: { borderBottom: '1px solid #0d1825' },
  td: { padding: '10px 12px', verticalAlign: 'middle' },
  badge: { padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 },
  credInput: { width: 70, padding: '5px 8px', background: '#0d1825', border: '1px solid #1e2a38', borderRadius: 6, color: '#e2e8f0', fontSize: 12 },
  grantBtn: { padding: '5px 10px', background: '#4dd0ff22', border: '1px solid #4dd0ff44', borderRadius: 6, color: '#4dd0ff', cursor: 'pointer', fontWeight: 700 },
};
