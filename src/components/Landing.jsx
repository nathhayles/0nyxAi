export default function Landing() {
  return `
    <div class="landing">
      <header class="landing-header">
        <h1>Onyx Scheduler</h1>
        <p class="subtitle">
          Create, edit, and publish content faster with AI‑powered scheduling.
        </p>
        <div class="cta">
          <button id="getStarted" class="btn primary">Get Started</button>
          <button id="loginBtn" class="btn secondary">Login</button>
        </div>
      </header>

      <section class="features">
        <div class="feature">
          <h3>Fast</h3>
          <p>Generate and schedule content in seconds.</p>
        </div>
        <div class="feature">
          <h3>Focused</h3>
          <p>No bloat. Just the tools you actually need.</p>
        </div>
        <div class="feature">
          <h3>Scalable</h3>
          <p>Built to grow from solo creators to teams.</p>
        </div>
      </section>

      <footer class="landing-footer">
        <p>© ${new Date().getFullYear()} Onyx</p>
      </footer>
    </div>
  `;
}
