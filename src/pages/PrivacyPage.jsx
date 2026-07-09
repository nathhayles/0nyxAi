// STALE/UNUSED — live page is served from /srv/onyx/backend/public/privacy.html via nginx exact-match, this file is not reachable in production
import SEO from "../components/SEO";

export default function PrivacyPage() {
  return (
    <div className="page" style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px", color: "#e2e8f0", fontFamily: "sans-serif", lineHeight: 1.7 }}>
      <SEO
        title="Privacy Policy"
        description="Onyx Reelz Privacy Policy describing what data we collect, how it's processed, and which third-party services we use."
        path="/privacy"
      />
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: "#64748b", marginBottom: 8 }}>Last updated: May 2026</p>
      <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.6, marginBottom: 40 }}>
        Onyx Reelz<br />
        128 City Road<br />
        London, United Kingdom<br />
        EC1V 2NX
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>1. Who We Are</h2>
      <p>Onyx Reelz ("we", "us", "our") is an AI-powered video creation and publishing platform accessible at onyx-reelz.com. This Privacy Policy explains how we collect, use, and protect your personal information when you use our services.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>2. Information We Collect</h2>
      <p>We collect the following types of information:</p>
      <ul style={{ paddingLeft: 24, marginTop: 8 }}>
        <li><strong>Account information:</strong> email address, password (encrypted), and profile details you provide at registration.</li>
        <li><strong>Content you create:</strong> video projects, scripts, narrations, and media files uploaded to the platform.</li>
        <li><strong>Social media tokens:</strong> OAuth access tokens for connected platforms (Instagram, TikTok, LinkedIn) used solely to publish content on your behalf.</li>
        <li><strong>Usage data:</strong> pages visited, features used, and actions taken within the platform to improve our service.</li>
        <li><strong>Payment information:</strong> processed securely by Stripe. We do not store card details.</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>3. How We Use Your Information</h2>
      <ul style={{ paddingLeft: 24, marginTop: 8 }}>
        <li>To provide and operate the Onyx Reelz platform and its features.</li>
        <li>To publish content to connected social media accounts when you explicitly request it.</li>
        <li>To process payments and manage your subscription.</li>
        <li>To send service-related emails (account confirmation, billing receipts).</li>
        <li>To improve our AI models and platform features using anonymised usage data.</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>4. Social Media Integrations</h2>
      <p>When you connect a social media account (Instagram, LinkedIn), we store an access token that allows us to publish content on your behalf. We only publish content when you explicitly initiate a publish action. We do not read your social media feed, contacts, or private messages. You can disconnect any social account at any time from your Account settings, which revokes our access.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>4a. TikTok</h2>
      <p>When you connect TikTok, we request the <code>user.info.basic</code>, <code>video.publish</code> and <code>video.upload</code> permissions. The only information we read from your TikTok account at connection time is your <code>open_id</code> — a unique account identifier. We do not read your profile information, follower data, or video list.</p>
      <p>We write to your TikTok account only when you explicitly publish a video through Onyx Reelz, including the caption text, hashtags, and your chosen privacy, duet, comment and stitch settings for that post.</p>
      <p>Your TikTok access token is stored securely and used only to publish content on your behalf when you choose to post. When you disconnect TikTok, we revoke your access token directly with TikTok's servers and delete our stored copy immediately — your token can no longer be used by us or anyone after disconnecting.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>5. Data Sharing</h2>
      <p>We do not sell your personal data. We share data only with:</p>
      <ul style={{ paddingLeft: 24, marginTop: 8 }}>
        <li><strong>Service providers:</strong> Supabase (database), Stripe (payments), HeyGen (avatar generation), ElevenLabs (voice synthesis), OpenAI, Anthropic, Luma AI, and Pexels — only as necessary to provide the service.</li>
        <li><strong>Social platforms:</strong> content and metadata you choose to publish.</li>
        <li><strong>Legal requirements:</strong> if required by law or to protect our rights.</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>6. Data Retention</h2>
      <p>We retain your account data for as long as your account is active. You may request deletion of your account and associated data by contacting us at support@onyx-reelz.com. Social media access tokens are deleted immediately when you disconnect a platform.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>7. Security</h2>
      <p>We use industry-standard security measures including encrypted connections (HTTPS), hashed passwords, and secure token storage. No method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>8. Your Rights</h2>
      <p>Depending on your location, you may have rights to access, correct, or delete your personal data. To exercise these rights, contact us at support@onyx-reelz.com.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>9. Cookies</h2>
      <p>We use essential cookies for authentication and session management. We do not use advertising or tracking cookies.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>10. Changes to This Policy</h2>
      <p>We may update this policy from time to time. We will notify you of significant changes by email or via a notice on the platform.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>11. Contact</h2>
      <p>For privacy-related questions, contact us at <a href="mailto:support@onyx-reelz.com" style={{ color: "#4dd0ff" }}>support@onyx-reelz.com</a>.</p>
      <p style={{ marginTop: 16, color: "#94a3b8", fontSize: 14, lineHeight: 1.6 }}>
        Onyx Reelz<br />
        128 City Road<br />
        London, United Kingdom<br />
        EC1V 2NX
      </p>
    </div>
  );
}
