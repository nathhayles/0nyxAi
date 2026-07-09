import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";

const PLATFORM_META = {
  youtube:   { label: "YT", bg: "#FF0000", color: "#fff" },
  tiktok:    { label: "TK", bg: "#010101", color: "#fff" },
  linkedin:  { label: "LI", bg: "#0A66C2", color: "#fff" },
  instagram: { label: "IG", bg: "#C13584", color: "#fff" },
  facebook:  { label: "FB", bg: "#1877F2", color: "#fff" },
  twitter:   { label: "X",  bg: "#000",    color: "#fff" },
};

function PlatformBadge({ platform, post_at }) {
  const meta = PLATFORM_META[platform] || { label: platform?.slice(0, 2).toUpperCase(), bg: "#333", color: "#fff" };
  const date = post_at ? new Date(post_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{
        background: meta.bg, color: meta.color,
        borderRadius: 4, padding: "2px 5px",
        fontSize: 10, fontWeight: 700, letterSpacing: "0.03em",
      }}>
        {meta.label}
      </span>
      {date && <span style={{ fontSize: 10, opacity: 0.5 }}>{date}</span>}
    </div>
  );
}

export default function ProjectsPage() {
  const [reels, setReels] = useState([]);
  const [publishHistory, setPublishHistory] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = "/"; return; }
      const headers = { Authorization: `Bearer ${session.access_token}` };

      const [reelsRes, historyRes] = await Promise.all([
        fetch("/api/reels", { headers }),
        fetch("/api/reels/publish-history", { headers }),
      ]);

      const reelsData = await reelsRes.json();
      const historyData = historyRes.ok ? await historyRes.json() : {};

      setReels(reelsData || []);
      setPublishHistory(historyData || {});
      setLoading(false);
    }
    load();
  }, []);

  const openReel = (id) => { window.location.href = `/editor?reelId=${id}`; };
  const newReel = () => { window.location.href = "/studio"; };

  if (loading) return <div style={{color:"#fff",padding:40}}>Loading projects...</div>;

  return (
    <div style={{minHeight:"100vh",background:"var(--onyx-bg-2)",color:"var(--onyx-text)",padding:"40px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:32}}>
        <h1 style={{margin:0,fontSize:28}}>My Projects</h1>
        <button onClick={newReel} style={{background:"#2b3442",color:"#fff",border:"none",borderRadius:8,padding:"10px 20px",cursor:"pointer",fontSize:14}}>+ New Reel</button>
      </div>
      {reels.length === 0 ? (
        <div style={{textAlign:"center",opacity:0.5,marginTop:80}}>
          <p style={{fontSize:18}}>No projects yet.</p>
          <button onClick={newReel} style={{background:"var(--onyx-surface-2)",color:"#fff",border:"1px solid var(--onyx-hairline-strong)",borderRadius:8,padding:"12px 24px",cursor:"pointer",marginTop:16}}>Create your first reel</button>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:20}}>
          {reels.map(r => {
            const platforms = publishHistory[r.id] || [];
            return (
              <div key={r.id} onClick={() => openReel(r.id)} style={{background:"var(--onyx-surface)",borderRadius:12,overflow:"hidden",cursor:"pointer",border:"1px solid var(--onyx-hairline-strong)"}}>
                <div style={{height:120,background:"#111",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",position:"relative"}}>
                  {r.thumbnail_url
                    ? <img src={r.thumbnail_url} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e => { e.target.style.display="none"; e.target.nextSibling && (e.target.nextSibling.style.display="flex"); }} />
                    : null}
                  <div style={{width:"100%",height:"100%",background:"var(--onyx-surface-2)",display:r.thumbnail_url ? "none" : "flex",alignItems:"center",justifyContent:"center"}}>
                    <img src="/onyx-reelz-icon-1024.png" style={{width:40,height:40,opacity:0.25,objectFit:"contain"}} />
                  </div>
                </div>
                <div style={{padding:"12px 14px"}}>
                  <div style={{fontWeight:600,fontSize:14,marginBottom:4,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.title || "Untitled Reel"}</div>
                  <div style={{fontSize:11,opacity:0.4}}>{new Date(r.updated_at).toLocaleDateString()}</div>
                  {platforms.length > 0 && (
                    <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:8}}>
                      {platforms.map((p, i) => (
                        <PlatformBadge key={i} platform={p.platform} post_at={p.post_at} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
