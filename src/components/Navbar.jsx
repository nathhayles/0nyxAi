import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Navbar({ session }) {
  const navigate = useNavigate();
  const [burgerOpen, setBurgerOpen] = useState(false);
  const [theme, setTheme] = useState(
    () => document.documentElement.getAttribute('data-theme') || 'onyx'
  );

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'opal' ? 'onyx' : 'opal';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('onyx-theme', next);
    setTheme(next);
  }

  async function handleLogout() {
    const { supabase } = await import("../supabaseClient");
    await supabase.auth.signOut();
    navigate("/login");
  }

  const isOpal = theme === 'opal';

  return (
    <>
      <style>{`
        .onyx-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          height: 56px;
          background: var(--nav-bg);
          border-bottom: 0.5px solid var(--onyx-hairline);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          position: sticky;
          top: 0;
          z-index: 200;
          font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          transition: background 0.3s ease, border-color 0.3s ease;
        }
        .onyx-nav__left {
          display: flex;
          align-items: center;
          gap: 20px;
          flex: 1;
        }
        .onyx-nav__logo {
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .onyx-nav__wordmark {
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.32em;
          color: var(--onyx-text);
          transition: color 0.3s ease;
        }
        .onyx-nav__links {
          display: flex;
          align-items: center;
          gap: 2px;
        }
        .onyx-nav__link {
          padding: 5px 11px;
          border-radius: 7px;
          font-size: 13px;
          font-weight: 500;
          color: var(--onyx-text-dim);
          text-decoration: none;
          transition: color 0.15s, background 0.15s;
        }
        .onyx-nav__link:hover {
          color: var(--onyx-text);
          background: var(--chip-bg);
        }
        .onyx-nav__right {
          display: flex;
          align-items: center;
          gap: 6px;
          position: relative;
        }
        .onyx-nav__icon-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 0.5px solid var(--onyx-hairline-strong);
          background: var(--chip-bg-low);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.2s ease, border-color 0.3s ease;
          color: var(--onyx-text-dim);
        }
        .onyx-nav__icon-btn:hover {
          background: var(--chip-bg);
        }
        .onyx-nav__dropdown {
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          width: 200px;
          border-radius: 12px;
          z-index: 300;
          border: 0.5px solid var(--onyx-hairline-strong);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          overflow: hidden;
          background: var(--bg-surface);
          box-shadow: 0 16px 40px rgba(0,0,0,0.3);
          transition: background 0.3s ease;
        }
        .onyx-nav__dropdown-header {
          padding: 12px 14px 10px;
          border-bottom: 0.5px solid var(--onyx-hairline);
        }
        .onyx-nav__dropdown-label {
          font-size: 10px;
          color: var(--onyx-text-faint);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        .onyx-nav__dropdown-email {
          font-size: 12px;
          color: var(--onyx-text-dim);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .onyx-nav__dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          text-decoration: none;
          color: var(--onyx-text-dim);
          font-size: 13px;
          transition: background 0.12s;
        }
        .onyx-nav__dropdown-item:hover {
          background: var(--chip-bg);
        }
        .onyx-nav__dropdown-divider {
          border-top: 0.5px solid var(--onyx-hairline);
          margin: 4px 0;
        }
        .onyx-nav__logout {
          width: 100%;
          text-align: left;
          padding: 10px 14px;
          background: none;
          border: none;
          cursor: pointer;
          color: #f87171;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: inherit;
          transition: background 0.12s;
        }
        .onyx-nav__logout:hover {
          background: rgba(239,68,68,0.08);
        }
        .onyx-nav__signin {
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          background: linear-gradient(180deg,#5edcff,#2db8ee);
          color: #06121b;
          text-decoration: none;
          box-shadow: 0 4px 14px rgba(77,208,255,0.35);
        }
        .onyx-nav__burger-bar {
          width: 14px;
          height: 1.5px;
          background: var(--onyx-text-dim);
          border-radius: 1px;
          display: block;
          transition: background 0.3s ease;
        }
      `}</style>

      <nav className="onyx-nav">

        {/* Left — logo + nav links */}
        <div className="onyx-nav__left">
          <Link to="/" className="onyx-nav__logo">
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
            <span className="onyx-nav__wordmark">ONYX</span>
          </Link>

          <div className="onyx-nav__links">
            {[
              { label: "Dashboard",    to: "/dashboard" },
              { label: "Studio",       to: "/studio" },
              { label: "Content Plan", to: "/content-plan" },
              { label: "Planner",      to: "/planner" },
              { label: "Characters",   to: "/characters" },
              { label: "Learn",        to: "/learn" },
              { label: "Pricing",      to: "/pricing" },
            ].map(({ label, to }) => (
              <Link key={to} to={to} className="onyx-nav__link">{label}</Link>
            ))}
          </div>
        </div>

        {/* Right — theme toggle + burger or login */}
        <div className="onyx-nav__right">

          {/* Theme toggle */}
          <button
            className="onyx-nav__icon-btn"
            onClick={toggleTheme}
            title={isOpal ? 'Switch to Onyx (dark)' : 'Switch to Opal (light)'}
          >
            {isOpal ? (
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="var(--onyx-cyan)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/>
              </svg>
            ) : (
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#f1d073" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx={12} cy={12} r={4}/>
                <line x1={12} y1={2} x2={12} y2={4}/>
                <line x1={12} y1={20} x2={12} y2={22}/>
                <line x1={4.22} y1={4.22} x2={5.64} y2={5.64}/>
                <line x1={18.36} y1={18.36} x2={19.78} y2={19.78}/>
                <line x1={2} y1={12} x2={4} y2={12}/>
                <line x1={20} y1={12} x2={22} y2={12}/>
                <line x1={4.22} y1={19.78} x2={5.64} y2={18.36}/>
                <line x1={18.36} y1={5.64} x2={19.78} y2={4.22}/>
              </svg>
            )}
          </button>

          {session ? (
            <>
              <button
                className="onyx-nav__icon-btn"
                onClick={() => setBurgerOpen(o => !o)}
                style={{ flexDirection: "column", gap: 4 }}
              >
                <span className="onyx-nav__burger-bar"/>
                <span className="onyx-nav__burger-bar"/>
                <span className="onyx-nav__burger-bar"/>
              </button>

              {burgerOpen && (
                <>
                  <div onClick={() => setBurgerOpen(false)}
                    style={{ position: "fixed", inset: 0, zIndex: 299 }}/>
                  <div className="onyx-nav__dropdown">
                    <div className="onyx-nav__dropdown-header">
                      <div className="onyx-nav__dropdown-label">Signed in as</div>
                      <div className="onyx-nav__dropdown-email">{session.user?.email || "—"}</div>
                    </div>
                    {[
                      { label: "Account",  to: "/account",  icon: "👤" },
                      { label: "Earn",     to: "/earn",     icon: "💰" },
                      { label: "Brands",   to: "/branding", icon: "🎨" },
                    ].map(({ label, to, icon }) => (
                      <Link key={to} to={to}
                        onClick={() => setBurgerOpen(false)}
                        className="onyx-nav__dropdown-item"
                      >
                        <span style={{ fontSize: 14 }}>{icon}</span>
                        {label}
                      </Link>
                    ))}
                    <div className="onyx-nav__dropdown-divider"/>
                    <button className="onyx-nav__logout" onClick={handleLogout}>
                      <span style={{ fontSize: 14 }}>🚪</span>
                      Logout
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <Link to="/login" className="onyx-nav__signin">Sign in</Link>
          )}
        </div>
      </nav>
    </>
  );
}
