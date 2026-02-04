export default function Pricing() {
  return `
    <div class="pricing">
      <h1>Pricing</h1>
      <p>Starter, Pro, and Agency plans.</p>

      <div class="grid">
        <div class="card">
          <h3>Starter</h3>
          <p class="price">$9 / mo</p>
        </div>
        <div class="card">
          <h3>Pro</h3>
          <p class="price">$29 / mo</p>
        </div>
        <div class="card">
          <h3>Agency</h3>
          <p class="price">$99 / mo</p>
        </div>
      </div>

      <button id="backHomeBtn" class="btn secondary">Back</button>
    </div>
  `;
}

export function bindPricingHandlers({ goHome }) {
  const btn = document.getElementById("backHomeBtn");
  if (btn) btn.onclick = goHome;
}
