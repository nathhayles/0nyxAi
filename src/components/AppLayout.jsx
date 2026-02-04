export default function AppLayout({ active = "", children = "" }) {
  return `
    <div class="legacyScheduler">

      <nav class="schedulerTabs">
        <a href="/app" class="${active === "" ? "active" : ""}">Dashboard</a>
        <a href="/app/drafts" class="${active === "drafts" ? "active" : ""}">Projects</a>
        <a href="/app/brands" class="${active === "brands" ? "active" : ""}">Brands</a>
        <a href="/app/publish" class="${active === "publishing" ? "active" : ""}">Publish</a>
        <a href="/app/ai" class="${active === "ai" ? "active" : ""}">AI</a>
        <a href="/app/accounts" class="${active === "accounts" ? "active" : ""}">Accounts</a>
      </nav>

      <section class="schedulerContent">
        ${children}
      </section>

    </div>
  `;
}

export function bindLayoutHandlers() {
  // no legacy handlers needed
}
