import "../styles/appHeader.css";

export default function AppHeader() {
  return `
    <header class="appHeader">
      <div class="appHeaderLeft">
        <span class="appLogo">Onyx</span>
      </div>
      <nav class="appHeaderRight">
        <button class="appNavBtn" type="button">Dashboard</button>
        <button class="appNavBtn" type="button">Projects</button>
        <button class="appNavBtn" type="button">Settings</button>
      </nav>
    </header>
  `;
}
