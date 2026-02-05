import EditorPage from "./pages/Editor.jsx";
import React from "react";
import TopBar from "./components/TopBar.jsx";
import Editor from "./pages/Editor.jsx";
import Pricing from "./pages/Pricing.jsx";
import SchedulerPage from "./pages/SchedulerPage.jsx";
import ProjectsPage from "./pages/ProjectsPage.jsx";

function Landing() {
  return (
    <div className="pageCenter">
      <h1 style={{ fontSize: 48, marginBottom: 12 }}>Create videos fast.</h1>
      <p style={{ opacity: 0.8, fontSize: 18, marginBottom: 32 }}>
        Scene-based AI video editor. Simple. Fast. Built to ship.
      </p>
      <a href="/app/editor" className="btnPrimary">Open Editor</a>
    </div>
  );
}

export default function Router({ path }) {
  let page;

  if (path === "/pricing") page = <Pricing />;
  else if (path === "/projects") page = <ProjectsPage />;
  else if (path === "/scheduler") page = <SchedulerPage />;
  else if (path.startsWith("/app/editor")) page = <EditorPage />;
  else page = <Landing />;

  return (
    <>
      <TopBar />
      <main className="appMain">
        {page}
      </main>
    </>
  );
}
