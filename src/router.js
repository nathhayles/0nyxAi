import AppLayout, { bindLayoutHandlers } from "./components/AppLayout.jsx";

import Drafts from "./pages/Drafts.jsx";
import Publishing from "./pages/Publishing.jsx";
import Brands from "./pages/Brands.jsx";
import AI from "./pages/Ai.jsx";
import Accounts from "./pages/Accounts.jsx";

function renderPage(html) {
  const view = document.getElementById("view");
  if (!view) return;

  view.innerHTML = html;
  bindLayoutHandlers();
}

export function renderRouter() {
  const path = window.location.pathname || "/app";

  if (path === "/app" || path === "/app/") {
    renderPage(
      AppLayout({
        active: "",
        children: `
          <div style="padding:18px">
            <a href="/editor">Open Editor</a>
          </div>
        `
      })
    );
    return;
  }

  if (path === "/app/drafts") {
    renderPage(
      AppLayout({ active: "drafts", children: Drafts() })
    );
    return;
  }

  if (path === "/app/brands") {
    renderPage(AppLayout({ active: "brands", children: Brands() }));
    return;
  }

  if (path === "/app/publish") {
    renderPage(AppLayout({ active: "publishing", children: Publishing() }));
    return;
  }

  if (path === "/app/ai") {
    renderPage(AppLayout({ active: "ai", children: AI() }));
    return;
  }

  if (path === "/app/accounts") {
    renderPage(AppLayout({ active: "accounts", children: Accounts() }));
    return;
  }

  renderPage(
    AppLayout({ active: "", children: "<p>Not found</p>" })
  );
}
