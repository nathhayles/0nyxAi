import { useState } from "react";

export function useExportProgress() {
  const [progress, setProgress] = useState(0);

  return {
    progress,
    start: () => setProgress(10),
    tick: (v) => setProgress(v),
    finish: () => setProgress(100),
    reset: () => setProgress(0),
  };
}
