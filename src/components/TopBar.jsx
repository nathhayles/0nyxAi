export default function TopBar() {
  return `
    <header class="topBar">
      <nav class="topNav">
        <a href="/" data-link>Home</a>
        <a href="/editor" data-link>Editor</a>
        <a href="/app" data-link>Scheduler</a>
        <a href="/projects" data-link>Projects</a>
        <a href="/affiliate" data-link>Affiliate</a>
        <a href="/pricing" data-link>Pricing</a>
        <a href="/earn" data-link>Earn</a>
        <a href="/admin" data-link>Admin</a>
      </nav>

      <div class="topActions">
        <span class="credits">Credits: 120</span>
      </div>
    </header>
  `;
}
