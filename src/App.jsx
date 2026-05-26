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
import ScreenRecorder from "./pages/ScreenRecorder.jsx";
import WebcamRecorder from "./pages/WebcamRecorder.jsx";
import ViralHooks from "./pages/ViralHooks.jsx";
import VideoToReel from "./pages/VideoToReel.jsx";

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
              <Editor />
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

      </Routes>
      {!isEditor && <ChatBot />}
    </div>
  )
}
