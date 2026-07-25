import { lazy, Suspense } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { TOKEN_EXPIRY_BUFFER_SECONDS } from "./utils/auth.js";
import Navbar from "./components/Navbar";

import LandingPage from "./pages/LandingPage";
import ProtectedRoute from "./components/ProtectedRoute";

import { getAuthHeaders } from "./utils/auth";

const Signup = lazy(() => import("./pages/Signup"));
const Admin = lazy(() => import("./pages/Admin"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Create = lazy(() => import("./pages/Create"));
const EditorV2 = lazy(() => import("./pages/EditorV2"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const Earn = lazy(() => import("./pages/Earn"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const Learn = lazy(() => import("./pages/Learn"));
const LearnKlingPrompting = lazy(() => import("./pages/LearnKlingPrompting"));
const LearnSeedancePrompting = lazy(() => import("./pages/LearnSeedancePrompting"));
const LearnWanPrompting = lazy(() => import("./pages/LearnWanPrompting"));
const LearnVeoPrompting = lazy(() => import("./pages/LearnVeoPrompting"));
const LearnChoosingAModel = lazy(() => import("./pages/LearnChoosingAModel"));
const LearnCharacterConsistency = lazy(() => import("./pages/LearnCharacterConsistency"));
const LearnCameraGlossary = lazy(() => import("./pages/LearnCameraGlossary"));
const LearnChildrensContent = lazy(() => import("./pages/LearnChildrensContent"));
const LearnHistoricalCinematic = lazy(() => import("./pages/LearnHistoricalCinematic"));
const LearnMarketingBranding = lazy(() => import("./pages/LearnMarketingBranding"));
const LearnInfluencerContent = lazy(() => import("./pages/LearnInfluencerContent"));
const LearnMusicPromotion = lazy(() => import("./pages/LearnMusicPromotion"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const Account = lazy(() => import("./pages/Account"));
const Preview = lazy(() => import("./pages/Preview"));
const Studio = lazy(() => import("./pages/Studio"));
const Campaign = lazy(() => import("./pages/Campaign"));
const Music = lazy(() => import("./pages/Music"));
const UrlToVideo = lazy(() => import("./pages/UrlToVideo"));
const PptToVideo = lazy(() => import("./pages/PptToVideo"));
const AudioToVideo = lazy(() => import("./pages/AudioToVideo"));
const Publish = lazy(() => import("./pages/Publish"));
const Planner = lazy(() => import("./pages/Planner"));
const BrandingPanel = lazy(() => import("./components/BrandingPanel"));
const BrandSetupWizard = lazy(() => import("./pages/BrandSetupWizard"));
const ScreenRecorder = lazy(() => import("./pages/ScreenRecorder.jsx"));
const WebcamRecorder = lazy(() => import("./pages/WebcamRecorder.jsx"));
const ViralHooks = lazy(() => import("./pages/ViralHooks.jsx"));
const ContentPlan = lazy(() => import("./pages/ContentPlan.jsx"));
const VideoToReel = lazy(() => import("./pages/VideoToReel.jsx"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage.jsx"));
const Support = lazy(() => import("./pages/Support.jsx"));
const Characters = lazy(() => import("./pages/Characters.jsx"));
const Login = lazy(() => import("./components/Login"));
const ResetPassword = lazy(() => import("./components/ResetPassword"));
const ChatBot = lazy(() => import("./components/ChatBot"));

/*
------------------------
REFERRAL TRACKING
Stored immediately; Supabase write deferred via dynamic import.
------------------------
*/

const params = new URLSearchParams(window.location.search)
const ref = params.get("ref")

if (ref) {
  localStorage.setItem("referral_code", ref)
  ;(async () => {
    try {
      const { supabase } = await import("./supabaseClient")
      await supabase.from("affiliate_clicks").insert({ ref_code: ref, ip: "unknown" })
    } catch (err) {
      console.error("Affiliate tracking error", err)
    }
  })()
}

/*
------------------------
SYNC SESSION CHECK
Read the Supabase auth token from localStorage synchronously so
the initial React render has the correct auth state without waiting
for the async Supabase SDK to load.
------------------------
*/
function getLocalSessionSync() {
  try {
    const projectRef = import.meta.env.VITE_SUPABASE_URL?.split("//")[1]?.split(".")[0];
    const raw = localStorage.getItem(`sb-${projectRef}-auth-token`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const expiresAt = parsed?.expires_at ?? 0;
    return expiresAt > Math.floor(Date.now() / 1000) ? parsed : null;
  } catch { return null; }
}

function TrialBanner() {
  const [trialInfo, setTrialInfo] = useState(null);

  useEffect(() => {
    (async () => {
      const { supabase } = await import("./supabaseClient");
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
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
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
      const { supabase } = await import("./supabaseClient");
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

function AppFooter() {
  return (
    <footer style={{
      borderTop: "0.5px solid var(--onyx-hairline)",
      background: "var(--nav-bg)",
      backdropFilter: "blur(20px)",
      padding: "20px 40px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 16,
      fontSize: 13,
      color: "var(--onyx-text-dim)",
      fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    }}>
      <div style={{ display:"flex", flexDirection:"column", gap: 4 }}>
        <div style={{ display:"flex", alignItems:"center", gap: 8 }}>
          <svg width={14} height={14} viewBox="0 0 24 24">
            <defs><linearGradient id="footmark" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#9eecff"/>
              <stop offset="100%" stopColor="#1d7da8"/>
            </linearGradient></defs>
            <path d="M12 2L22 12L12 22L2 12Z" fill="url(#footmark)"/>
          </svg>
          <span>© {new Date().getFullYear()} Onyx Reelz. All rights reserved.</span>
        </div>
        <span style={{ fontSize: 11, opacity: 0.7 }}>ONYX REELZ LTD is a company registered in England & Wales. Company number: 17288776. Registered office: 128 City Road, London, EC1V 2NX, United Kingdom.</span>
      </div>
      <div style={{ display:"flex", gap: 24, flexWrap:"wrap" }}>
        <a href="/features" style={{ color:"var(--onyx-text-dim)", textDecoration:"none" }}
          onMouseEnter={e=>e.target.style.color="#4dd0ff"}
          onMouseLeave={e=>e.target.style.color=""}>Features</a>
        <a href="/learn" style={{ color:"var(--onyx-text-dim)", textDecoration:"none" }}
          onMouseEnter={e=>e.target.style.color="#4dd0ff"}
          onMouseLeave={e=>e.target.style.color=""}>Learn</a>
        <a href="/privacy" style={{ color:"var(--onyx-text-dim)", textDecoration:"none" }}
          onMouseEnter={e=>e.target.style.color="#4dd0ff"}
          onMouseLeave={e=>e.target.style.color=""}>Privacy Policy</a>
        <a href="/terms" style={{ color:"var(--onyx-text-dim)", textDecoration:"none" }}
          onMouseEnter={e=>e.target.style.color="#4dd0ff"}
          onMouseLeave={e=>e.target.style.color=""}>Terms of Service</a>
        <a href="/support" style={{ color:"var(--onyx-text-dim)", textDecoration:"none" }}
          onMouseEnter={e=>e.target.style.color="#4dd0ff"}
          onMouseLeave={e=>e.target.style.color=""}>Support</a>
        <a href="https://www.linkedin.com/company/onyx-reelz" target="_blank" rel="noreferrer"
          style={{ color:"var(--onyx-text-dim)", textDecoration:"none" }}
          onMouseEnter={e=>e.target.style.color="#4dd0ff"}
          onMouseLeave={e=>e.target.style.color=""}>LinkedIn</a>
      </div>
    </footer>
  );
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isEditor = location.pathname.startsWith("/editor") || location.pathname.startsWith("/preview");
  const [session, setSession] = useState(() => getLocalSessionSync());
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    let unsubscribe;
    import("./supabaseClient").then(({ supabase }) => {
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        setSessionLoading(false);
      });
      const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
      unsubscribe = () => listener.subscription.unsubscribe();
    });
    return () => unsubscribe?.();
  }, []);

  // Safety net: a backgrounded tab can miss its auto-refresh tick, so on
  // regaining visibility, refresh proactively if the cached token is near expiry.
  useEffect(() => {
    const onVisibilityChange = async () => {
      if (document.visibilityState !== "visible") return;
      const { supabase } = await import("./supabaseClient");
      const { data } = await supabase.auth.getSession();
      const expiresAt = data?.session?.expires_at;
      if (!expiresAt) return;
      const secondsRemaining = expiresAt - Math.floor(Date.now() / 1000);
      if (secondsRemaining <= TOKEN_EXPIRY_BUFFER_SECONDS) {
        await supabase.auth.refreshSession();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
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
      {!isEditor && location.pathname !== "/" && <MobileBanner />}

      <Suspense fallback={null}>
      <main>
      <Routes>

        <Route path="/" element={<LandingPage session={session} />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute session={session} sessionLoading={sessionLoading}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/create"
          element={
            <ProtectedRoute session={session} sessionLoading={sessionLoading}>
              <Create />
            </ProtectedRoute>
          }
        />

        <Route
          path="/editor"
          element={
            <ProtectedRoute session={session} sessionLoading={sessionLoading}>
              <EditorV2 />
            </ProtectedRoute>
          }
        />

        <Route
          path="/editor-v2"
          element={
            <ProtectedRoute session={session} sessionLoading={sessionLoading}>
              <EditorV2 />
            </ProtectedRoute>
          }
        />

        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/earn" element={<Earn />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/learn/kling-prompting" element={<LearnKlingPrompting />} />
        <Route path="/learn/seedance-prompting" element={<LearnSeedancePrompting />} />
        <Route path="/learn/wan-prompting" element={<LearnWanPrompting />} />
        <Route path="/learn/veo-prompting" element={<LearnVeoPrompting />} />
        <Route path="/learn/choosing-a-model" element={<LearnChoosingAModel />} />
        <Route path="/learn/character-consistency" element={<LearnCharacterConsistency />} />
        <Route path="/learn/camera-glossary" element={<LearnCameraGlossary />} />
        <Route path="/learn/childrens-content" element={<LearnChildrensContent />} />
        <Route path="/learn/historical-cinematic" element={<LearnHistoricalCinematic />} />
        <Route path="/learn/marketing-branding" element={<LearnMarketingBranding />} />
        <Route path="/learn/influencer-content" element={<LearnInfluencerContent />} />
        <Route path="/learn/music-promotion" element={<LearnMusicPromotion />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/account" element={<ProtectedRoute session={session} sessionLoading={sessionLoading}><Account /></ProtectedRoute>} />
        <Route path="/branding" element={<ProtectedRoute session={session} sessionLoading={sessionLoading}><BrandingPanel onApply={(brand) => navigate("/projects", { state: { applyBrandId: brand.id } })} /></ProtectedRoute>} />
        <Route path="/brand-setup" element={<ProtectedRoute session={session} sessionLoading={sessionLoading}><BrandSetupWizard /></ProtectedRoute>} />

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/preview/:id" element={<Preview />} />

        <Route
          path="/studio"
          element={
            <ProtectedRoute session={session} sessionLoading={sessionLoading}>
              <Studio />
            </ProtectedRoute>
          }
        />

        <Route
          path="/campaign"
          element={
            <ProtectedRoute session={session} sessionLoading={sessionLoading}>
              <Campaign />
            </ProtectedRoute>
          }
        />

        <Route
          path="/music"
          element={
            <ProtectedRoute session={session} sessionLoading={sessionLoading}>
              <Music />
            </ProtectedRoute>
          }
        />

        <Route path="/url-to-video" element={<ProtectedRoute session={session} sessionLoading={sessionLoading}><UrlToVideo /></ProtectedRoute>} />
        <Route path="/ppt-to-video" element={<ProtectedRoute session={session} sessionLoading={sessionLoading}><PptToVideo /></ProtectedRoute>} />
        <Route path="/audio-to-video" element={<ProtectedRoute session={session} sessionLoading={sessionLoading}><AudioToVideo /></ProtectedRoute>} />
        <Route path="/publish" element={<ProtectedRoute session={session} sessionLoading={sessionLoading}><Publish /></ProtectedRoute>} />
        <Route path="/scheduler" element={<ProtectedRoute session={session} sessionLoading={sessionLoading}><Publish /></ProtectedRoute>} />
        <Route path="/planner" element={<ProtectedRoute session={session} sessionLoading={sessionLoading}><Planner /></ProtectedRoute>} />
        <Route path="/screen-recorder" element={<ProtectedRoute session={session} sessionLoading={sessionLoading}><ScreenRecorder /></ProtectedRoute>} />
        <Route path="/webcam-recorder" element={<ProtectedRoute session={session} sessionLoading={sessionLoading}><WebcamRecorder /></ProtectedRoute>} />
        <Route path="/viral-hooks" element={<ProtectedRoute session={session} sessionLoading={sessionLoading}><ViralHooks /></ProtectedRoute>} />
        <Route path="/content-plan" element={<ProtectedRoute session={session} sessionLoading={sessionLoading}><ContentPlan /></ProtectedRoute>} />
        <Route path="/video-to-reel" element={<ProtectedRoute session={session} sessionLoading={sessionLoading}><VideoToReel /></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute session={session} sessionLoading={sessionLoading}><ProjectsPage /></ProtectedRoute>} />
        <Route path="/characters" element={<ProtectedRoute session={session} sessionLoading={sessionLoading}><Characters /></ProtectedRoute>} />
        <Route path="/support" element={<Support />} />

      </Routes>
      </main>
      </Suspense>
      {!isEditor && location.pathname !== "/" && <AppFooter />}
      {!isEditor && <ChatBot />}
    </div>
  )
}
