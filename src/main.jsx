import React from "react";
import { createRoot } from "react-dom/client";
import Router from "./router.jsx";
import { CreditsProvider } from "./state/CreditsContext.jsx";
import "./styles.css";

const root = createRoot(document.getElementById("root"));

function App() {
  const [path, setPath] = React.useState(window.location.pathname);

  React.useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <CreditsProvider>
      <Router path={path} />
    </CreditsProvider>
  );
}

root.render(<App />);
