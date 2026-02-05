import React from "react";
import { useCredits } from "../state/CreditsContext.jsx";

export default function TopBar() {
  const { credits } = useCredits();

  return (
    <header className="topBar">
      <div className="topBarLeft">
        <a href="/" className="logo">Onyx</a>
        <nav>
          <a href="/pricing">Pricing</a>
          <a href="/projects">Projects</a>
          <a href="/scheduler">Scheduler</a>
        </nav>
      </div>
      <div
        className="topBarRight"
        title="1 credit = 1 second of video"
      >
        Credits: <b>{credits}</b>
      </div>
    </header>
  );
}
