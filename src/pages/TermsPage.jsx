import SEO from "../components/SEO";

export default function TermsPage() {
  return (
    <div className="page" style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px", color: "#e2e8f0", fontFamily: "sans-serif", lineHeight: 1.7 }}>
      <SEO
        title="Terms of Service"
        description="Terms of Service for Onyx Reelz, covering account usage, payments, subscriptions, content ownership, and acceptable use."
        path="/terms"
      />
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Terms of Service</h1>
      <p style={{ color: "#64748b", marginBottom: 8 }}>Last updated: June 9, 2026</p>
      <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.6, marginBottom: 40 }}>
        Onyx Reelz<br />
        128 City Road<br />
        London, United Kingdom<br />
        EC1V 2NX
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>1. Acceptance of Terms</h2>
      <p>By accessing or using Onyx Reelz ("the platform", "we", "us", "our") at onyx-reelz.com, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the platform. These terms apply to all users including visitors, registered users, and subscribers.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>2. Use of Service</h2>
      <p>Onyx Reelz grants you a limited, non-exclusive, non-transferable licence to access and use the platform for your personal or business content creation purposes. You agree to:</p>
      <ul style={{ paddingLeft: 24, marginTop: 8 }}>
        <li>Provide accurate information when creating your account.</li>
        <li>Keep your login credentials secure and not share them with others.</li>
        <li>Use the platform only for lawful purposes and in accordance with these terms.</li>
        <li>Comply with all applicable local, national, and international laws and regulations.</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>3. User Content &amp; Responsibility</h2>
      <p>You retain ownership of all content you create, upload, or publish using Onyx Reelz. By using the platform, you grant us a limited licence to store and process your content solely to provide the service. You are solely responsible for:</p>
      <ul style={{ paddingLeft: 24, marginTop: 8 }}>
        <li>Ensuring you have all necessary rights, licences, and permissions for any scripts, images, audio, video, or other media you upload or incorporate into your content.</li>
        <li>All content — whether uploaded, AI-generated, or produced using platform tools — that you publish to social media platforms through Onyx Reelz.</li>
        <li>Compliance with the terms of service of any connected social media platform (Instagram, TikTok, LinkedIn, YouTube).</li>
        <li>Ensuring your content does not infringe any third-party intellectual property, privacy, or personality rights.</li>
        <li>Any consequences, claims, or liabilities arising from content you create or publish using the platform.</li>
      </ul>
      <p style={{ marginTop: 12 }}>We do not review content before it is published. We are not responsible for and do not endorse any content created or distributed by users.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>4. Payment and Credits</h2>
      <p>Certain features of Onyx Reelz require a paid subscription or the purchase of credits. By subscribing or purchasing credits, you agree to the following:</p>
      <ul style={{ paddingLeft: 24, marginTop: 8 }}>
        <li>All payments are processed securely by Stripe. We do not store your card details.</li>
        <li>Subscription fees are billed on a recurring basis (monthly or annually) and are non-refundable except where required by law.</li>
        <li>Credits are non-refundable and non-transferable once purchased.</li>
        <li>We reserve the right to change our pricing at any time with reasonable notice to existing subscribers.</li>
        <li>Downgrades or cancellations take effect at the end of the current billing period.</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>5. Prohibited Content</h2>
      <p>You may not use Onyx Reelz to create, upload, store, distribute, or publish content that:</p>
      <ul style={{ paddingLeft: 24, marginTop: 8 }}>
        <li><strong>Is illegal</strong> under any applicable law or regulation, including content that promotes, facilitates, or depicts criminal activity.</li>
        <li><strong>Sexually exploits minors (CSAM)</strong> — any content that depicts, promotes, or sexualises individuals under the age of 18 is strictly prohibited and will be reported to the National Center for Missing &amp; Exploited Children (NCMEC) and relevant law enforcement authorities.</li>
        <li><strong>Constitutes a deepfake or non-consensual synthetic media</strong> — you may not create or distribute AI-generated or digitally manipulated video, audio, or images that realistically depict a real person without their informed, documented consent, particularly for sexual, defamatory, or deceptive purposes.</li>
        <li><strong>Is defamatory</strong> — you may not publish false statements of fact that damage the reputation of any individual, company, or organisation.</li>
        <li><strong>Impersonates</strong> any real person, brand, or entity in a manner that is deceptive, harmful, or misleading, including the use of AI voice or likeness cloning without consent.</li>
        <li><strong>Infringes intellectual property rights</strong> — including content that violates copyright, trademark, or other proprietary rights of third parties.</li>
        <li><strong>Is harassing, hateful, or threatening</strong> toward any individual or group based on protected characteristics.</li>
        <li>Generates spam, coordinated inauthentic behaviour, or manipulative content intended to deceive audiences on social media platforms.</li>
        <li>Involves automated scraping, data mining, or systematic extraction of platform content.</li>
        <li>Attempts to gain unauthorised access to the platform, its servers, or related systems.</li>
        <li>Is resold, sublicenced, or commercially exploited without our written consent.</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>6. DMCA Takedown Process</h2>
      <p>Onyx Reelz respects intellectual property rights and complies with the Digital Millennium Copyright Act (DMCA) and equivalent legislation in other jurisdictions. If you believe that content on or published through our platform infringes your copyright, please submit a written notice to our designated agent containing:</p>
      <ul style={{ paddingLeft: 24, marginTop: 8 }}>
        <li>Your full legal name and contact information (address, phone number, email).</li>
        <li>A description of the copyrighted work you claim has been infringed.</li>
        <li>A description of the infringing material and information sufficient for us to locate it.</li>
        <li>A statement that you have a good-faith belief that the use is not authorised by the copyright owner, its agent, or the law.</li>
        <li>A statement, made under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorised to act on their behalf.</li>
        <li>Your physical or electronic signature.</li>
      </ul>
      <p style={{ marginTop: 12 }}>Send DMCA notices to: <a href="mailto:dmca@onyx-reelz.com" style={{ color: "#4dd0ff" }}>dmca@onyx-reelz.com</a></p>
      <p style={{ marginTop: 8 }}>We will investigate valid notices and take appropriate action, which may include removing or disabling access to the content and terminating the accounts of repeat infringers. Counter-notices may be submitted in accordance with the DMCA process.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>7. Account Termination for Violations</h2>
      <p>We reserve the right to suspend or permanently terminate your account at any time, with or without prior notice, if we determine that you have:</p>
      <ul style={{ paddingLeft: 24, marginTop: 8 }}>
        <li>Violated any provision of these Terms of Service, including the Prohibited Content policy above.</li>
        <li>Created, distributed, or published CSAM, deepfake content, or other seriously harmful material.</li>
        <li>Infringed the intellectual property rights of others on multiple occasions (repeat infringer policy).</li>
        <li>Engaged in fraud, deception, or misrepresentation in connection with your use of the platform.</li>
        <li>Posed a risk to the safety, security, or integrity of the platform or its users.</li>
      </ul>
      <p style={{ marginTop: 12 }}>Termination for violations is effective immediately. You will lose access to your account, all stored content, and any unused credits or subscription benefits. No refunds will be issued for terminations resulting from violations of these terms. We may also report your conduct to law enforcement where required by law or where we determine it is appropriate.</p>
      <p style={{ marginTop: 8 }}>You may cancel your account at any time from your Account settings. Upon voluntary cancellation, your access will cease at the end of the current billing period and your data will be handled in accordance with our Privacy Policy.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>8. AI-Generated Content Disclosure Obligations</h2>
      <p>When you use AI-powered features on Onyx Reelz to generate scripts, voiceovers, images, video, or other content, you acknowledge and agree to the following:</p>
      <ul style={{ paddingLeft: 24, marginTop: 8 }}>
        <li><strong>Platform disclosure:</strong> Onyx Reelz uses artificial intelligence to assist in content creation. AI-generated outputs may contain inaccuracies, biases, or unintended results. You are responsible for reviewing all AI-generated content before publishing.</li>
        <li><strong>Legal compliance:</strong> Certain jurisdictions and platforms require disclosure when content is substantially AI-generated. You are responsible for ensuring your published content complies with applicable laws (including the EU AI Act and any relevant national legislation) and the policies of connected social media platforms.</li>
        <li><strong>Audience transparency:</strong> Where legally required or where the nature of the content could mislead audiences (e.g., AI-generated news, synthetic voices, or digital likenesses), you must include appropriate disclosures in your content or captions.</li>
        <li><strong>No misrepresentation:</strong> You may not use AI-generated content to falsely claim human authorship in contexts where such misrepresentation is deceptive or prohibited.</li>
        <li><strong>AI voices and likenesses:</strong> If you use AI to replicate a specific person's voice or likeness, you must have obtained that person's explicit, documented consent prior to publication.</li>
      </ul>
      <p style={{ marginTop: 12 }}>Onyx Reelz accepts no liability for consequences arising from your failure to disclose AI-generated content as required by applicable law or platform rules.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>9. Disclaimer of Warranties</h2>
      <p>Onyx Reelz is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not warrant that the platform will be uninterrupted, error-free, or free from harmful components. AI-generated content is provided without guarantees of accuracy, originality, or fitness for any particular purpose. You use the platform at your own risk.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>10. Limitation of Liability</h2>
      <p>To the fullest extent permitted by law, Onyx Reelz and its directors, employees, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the platform. This includes but is not limited to loss of revenue, loss of data, reputational damage, or costs arising from the publication of content to social media platforms. Our total liability to you for any claims arising under these terms shall not exceed the amount you paid to us in the three months preceding the claim.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>11. Changes to Terms</h2>
      <p>We may update these Terms of Service from time to time. We will notify you of material changes by email or via a notice on the platform. Your continued use of Onyx Reelz after changes are posted constitutes your acceptance of the revised terms.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>12. Contact</h2>
      <p>For questions about these Terms of Service, contact us at <a href="mailto:support@onyx-reelz.com" style={{ color: "#4dd0ff" }}>support@onyx-reelz.com</a>.</p>
      <p style={{ marginTop: 8 }}>For DMCA takedown notices, contact: <a href="mailto:dmca@onyx-reelz.com" style={{ color: "#4dd0ff" }}>dmca@onyx-reelz.com</a>.</p>
      <p style={{ marginTop: 16, color: "#94a3b8", fontSize: 14, lineHeight: 1.6 }}>
        Onyx Reelz<br />
        128 City Road<br />
        London, United Kingdom<br />
        EC1V 2NX
      </p>
    </div>
  );
}
