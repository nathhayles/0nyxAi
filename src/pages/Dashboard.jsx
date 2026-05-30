import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient.js";
import PaywallModal from "../components/PaywallModal.jsx";
import HelpTooltip from "../components/HelpTooltip.jsx";

const isMobileDevice = () =>
  window.innerWidth < 1024 ||
  /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent);

const ADMIN_UUIDS = ["d7c733c8-31dd-49b2-bffa-655b7d13ce11"];

export default function Dashboard() {
  const navigate = useNavigate();
  const [reels, setReels] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [renameVal, setRenameVal] = useState("");
  const [movingReel, setMovingReel] = useState(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [activeFolder, setActiveFolder] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [publishHistory, setPublishHistory] = useState({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data?.user ?? null;
      setCurrentUser(user);
      if (!user || ADMIN_UUIDS.includes(user.id)) return;
      getHeaders().then(headers => {
        fetch("/api/user/me", { headers })
          .then(r => r.json())
          .then(data => {
            if (!data.has_paid_plan && !data.is_trial) setShowPaywall(true);
          })
          .catch(() => {});
      });
    });
  }, []);

  async function getHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { window.location.href = "/"; return {}; }
    return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" };
  }

  async function load() {
    const headers = await getHeaders();
    const [reelsRes, foldersRes, historyRes] = await Promise.all([
      fetch("/api/reels", { headers }),
      fetch("/api/folders", { headers }),
      fetch("/api/reels/publish-history", { headers }),
    ]);
    const reelsData = await reelsRes.json().catch(() => []);
    setReels(Array.isArray(reelsData) ? reelsData : []);
    const foldersData = await foldersRes.json().catch(() => []);
    setFolders(Array.isArray(foldersData) ? foldersData : []);
    setPublishHistory(await historyRes.json().catch(() => ({})) || {});
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // On mobile, redirect to brand setup if no default brand exists yet
  useEffect(() => {
    if (!isMobileDevice()) return;
    getHeaders().then(headers => {
      fetch('/api/brands', { headers })
        .then(r => r.json())
        .then(data => {
          const brands = Array.isArray(data) ? data : (data.brands || []);
          if (!brands.some(b => b.is_default)) navigate('/brand-setup?next=/dashboard');
        })
        .catch(() => {});
    });
  }, []);

  async function deleteReel(id) {
    if (!confirm("Delete this reel?")) return;
    const headers = await getHeaders();
    await fetch(`/api/reels/${id}`, { method: "DELETE", headers });
    setReels(r => r.filter(x => x.id !== id));
    setMenuOpen(null);
  }

  async function renameReel(id) {
    const headers = await getHeaders();
    await fetch(`/api/reels/${id}`, { method: "PUT", headers, body: JSON.stringify({ title: renameVal }) });
    setReels(r => r.map(x => x.id === id ? { ...x, title: renameVal } : x));
    setRenaming(null);
  }

  async function moveToFolder(reelId, folderId) {
    const headers = await getHeaders();
    await fetch(`/api/reels/${reelId}`, { method: "PUT", headers, body: JSON.stringify({ folder_id: folderId }) });
    setReels(r => r.map(x => x.id === reelId ? { ...x, folder_id: folderId } : x));
    setMovingReel(null);
    setMenuOpen(null);
  }

  async function createFolder() {
    if (!newFolderName.trim()) return;
    const headers = await getHeaders();
    const res = await fetch("/api/folders", { method: "POST", headers, body: JSON.stringify({ name: newFolderName }) });
    const f = await res.json();
    setFolders(prev => [...prev, f]);
    setNewFolderName("");
    setShowNewFolder(false);
  }

  function copyShareLink(id) {
    navigator.clipboard.writeText(`${window.location.origin}/editor?reelId=${id}`);
    alert("Share link copied!");
    setMenuOpen(null);
  }

  const visibleReels = reels.filter(r => activeFolder ? r.folder_id === activeFolder : !r.folder_id);

  if (loading) return <div style={{color:"#fff",padding:40}}>Loading...</div>;

  return (
    <div style={{minHeight:"100vh",color:"#fff",padding:"40px"}} onClick={() => setMenuOpen(null)}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={{margin:0,fontSize:28}}>Your Projects</h1>
            <HelpTooltip topic="dashboard" />
          </div>
          <p style={{margin:"6px 0 0",opacity:0.4,fontSize:13}}>Drafts, scheduled videos, and published reels.</p>
        </div>
        <button onClick={() => window.location.href="/studio"} style={{background:"#2563eb",color:"#fff",border:"none",borderRadius:8,padding:"10px 20px",cursor:"pointer",fontSize:14}}>+ New Reel</button>
      </div>

      {/* Folder tabs */}
      <div style={{display:"flex",gap:8,marginBottom:24,flexWrap:"wrap",alignItems:"center"}}>
        <button onClick={() => setActiveFolder(null)} style={{padding:"6px 14px",borderRadius:20,border:"1px solid #2b3442",background:!activeFolder?"#2563eb":"transparent",color:"#fff",cursor:"pointer",fontSize:13}}>All Reels</button>
        {folders.map(f => (
          <button key={f.id} onClick={() => setActiveFolder(f.id)} style={{padding:"6px 14px",borderRadius:20,border:"1px solid #2b3442",background:activeFolder===f.id?"#2563eb":"transparent",color:"#fff",cursor:"pointer",fontSize:13}}>📁 {f.name}</button>
        ))}
        {showNewFolder
          ? <span style={{display:"flex",gap:6}}><input autoFocus value={newFolderName} onChange={e=>setNewFolderName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&createFolder()} placeholder="Folder name" style={{background:"#1a2030",color:"#fff",border:"1px solid #444",borderRadius:6,padding:"4px 10px",fontSize:13}} /><button onClick={createFolder} style={{background:"#2563eb",color:"#fff",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:13}}>Add</button></span>
          : <button onClick={() => setShowNewFolder(true)} style={{padding:"6px 14px",borderRadius:20,border:"1px dashed #444",background:"transparent",color:"#888",cursor:"pointer",fontSize:13}}>+ New Folder</button>}
      </div>

      {/* Reels grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:20}}>
        {visibleReels.map(r => (
          <div key={r.id} style={{background:"#1a2030",borderRadius:12,border:"1px solid #2b3442",position:"relative"}} onClick={e=>e.stopPropagation()}>
            <div onClick={() => window.location.href=`/editor?reelId=${r.id}`} style={{cursor:"pointer"}}>
              <div style={{height:120,background:"#111",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"12px 12px 0 0",overflow:"hidden"}}>
                {r.thumbnail_url ? <img src={r.thumbnail_url} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e => { e.target.style.display="none"; }} /> : null}
                {(!r.thumbnail_url) && <span style={{opacity:0.3,fontSize:12}}>No preview</span>}
              </div>
              <div style={{padding:"12px 14px 4px"}}>
                {renaming===r.id
                  ? <input autoFocus value={renameVal} onChange={e=>setRenameVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&renameReel(r.id)} onClick={e=>e.stopPropagation()} style={{background:"#0f141b",color:"#fff",border:"1px solid #444",borderRadius:4,padding:"4px 8px",width:"100%",fontSize:14}} />
                  : <div style={{fontWeight:600,fontSize:14,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.title||"Untitled Reel"}</div>}
                <div style={{fontSize:11,opacity:0.4,marginTop:4}}>{new Date(r.updated_at).toLocaleDateString()}</div>
                {(() => {
                  const total = (r.scenes || []).reduce((sum, s) => sum + (s.duration || s.clip_duration || 3), 0);
                  if (!total) return null;
                  const mins = Math.floor(total / 60);
                  const secs = Math.round(total % 60);
                  return <div style={{fontSize:14,opacity:0.9,marginTop:4,color:'#cbd5e1',fontWeight:600}}>⏱ {mins > 0 ? `${mins}m ` : ""}{secs}s</div>;
                })()}
                {(() => {
                  const history = publishHistory[r.id];
                  if (!history || !history.length) return null;
                  const icons = { youtube: "▶", instagram: "📸", tiktok: "♪", facebook: "f" };
                  return (
                    <div style={{display:"flex",gap:4,marginTop:6,flexWrap:"wrap"}}>
                      {history.map(h => (
                        <span key={h.platform} title={`${h.platform}: ${h.status}`} style={{fontSize:10,fontWeight:700,padding:"2px 6px",borderRadius:4,background: h.status==="published" ? "rgba(34,197,94,0.15)" : "rgba(99,102,241,0.15)",color: h.status==="published" ? "#4ade80" : "#818cf8",border:`1px solid ${h.status==="published" ? "rgba(34,197,94,0.3)" : "rgba(99,102,241,0.3)"}`,textTransform:"uppercase",letterSpacing:"0.5px"}}>
                          {icons[h.platform] || "📤"} {h.platform}
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
            <div style={{padding:"4px 14px 12px",display:"flex",justifyContent:"flex-end"}}>
              <button onClick={e=>{e.stopPropagation();setMenuOpen(menuOpen===r.id?null:r.id);}} style={{background:"none",border:"none",color:"#fff",cursor:"pointer",fontSize:18,opacity:0.5,padding:"2px 6px"}}>⋯</button>
            </div>
            {menuOpen===r.id && (
              <div style={{position:"absolute",bottom:"44px",right:"10px",background:"#1e2736",border:"1px solid #2b3442",borderRadius:8,zIndex:999,minWidth:170,boxShadow:"0 4px 20px rgba(0,0,0,0.5)"}}>
                <div onClick={()=>window.location.href=`/editor?reelId=${r.id}`} style={{padding:"10px 16px",cursor:"pointer",fontSize:13}}>✏️ Edit</div>
                <div onClick={()=>{setRenaming(r.id);setRenameVal(r.title||"");setMenuOpen(null);}} style={{padding:"10px 16px",cursor:"pointer",fontSize:13}}>🔤 Rename</div>
                <div onClick={()=>setMovingReel(r.id)} style={{padding:"10px 16px",cursor:"pointer",fontSize:13}}>📁 Move to Folder</div>
                <div onClick={async ()=>{ setMenuOpen(null); const headers = await getHeaders(); const reelRes = await fetch(`/api/reels/${r.id}`, { headers }); const reel = await reelRes.json(); if (!reel.scenes || !reel.scenes.length) { alert("No scenes in this reel yet."); return; } const renderRes = await fetch("/api/render", { method: "POST", headers: { ...(await getHeaders()), "Content-Type": "application/json" }, body: JSON.stringify({ scenes: reel.scenes.filter(s=>s.url||s.mediaUrl).map(s=>({ type: s.mediaType||"video", url: s.url||s.mediaUrl, duration: s.duration||3, voiceoverUrl: s.voiceoverUrl||null })), renderMode: "share" }) }); const data = await renderRes.json(); if (data.url) { const shareUrl = data.projectId
        ? `${window.location.origin}/preview/${data.projectId}?ref=nathhayles`
        : `${window.location.origin}${data.url}?ref=nathhayles`; await navigator.clipboard.writeText(shareUrl); alert("Share link copied to clipboard"); window.open(shareUrl, "_blank"); } else { alert("Share failed: " + (data.error||"unknown")); }}} style={{padding:"10px 16px",cursor:"pointer",fontSize:13}}>🔗 Copy Share Link</div>
                <div onClick={async ()=>{ setMenuOpen(null); const headers = await getHeaders(); const reelRes = await fetch(`/api/reels/${r.id}`, { headers }); const reel = await reelRes.json(); if (!reel.scenes || !reel.scenes.length) { alert("No scenes in this reel yet."); return; } const renderRes = await fetch("/api/render", { method: "POST", headers: {...headers, "Content-Type": "application/json"}, body: JSON.stringify({ scenes: reel.scenes.filter(s=>s.url||s.mediaUrl).map(s=>({ type: s.mediaType||"video", url: s.url||s.mediaUrl, duration: s.duration||3, voiceoverUrl: s.voiceoverUrl||null })), renderMode: "download" }) }); const data = await renderRes.json(); if (data.url) { const a=document.createElement("a"); a.href=data.url; a.download=(r.title||"reel")+".mp4"; document.body.appendChild(a); a.click(); document.body.removeChild(a); } else { alert("Download failed: " + (data.error||"unknown error")); }}} style={{padding:"10px 16px",cursor:"pointer",fontSize:13}}>⬇️ Download</div>
                <div onClick={()=>{ setMenuOpen(null); window.location.href=`/publish?reelId=${r.id}`; }} style={{padding:"10px 16px",cursor:"pointer",fontSize:13}}>📤 Publish</div>
                <div onClick={()=>deleteReel(r.id)} style={{padding:"10px 16px",cursor:"pointer",fontSize:13,color:"#ef4444"}}>🗑️ Delete</div>
              </div>
            )}
            {movingReel===r.id && (
              <div style={{position:"absolute",bottom:"44px",right:"10px",background:"#1e2736",border:"1px solid #2b3442",borderRadius:8,zIndex:1000,minWidth:170,boxShadow:"0 4px 20px rgba(0,0,0,0.5)"}}>
                <div style={{padding:"8px 16px",fontSize:11,opacity:0.5,borderBottom:"1px solid #2b3442"}}>Move to folder</div>
                <div onClick={()=>moveToFolder(r.id,null)} style={{padding:"10px 16px",cursor:"pointer",fontSize:13}}>📂 No folder</div>
                {folders.map(f=>(
                  <div key={f.id} onClick={()=>moveToFolder(r.id,f.id)} style={{padding:"10px 16px",cursor:"pointer",fontSize:13}}>📁 {f.name}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {showPaywall && <PaywallModal />}
    </div>
  );
}
