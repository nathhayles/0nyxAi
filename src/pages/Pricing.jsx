export default function Pricing() {
  return `
    <div style="max-width:720px;margin:60px auto;padding:0 20px">
      <h1 style="font-size:36px;margin-bottom:10px">Simple pricing</h1>
      <p style="opacity:.8;margin-bottom:40px">
        Create and export AI‑assisted videos in minutes.
      </p>

      <div style="border:1px solid #1f2a44;border-radius:16px;padding:24px">
        <h2 style="font-size:28px;margin-bottom:6px">Creator</h2>
        <p style="opacity:.8;margin-bottom:20px">
          Everything you need to start.
        </p>

        <div style="font-size:42px;font-weight:900;margin-bottom:20px">
          $19<span style="font-size:16px;font-weight:400">/month</span>
        </div>

        <ul style="line-height:1.9;margin-bottom:30px">
          <li>✔ Unlimited projects</li>
          <li>✔ Scene‑based editor</li>
          <li>✔ Media upload</li>
          <li>✔ Video export</li>
        </ul>

        <button class="btnPrimary fullWidth">
          Start soon
        </button>
      </div>
    </div>
  `;
}
