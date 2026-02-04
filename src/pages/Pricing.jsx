export default function Pricing() {
  return `
    <div class="pageCenter">
      <h1 style="font-size:42px;margin-bottom:16px">Pricing</h1>
      <p style="opacity:.8;margin-bottom:32px">
        Simple usage‑based pricing. No subscriptions. Pay only for what you render.
      </p>

      <div style="display:flex;gap:24px;flex-wrap:wrap">
        <div style="flex:1;min-width:260px;padding:24px;border-radius:16px;background:rgba(255,255,255,.04)">
          <h3>Free</h3>
          <p style="opacity:.8">Try the editor</p>
          <ul style="opacity:.85">
            <li>Editor access</li>
            <li>Watermarked exports</li>
          </ul>
        </div>

        <div style="flex:1;min-width:260px;padding:24px;border-radius:16px;background:rgba(43,60,255,.15);border:1px solid #2b3cff">
          <h3>Credits</h3>
          <p style="opacity:.9">Pay per render</p>
          <ul style="opacity:.9">
            <li>No subscription</li>
            <li>HD exports</li>
            <li>Commercial use</li>
          </ul>
          <a href="/app/editor" class="btnPrimary" style="margin-top:16px;display:inline-block">
            Open Editor
          </a>
        </div>
      </div>
    </div>
  `;
}
