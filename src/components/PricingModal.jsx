export function PricingModal({ open, onClose }) {
  if (!open) return "";

  return `
    <div class="modalBackdrop" onclick="${onClose}">
      <div class="modalCard" onclick="event.stopPropagation()">
        <h2>Upgrade to export longer videos</h2>
        <p>
          You’re out of credits. Plans start at <b>$12/month</b> and remove watermarks.
        </p>
        <div class="modalActions">
          <button class="secondary" onclick="${onClose}">Close</button>
          <a href="/pricing" class="primary">View Plans</a>
        </div>
      </div>
    </div>
  `;
}
