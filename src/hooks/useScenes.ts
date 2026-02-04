import { useEffect, useState } from "react";

const API_URL = "http://localhost:3000";

export interface Scene {
  id: string;
  status: "ready" | "regenerating";
  updated_at?: string;
}

export function useScenes() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchScenes() {
    const res = await fetch(`${API_URL}/api/scenes`);
    if (!res.ok) {
      throw new Error("Failed to fetch scenes");
    }
    const data = await res.json();
    setScenes(data);
  }

  async function regenerate(sceneId: string) {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sceneId })
      });

      if (!res.ok) {
        throw new Error("Regenerate failed");
      }
    } finally {
      // ALWAYS sync UI from DB truth
      await fetchScenes();
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchScenes();
  }, []);

  return {
    scenes,
    regenerate,
    loading
  };
}

