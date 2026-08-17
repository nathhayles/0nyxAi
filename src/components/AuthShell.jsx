import { motion } from "framer-motion";

// Shared chrome for /login and /signup: the same gradient-mesh background and
// ONYX mark used on the landing page hero, so account pages read as part of
// the same product instead of a bare unstyled form. Entrance uses scale(0.96)
// not scale(0) -- per the design-eng skill, nothing in the real world pops in
// from nothing -- with a strong ease-out curve, no bounce (this isn't a
// playful moment, it's an accountability-critical form).
const EASE_OUT = [0.23, 1, 0.32, 1];

export function OnyxMark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ filter: "drop-shadow(0 0 6px rgba(77,208,255,0.55))" }}>
      <defs>
        <linearGradient id="authMark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9eecff" />
          <stop offset="55%" stopColor="#4dd0ff" />
          <stop offset="100%" stopColor="#1d7da8" />
        </linearGradient>
      </defs>
      <path d="M12 2L22 12L12 22L2 12Z" fill="url(#authMark)" />
      <path d="M12 2L22 12L12 22L2 12Z" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
      <path d="M12 7L17 12L12 17L7 12Z" fill="rgba(8,12,20,0.5)" />
    </svg>
  );
}

export default function AuthShell({ children }) {
  return (
    <div className="auth-shell">
      <div className="auth-shell-grid" />
      <div className="auth-shell-nav">
        <a href="/" className="auth-shell-logo">
          <OnyxMark size={18} />
          ONYX
        </a>
      </div>
      <div className="auth-shell-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.32, ease: EASE_OUT }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
