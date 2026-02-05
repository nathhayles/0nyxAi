import { useState } from "react";

export function useToast() {
  const [toast, setToast] = useState(null);

  return {
    toast,
    show: (message, type = "info") => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
    },
    clear: () => setToast(null),
  };
}
