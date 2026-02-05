import { useState } from "react";

export function useExportUx() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  return {
    exporting,
    error,
    start: () => {
      setError("");
      setExporting(true);
    },
    fail: (msg) => {
      setExporting(false);
      setError(msg);
    },
    finish: () => {
      setExporting(false);
    },
  };
}
