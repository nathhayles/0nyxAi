import { useState, useEffect } from 'react';
import { getAuthHeaders } from '../utils/auth';

export default function AdminPanel() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ key: 'joined', dir: 'desc' });
  const [loading, setLoading] = useState(true);
  const [grantingCredits, setGrantingCredits] = useState({});

  useEffect(() => {
    fetch('/api/admin/users', { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const grantCredits = async (userId, amount) => {
    setGrantingCredits(g => ({ ...g, [userId]: true }));
    await fetch(`/api/admin/users/${userId}/credits`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(amount) }),
    });
    const fresh = await fetch('/api/admin/users', { headers: getAuthHeaders() }).then(r => r.json());
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

  const planColor = { pro: '#4ade80', creator: '#4dd0ff', free: '#64748b' }[u.plan] || '#64748b';
  const subColor = u.subscription_status === 'active' ? '#4ade80' : '#f87171';

  return (
    <tr style={s.row}>
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
      <td style={s.td}>
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
        </div>
      </td>
    </tr>
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
