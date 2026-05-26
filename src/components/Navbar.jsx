import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useState } from "react";

export default function Navbar({ session }) {
  const navigate = useNavigate();
  const [burgerOpen, setBurgerOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <nav style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px", height: 56,
      background: "rgba(6,9,15,0.85)",
      borderBottom: "0.5px solid rgba(255,255,255,0.08)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      position: "relative", zIndex: 200,
      fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    }}>

      {/* Left — wordmark */}
      <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 9 }}>
        <svg width={18} height={18} viewBox="0 0 24 24" style={{ filter: "drop-shadow(0 0 6px rgba(77,208,255,0.55))" }}>
          <defs>
            <linearGradient id="navmark" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#9eecff"/>
              <stop offset="55%" stopColor="#4dd0ff"/>
              <stop offset="100%" stopColor="#1d7da8"/>
            </linearGradient>
          </defs>
          <path d="M12 2L22 12L12 22L2 12Z" fill="url(#navmark)"/>
          <path d="M12 2L22 12L12 22L2 12Z" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5"/>
          <path d="M12 7L17 12L12 17L7 12Z" fill="rgba(8,12,20,0.5)"/>
        </svg>
        <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "0.32em", color: "#f1f5fb" }}>ONYX</span>
      </Link>

      {/* Centre — main nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        {[
          { label: "Projects",  to: "/projects" },
          { label: "Studio",    to: "/studio" },
          { label: "Pricing",   to: "/pricing" },
        ].map(({ label, to }) => (
          <Link key={to} to={to} style={{
            padding: "5px 12px", borderRadius: 7, fontSize: 13, fontWeight: 500,
            color: "rgba(241,245,251,0.7)", textDecoration: "none",
            transition: "color 0.15s, background 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.color = "#f1f5fb"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(241,245,251,0.7)"; e.currentTarget.style.background = "transparent"; }}
          >{label}</Link>
        ))}
      </div>

      {/* Right — burger (logged in) or login */}
      <div style={{ position: "relative" }}>
        {session ? (
          <>
            <button onClick={() => setBurgerOpen(o => !o)}
              style={{
                width: 36, height: 36, borderRadius: 8, border: "0.5px solid rgba(255,255,255,0.12)",
                background: burgerOpen ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
                cursor: "pointer", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 4,
              }}>
              {[0,1,2].map(i => (
                <span key={i} style={{ width: 14, height: 1.5, background: "#94a3b8", borderRadius: 1, display: "block" }}/>
              ))}
            </button>

            {burgerOpen && (
              <>
                {/* Backdrop */}
                <div onClick={() => setBurgerOpen(false)}
                  style={{ position: "fixed", inset: 0, zIndex: 299 }}/>

                {/* Dropdown */}
                <div style={{
                  position: "absolute", right: 0, top: "calc(100% + 8px)",
                  width: 200, borderRadius: 12, zIndex: 300,
                  background: "rgba(10,14,22,0.95)",
                  border: "0.5px solid rgba(255,255,255,0.12)",
                  backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
                  boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
                  overflow: "hidden",
                }}>
                  {/* User email */}
                  <div style={{ padding: "12px 14px 10px", borderBottom: "0.5px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ fontSize: 10, color: "rgba(241,245,251,0.35)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 2 }}>Signed in as</div>
                    <div style={{ fontSize: 12, color: "rgba(241,245,251,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {session.user?.email || "—"}
                    </div>
                  </div>

                  {/* Menu items */}
                  {[
                    { label: "Account",  to: "/account",  icon: "👤" },
                    { label: "Earn",     to: "/earn",     icon: "💰" },
                    { label: "Brands",   to: "/branding", icon: "🎨" },
                  ].map(({ label, to, icon }) => (
                    <Link key={to} to={to}
                      onClick={() => setBurgerOpen(false)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 14px", textDecoration: "none",
                        color: "rgba(241,245,251,0.75)", fontSize: 13,
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <span style={{ fontSize: 14 }}>{icon}</span>
                      {label}
                    </Link>
                  ))}

                  {/* Divider + Logout */}
                  <div style={{ borderTop: "0.5px solid rgba(255,255,255,0.08)", margin: "4px 0" }}/>
                  <button onClick={handleLogout}
                    style={{
                      width: "100%", textAlign: "left", padding: "10px 14px",
                      background: "none", border: "none", cursor: "pointer",
                      color: "#f87171", fontSize: 13, display: "flex", alignItems: "center", gap: 10,
                      fontFamily: "inherit",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                  >
                    <span style={{ fontSize: 14 }}>🚪</span>
                    Logout
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <Link to="/login" style={{
            padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: "linear-gradient(180deg,#5edcff,#2db8ee)",
            color: "#06121b", textDecoration: "none",
            boxShadow: "0 4px 14px rgba(77,208,255,0.35)",
          }}>Sign in</Link>
        )}
      </div>
    </nav>
  );
}
