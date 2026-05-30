import Signup from "./pages/Signup";
import { Routes, Route, useLocation } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { useState, useEffect } from "react";
import Admin from "./pages/Admin";
import Navbar from "./components/Navbar";

import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import Create from "./pages/Create";
import Editor from "./pages/Editor";
import EditorV2 from "./pages/EditorV2";
import PricingPage from "./pages/PricingPage";
import Earn from "./pages/Earn";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import Account from "./pages/Account";
import Preview from "./pages/Preview";
import Studio from "./pages/Studio";
import Campaign from "./pages/Campaign";
import Music from "./pages/Music";
import UrlToVideo from "./pages/UrlToVideo";
import PptToVideo from "./pages/PptToVideo";
import AudioToVideo from "./pages/AudioToVideo";
import Publish from "./pages/Publish";
import BrandingPanel from "./components/BrandingPanel";
import BrandSetupWizard from "./pages/BrandSetupWizard";
import ScreenRecorder from "./pages/ScreenRecorder.jsx";
import WebcamRecorder from "./pages/WebcamRecorder.jsx";
import ViralHooks from "./pages/ViralHooks.jsx";
import VideoToReel from "./pages/VideoToReel.jsx";
import ProjectsPage from "./pages/ProjectsPage.jsx";

import { getAuthHeaders } from "./utils/auth";

import Login from "./components/Login";
import ResetPassword from "./components/ResetPassword";
import ProtectedRoute from "./components/ProtectedRoute";
import ChatBot from "./components/ChatBot";

/*
------------------------
REFERRAL TRACKING
Runs immediately on page load
------------------------
*/

const params = new URLSearchParams(window.location.search)
const ref = params.get("ref")

if (ref) {
  localStorage.setItem("referral_code", ref)
  console.log("Referral stored:", ref)

  supabase
    .from("affiliate_clicks")
    .insert({
      ref_code: ref,
      ip: "unknown"
    })
    .then(res => console.log("Affiliate click logged", res))
    .catch(err => console.error("Affiliate tracking error", err))
}

function TrialBanner() {
  const [trialInfo, setTrialInfo] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/user/me", { headers });
        if (!res.ok) return;
        const d = await res.json();
        if (d.is_trial) {
          setTrialInfo({ daysLeft: d.days_remaining || 0, expired: false });
        } else if (d.trial_expired) {
          setTrialInfo({ daysLeft: 0, expired: true });
        }
      } catch {}
    })();
  }, []);

  if (!trialInfo) return null;

  return (
    <div style={{ background: "linear-gradient(135deg, #0f1e38, #1a1040)", borderBottom: "1px solid rgba(99,102,241,0.35)", padding: "9px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 14, fontSize: 13, color: "#e2e8f0", flexWrap: "wrap" }}>
      <span style={{ fontSize: 15 }}>{trialInfo.expired ? "🔒" : "⏳"}</span>
      {trialInfo.expired
        ? <span>Your free trial has <strong style={{ color: "#f87171" }}>expired</strong> — upgrade to continue creating.</span>
        : <span>Your free trial ends in <strong style={{ color: "#a78bfa" }}>{trialInfo.daysLeft} day{trialInfo.daysLeft !== 1 ? "s" : ""}</strong> — upgrade to keep full access.</span>
      }
      <button
        onClick={() => window.location.href = "/pricing"}
        style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid #6366f1", background: "rgba(99,102,241,0.2)", color: "#a78bfa", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
      >
        Upgrade Now →
      </button>
    </div>
  );
}

function MobileBanner() {
  const [isMobile, setIsMobile] = useState(false);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem("mobile_banner_dismissed") === "1");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem("mobile_banner_dismissed", "1");
    setDismissed(true);
  };

  const submitEmail = async (e) => {
    e.preventDefault();
    if (!email) return;
    try {
      await supabase.from("mobile_waitlist").insert({ email });
    } catch {}
    setSubmitted(true);
    setTimeout(dismiss, 1800);
  };

  if (!isMobile || dismissed) return null;

  return (
    <div style={{ background: "linear-gradient(135deg, #1a0a2e, #0f2040)", borderBottom: "2px solid rgba(251,191,36,0.4)", padding: "14px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, fontSize: 13, color: "#e2e8f0", textAlign: "center", position: "relative" }}>
      <button onClick={dismiss} style={{ position: "absolute", top: 10, right: 14, background: "none", border: "none", color: "#94a3b8", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
      <span style={{ fontSize: 20 }}>💻</span>
      <p style={{ margin: 0, lineHeight: 1.5 }}>
        <strong style={{ color: "#fbbf24" }}>Best on desktop.</strong> This app is optimised for larger screens — some features may be limited on mobile. You can still sign up and access your account here.
      </p>
      {!showEmailForm && !submitted && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={() => setShowEmailForm(true)}
            style={{ padding: "7px 16px", borderRadius: 6, border: "1px solid #fbbf24", background: "rgba(251,191,36,0.15)", color: "#fbbf24", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            Notify me when mobile launches
          </button>
          <button
            onClick={dismiss}
            style={{ padding: "7px 16px", borderRadius: 6, border: "1px solid rgba(148,163,184,0.4)", background: "transparent", color: "#94a3b8", fontSize: 12, cursor: "pointer" }}
          >
            Continue anyway
          </button>
        </div>
      )}
      {showEmailForm && !submitted && (
        <form onSubmit={submitEmail} style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            style={{ padding: "7px 12px", borderRadius: 6, border: "1px solid rgba(251,191,36,0.4)", background: "rgba(255,255,255,0.07)", color: "#e2e8f0", fontSize: 13, minWidth: 200 }}
          />
          <button type="submit" style={{ padding: "7px 14px", borderRadius: 6, border: "none", background: "#fbbf24", color: "#0f172a", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            Notify me
          </button>
          <button type="button" onClick={dismiss} style={{ padding: "7px 12px", borderRadius: 6, border: "1px solid rgba(148,163,184,0.3)", background: "transparent", color: "#94a3b8", fontSize: 12, cursor: "pointer" }}>
            Skip
          </button>
        </form>
      )}
      {submitted && <p style={{ margin: 0, color: "#4ade80", fontWeight: 600 }}>You're on the list! We'll let you know when mobile launches.</p>}
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const isEditor = location.pathname.startsWith("/editor") || location.pathname.startsWith("/preview");
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const bgRoutes = ["/", "/login", "/signup", "/pricing", "/terms", "/privacy", "/earn", "/account", "/dashboard"];
    if (bgRoutes.includes(location.pathname)) {
      document.body.classList.add("has-bg");
    } else {
      document.body.classList.remove("has-bg");
    }
  }, [location.pathname]);

  return (
    <div>
      {!isEditor && location.pathname !== "/" && <Navbar session={session} />}
      {!isEditor && location.pathname !== "/" && <TrialBanner />}
      {!isEditor && <MobileBanner />}

      <Routes>

        <Route path="/" element={<LandingPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/create"
          element={
            <ProtectedRoute>
              <Create />
            </ProtectedRoute>
          }
        />

        <Route
          path="/editor"
          element={
            <ProtectedRoute>
              <EditorV2 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/editor-v2"
          element={
            <ProtectedRoute>
              <EditorV2 />
            </ProtectedRoute>
          }
        />

        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/earn" element={<Earn />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
        <Route path="/branding" element={<ProtectedRoute><BrandingPanel /></ProtectedRoute>} />
        <Route path="/brand-setup" element={<ProtectedRoute><BrandSetupWizard /></ProtectedRoute>} />

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/preview/:id" element={<Preview />} />

        <Route
          path="/studio"
          element={
            <ProtectedRoute>
              <Studio />
            </ProtectedRoute>
          }
        />

        <Route
          path="/campaign"
          element={
            <ProtectedRoute>
              <Campaign />
            </ProtectedRoute>
          }
        />

        <Route
          path="/music"
          element={
            <ProtectedRoute>
              <Music />
            </ProtectedRoute>
          }
        />

        <Route path="/url-to-video" element={<ProtectedRoute><UrlToVideo /></ProtectedRoute>} />
        <Route path="/ppt-to-video" element={<ProtectedRoute><PptToVideo /></ProtectedRoute>} />
        <Route path="/audio-to-video" element={<ProtectedRoute><AudioToVideo /></ProtectedRoute>} />
        <Route path="/publish" element={<ProtectedRoute><Publish /></ProtectedRoute>} />
        <Route path="/scheduler" element={<ProtectedRoute><Publish /></ProtectedRoute>} />
        <Route path="/screen-recorder" element={<ProtectedRoute><ScreenRecorder /></ProtectedRoute>} />
        <Route path="/webcam-recorder" element={<ProtectedRoute><WebcamRecorder /></ProtectedRoute>} />
        <Route path="/viral-hooks" element={<ProtectedRoute><ViralHooks /></ProtectedRoute>} />
        <Route path="/video-to-reel" element={<ProtectedRoute><VideoToReel /></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />

      </Routes>
      {!isEditor && <ChatBot />}
    </div>
  )
}
