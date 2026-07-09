import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";

const TOOLS = [
  { id:"blank-editor", icon:"", label:"Blank Editor", desc:"Skip AI generation and templates — start with an empty timeline and build your reel from scratch", route:"/editor", color:"#94a3b8", available:true },
  { id:"text-to-video", icon:"", label:"Text to Video", desc:"Turn your script or idea into a full reel with stock visuals, voiceover and music", route:"/create", color:"var(--btn-primary-grad)", available:true },
  { id:"video-to-reel", icon:"", label:"Video to Reel", desc:"Upload your footage and turn it into a polished short-form reel with AI editing, captions and music", route:"/video-to-reel", color:"var(--btn-primary-grad)", available:true, badge:"New" },
  { id:"campaign", icon:"", label:"Campaign Generator", desc:"Generate 5–10 reels from one brief — perfect for social media campaigns", route:"/campaign", color:"#4dd0ff", available:true, badge:"New" },
  { id:"text-to-music", icon:"", label:"Text to Music", desc:"Generate original background music or full tracks from a text prompt", route:"/music", color:"#ec4899", available:true, badge:"New" },
  { id:"url-to-video", icon:"", label:"URL to Video", desc:"Paste a URL and we'll turn the content into a reel automatically", route:"/url-to-video", color:"#10b981", available:true, badge:"New" },
  { id:"audio-to-video", icon:"", label:"Audio to Video", desc:"Upload audio or a podcast clip and get a video reel with matched visuals", route:"/audio-to-video", color:"#f59e0b", available:true, badge:"New" },
  { id:"ppt-to-video", icon:"", label:"PPT to Video", desc:"Convert your presentation slides into an animated video reel", route:"/ppt-to-video", color:"#ef4444", available:true, badge:"New" },
  { id:"screen-recorder", icon:"", label:"Screen Recording", desc:"Record your screen and turn it into a video reel with AI voiceover and captions.", route:"/screen-recorder", color:"#0ea5e9", available:true, badge:"New" },
  { id:"webcam-recorder", icon:"", label:"Webcam Recording", desc:"Record yourself to camera and get a polished reel with AI captions and music.", route:"/webcam-recorder", color:"#6366f1", available:true, badge:"New" },
  { id:"viral-hooks", icon:"", label:"Viral Hooks", desc:"Generate 10 scroll-stopping opening lines using proven viral frameworks. Turn any hook into a reel in one click.", route:"/viral-hooks", color:"#ec4899", available:true, badge:"New" },
];

function usageColor(used, quota) {
  if (quota === null) return "#10b981";
  const remainingPct = (quota - used) / quota;
  if (remainingPct > 0.25) return "#10b981";
  if (remainingPct > 0.10) return "#f59e0b";
  return "#ef4444";
}

function UsageBar({ label, used, quota, unit }) {
  if (quota === null) return null;
  const color = usageColor(used, quota);
  const filled = Math.round(Math.min(1, used / quota) * 10);
  return (
    <div style={{ padding:"10px 16px", background:"var(--onyx-surface)", border:"1px solid var(--onyx-hairline-strong)", borderRadius:12, minWidth:210 }}>
      <div style={{ fontSize:11, color:"var(--onyx-text-faint)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>{label}</div>
      <div style={{ display:"flex", gap:2, marginBottom:6 }}>
        {Array.from({ length:10 }).map((_,i) => (
          <div key={i} style={{ flex:1, height:5, borderRadius:3, background: i < filled ? color : "var(--chip-bg-strong)" }} />
        ))}
      </div>
      <div style={{ fontSize:12, color, fontWeight:600 }}>{Math.round(used)}/{quota} {unit} used</div>
    </div>
  );
}

function CreditsChip({ balance }) {
  const color = balance > 50 ? "#10b981" : balance > 10 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ padding:"10px 16px", background:"var(--onyx-surface)", border:"1px solid var(--onyx-hairline-strong)", borderRadius:12, display:"flex", flexDirection:"column", justifyContent:"center" }}>
      <div style={{ fontSize:11, color:"var(--onyx-text-faint)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>Credits</div>
      <div style={{ fontSize:12, fontWeight:600, color }}>
        <span style={{ fontSize:9, marginRight:5 }}>●</span>{balance.toLocaleString()} remaining
      </div>
    </div>
  );
}

export default function Studio() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { navigate("/login"); return; }
      setUser(data.session.user);
      fetch("/api/credits/usage", {
        headers: { Authorization: `Bearer ${data.session.access_token}` }
      }).then(r => r.json()).then(d => setUsage(d)).catch(() => {});
    });
  }, []);

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg-page)", color:"var(--onyx-text)", padding:"48px 24px" }}>
      <div style={{ maxWidth:1100, margin:"0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom:48 }}>
          <h1 className="page-title" style={{ margin:"0 0 8px" }}>
            What will you create today{user?.email ? `, ${user.email.split("@")[0]}` : ""}?
          </h1>
          <p style={{ fontSize:16, color:"var(--onyx-text-dim)", margin:0 }}>Choose a tool to get started</p>
          {usage && (
            <div style={{ marginTop:16, display:"flex", gap:10, flexWrap:"wrap" }}>
              <UsageBar label="Stock Video" used={Number(usage.stock_video_minutes_used)} quota={usage.stock_video_quota_minutes} unit="mins" />
              <UsageBar label="Voiceover" used={Number(usage.tts_minutes_used)} quota={usage.tts_quota_minutes} unit="mins" />
              <CreditsChip balance={usage.balance} />
            </div>
          )}
        </div>

        {/* Tool grid */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:20 }}>
          {TOOLS.map(tool => (
            <div
              key={tool.id}
              onClick={() => tool.available && navigate(tool.route)}
              style={{
                position:"relative", padding:28, borderRadius:16,
                background:"var(--onyx-surface)",
                border:`1px solid ${tool.available ? tool.color+"40" : "var(--onyx-hairline)"}`,
                cursor:tool.available ? "pointer" : "default",
                opacity:tool.available ? 1 : 0.5,
                transition:"all 0.2s",
              }}
              onMouseEnter={e => { if (tool.available) e.currentTarget.style.background = "var(--chip-bg-strong)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--onyx-surface)"; }}
            >
              {tool.badge && (
                <div style={{
                  position:"absolute", top:16, right:16,
                  padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:700,
                  background:tool.available ? tool.color+"20" : "var(--chip-bg)",
                  color:tool.available ? tool.color : "var(--onyx-text-faint)",
                  border:`1px solid ${tool.available ? tool.color+"40" : "var(--onyx-hairline-strong)"}`,
                  textTransform:"uppercase", letterSpacing:"0.5px",
                }}>{tool.badge}</div>
              )}
              <div style={{
                width:52, height:52, borderRadius:14,
                background:tool.color+"15",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:24, marginBottom:16,
                border:`1px solid ${tool.color}30`,
              }}>{tool.icon}</div>
              <div style={{ fontSize:17, fontWeight:700, color:"var(--onyx-text)", marginBottom:8 }}>{tool.label}</div>
              <div style={{ fontSize:13, color:"var(--onyx-text-dim)", lineHeight:1.5 }}>{tool.desc}</div>
              {tool.available && (
                <div style={{ marginTop:20, fontSize:12, color:tool.color, fontWeight:600 }}>Get started →</div>
              )}
            </div>
          ))}
        </div>

        {/* Recent projects quick link */}
        <div style={{ marginTop:48, textAlign:"center" }}>
          <span style={{ color:"var(--onyx-text-dim)", fontSize:14 }}>
            Or{" "}
            <span onClick={() => navigate("/dashboard")} style={{ color:"var(--onyx-cyan)", cursor:"pointer", textDecoration:"underline" }}>
              continue an existing project
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
