import { getAuthHeaders } from "./auth.js";

// Shared by Create.jsx (initial multi-scene pipeline submission) and
// EditorV2.jsx (blank-reel-started, scene-by-scene via the Storyboard
// panel) -- both need the exact same /api/analyse/title call with the same
// failure visibility. Previously each silent failure mode (401 from
// requireAuth, 403 from requireSubscription, 500 from OpenAI, a thrown
// network error, or a 200 with no title in the body) collapsed identically
// into "Untitled Reel" with zero trace on either end. Caller is responsible
// for checking it has non-empty prompt text before calling -- that check
// differs meaningfully between the two call sites (Create.jsx checks a
// finished scenes[0] once; EditorV2.jsx checks it reactively as scenes
// change), so it isn't folded in here.
export async function generateReelTitle(prompt, logPrefix) {
  try {
    const headers = await getAuthHeaders();
    if (!headers.Authorization) {
      console.warn(`${logPrefix} no access_token available -- /api/analyse/title will 401`);
    }
    const tr = await fetch("/api/analyse/title", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ prompt }),
    });
    if (!tr.ok) {
      const errBody = await tr.text().catch(() => "<unreadable>");
      console.error(`${logPrefix} /api/analyse/title returned ${tr.status}:`, errBody);
      return null;
    }
    const td = await tr.json();
    if (td.title) return td.title;
    console.error(`${logPrefix} /api/analyse/title returned 200 with no title:`, td);
    return null;
  } catch (err) {
    console.error(`${logPrefix} threw while generating title:`, err);
    return null;
  }
}
