import React, { useEffect, useState } from "react";
import { routes } from "../app/routes.jsx";

function normalizePath(pathname = "/") {
  if (!pathname) return "/";
  const clean = pathname.replace(/\/+$/, "");
  return clean === "" ? "/" : clean;
}

export default function App() {
  const [path, setPath] = useState(normalizePath(window.location.pathname));

  useEffect(() => {
    const onPopState = () => setPath(normalizePath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const Page = routes[path] || routes["/"];
  return <Page />;
}
