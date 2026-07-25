import { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient.js";
import SEO from "../components/SEO";

const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: "IG", color: "#E1306C" },
  { id: "tiktok",   label: "TikTok",    icon: "TT", color: "#69C9D0" },
  { id: "linkedin", label: "LinkedIn",  icon: "LI", color: "#0077b5" },
  { id: "youtube",  label: "YouTube",   icon: "▶️",  color: "#FF0000" },
];

const STATUS_STYLES = {
  published:  { bg: "rgba(34,197,94,0.15)",  color: "#4ade80" },
  failed:     { bg: "rgba(239,68,68,0.15)",  color: "#f87171" },
  scheduled:  { bg: "rgba(250,204,21,0.15)", color: "#fbbf24" },
  processing: { bg: "rgba(77,208,255,0.15)", color: "#4dd0ff" },
};

function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function dateKey(d) {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Local-time value usable directly in an <input type="datetime-local">.
function toDatetimeLocalValue(isoString) {
  const d = new Date(isoString);
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Planner() {
  const [session, setSession]   = useState(null);
  const [posts, setPosts]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [reschedulingId, setReschedulingId] = useState(null);
  const [err, setErr]           = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadPosts(session);
    });
  }, []);

  async function loadPosts(sess) {
    const s = sess || session;
    if (!s) return;
    setLoading(true);
    try {
      const res = await fetch("/api/publish/posts", { headers: { Authorization: `Bearer ${s.access_token}` } });
      const data = await res.json();
      setPosts(data.posts || []);
    } catch {
      setErr("Failed to load scheduled posts.");
    }
    setLoading(false);
  }

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  // Only scheduled/processing/published/failed posts with a real post_at
  // land on the grid — matches the real status vocabulary the backend
  // actually uses (see routes/publish.js + cron/publishScheduled.js).
  const postsByDay = useMemo(() => {
    const map = {};
    for (const day of days) map[dateKey(day)] = [];
    for (const post of posts) {
      if (!post.post_at) continue;
      const key = dateKey(post.post_at);
      if (map[key]) map[key].push(post);
    }
    // Group each day's posts by platform for display.
    const grouped = {};
    for (const key of Object.keys(map)) {
      const byPlatform = {};
      for (const post of map[key]) {
        const p = post.platform || "other";
        if (!byPlatform[p]) byPlatform[p] = [];
        byPlatform[p].push(post);
      }
      grouped[key] = byPlatform;
    }
    return grouped;
  }, [posts, days]);

  async function handleReschedule(post, newLocalValue) {
    if (!newLocalValue) return;
    const newIso = new Date(newLocalValue).toISOString();
    setReschedulingId(post.id);
    try {
      const res = await fetch(`/api/publish/schedule/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ post_at: newIso }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reschedule");
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, post_at: newIso } : p));
    } catch (e) {
      alert(e.message || "Failed to reschedule post");
    }
    setReschedulingId(null);
  }

  // Reused verbatim from Publish.jsx's "Recent Posts" Cancel button — same
  // confirm() gate, same DELETE call, same optimistic local removal.
  async function handleCancel(post) {
    if (!confirm("Cancel this scheduled post?")) return;
    const res = await fetch(`/api/publish/cancel/${post.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session?.access_token}` }
    });
    if (res.ok) setPosts(prev => prev.filter(p => p.id !== post.id));
    else alert("Failed to cancel post");
  }

  const card = { background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", borderRadius: 12, padding: 14 };
  const weekEnd = days[6];
  const monthFmt = d => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const isToday = d => dateKey(d) === dateKey(new Date());

  if (loading) return <div style={{ minHeight: "100vh", background: "var(--onyx-bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--onyx-text-faint)" }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "var(--onyx-bg)", color: "var(--onyx-text)", fontFamily: "sans-serif" }}>
      <SEO
        title="Weekly Publishing Planner"
        description="A weekly calendar view of your scheduled Onyx Reelz posts across every connected platform."
        path="/planner"
      />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Weekly Publishing Planner</h1>
        <p style={{ color: "var(--onyx-text-faint)", fontSize: 14, marginBottom: 24 }}>
          A calendar view of everything already scheduled through{" "}
          <a href="/publish" style={{ color: "var(--onyx-cyan)" }}>Publish &amp; Schedule</a>. Reschedule or cancel — new posts are created there.
        </p>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })}
              style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--onyx-hairline-strong)", background: "var(--onyx-surface)", color: "var(--onyx-text-dim)", cursor: "pointer", fontSize: 13 }}>
              ← Prev week
            </button>
            <button onClick={() => setWeekStart(startOfWeek(new Date()))}
              style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--onyx-hairline-strong)", background: "var(--onyx-surface)", color: "var(--onyx-text-dim)", cursor: "pointer", fontSize: 13 }}>
              This week
            </button>
            <button onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; })}
              style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--onyx-hairline-strong)", background: "var(--onyx-surface)", color: "var(--onyx-text-dim)", cursor: "pointer", fontSize: 13 }}>
              Next week →
            </button>
          </div>
          <div style={{ fontSize: 13, color: "var(--onyx-text-faint)" }}>{monthFmt(weekStart)} – {monthFmt(weekEnd)}</div>
        </div>

        {err && <div style={{ ...card, marginBottom: 16, color: "#f87171" }}>{err}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 10 }}>
          {days.map(day => {
            const key = dateKey(day);
            const byPlatform = postsByDay[key] || {};
            const totalCount = Object.values(byPlatform).reduce((sum, arr) => sum + arr.length, 0);
            return (
              <div key={key} style={{ ...card, padding: 10, background: isToday(day) ? "rgba(77,208,255,0.06)" : "var(--onyx-bg-2)", border: isToday(day) ? "1px solid rgba(77,208,255,0.35)" : "1px solid var(--onyx-hairline-strong)", minHeight: 220 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: isToday(day) ? "var(--onyx-cyan)" : "var(--onyx-text-faint)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>
                  {day.toLocaleDateString(undefined, { weekday: "short" })}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>{day.getDate()}</div>

                {totalCount === 0 && <div style={{ fontSize: 11, color: "var(--onyx-text-faint)" }}>Nothing scheduled</div>}

                {Object.entries(byPlatform).map(([platformId, platformPosts]) => {
                  const plat = PLATFORMS.find(p => p.id === platformId);
                  return (
                    <div key={platformId} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: plat?.color || "var(--onyx-text-faint)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                        {plat?.icon || ""} {plat?.label || platformId}
                      </div>
                      {platformPosts.map(post => {
                        const st = STATUS_STYLES[post.status] || STATUS_STYLES.scheduled;
                        return (
                          <div key={post.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px", borderRadius: 8, background: "var(--onyx-surface)", border: "1px solid var(--onyx-hairline-strong)", marginBottom: 6 }}>
                            {post.thumbnail_url
                              ? <img src={post.thumbnail_url} alt="" style={{ width: 32, height: 32, borderRadius: 5, objectFit: "cover", flexShrink: 0 }} onError={e => { e.target.style.display = "none"; }} />
                              : <div style={{ width: 32, height: 32, borderRadius: 5, background: "var(--onyx-surface-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>▶</div>
                            }
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--onyx-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={post.title || post.caption || ""}>
                                {post.title || post.caption?.slice(0, 40) || "Untitled"}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                                <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: st.bg, color: st.color }}>{post.status}</span>
                                <span style={{ fontSize: 10, color: "var(--onyx-text-faint)" }}>
                                  {new Date(post.post_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                                </span>
                              </div>
                              {post.status === "scheduled" && (
                                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
                                  <input
                                    type="datetime-local"
                                    defaultValue={toDatetimeLocalValue(post.post_at)}
                                    disabled={reschedulingId === post.id}
                                    onChange={e => handleReschedule(post, e.target.value)}
                                    style={{ fontSize: 10, padding: "3px 5px", borderRadius: 5, border: "1px solid var(--onyx-hairline-strong)", background: "var(--onyx-bg-2)", color: "var(--onyx-text-dim)", width: "100%", boxSizing: "border-box" }}
                                  />
                                  <button onClick={() => handleCancel(post)} style={{ padding: "3px 8px", borderRadius: 5, border: "1px solid var(--onyx-hairline-strong)", background: "transparent", color: "#ef4444", fontSize: 10, fontWeight: 600, cursor: "pointer", alignSelf: "flex-start" }}>
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
