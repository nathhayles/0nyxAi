import { getCurrent } from "../store/appState.js";

export default function Publish() {
  return `
    <div class="page">
      <h1>Publishing</h1>
      <p class="hint">Reads the current doc/draft and simulates schedule/publish actions (wired to real data now).</p>

      <div style="background:#161922;border:1px solid #2a2f3a;border-radius:12px;padding:14px;margin-top:12px">
        <label class="auth-label">Schedule time</label>
        <input id="scheduleAt" class="auth-input" type="datetime-local" />

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
          <button id="scheduleBtn" class="btn primary">Schedule</button>
          <button id="publishBtn" class="btn secondary">Publish now</button>
        </div>

        <div id="pubMsg" class="auth-msg" style="margin-top:12px"></div>
      </div>

      <pre id="pubOut" style="margin-top:12px;white-space:pre-wrap;background:#11131a;border:1px solid #2a2f3a;border-radius:12px;padding:12px;min-height:160px"></pre>
    </div>
  `;
}

export function bindPublishHandlers() {
  const msg = document.getElementById("pubMsg");
  const out = document.getElementById("pubOut");
  const scheduleAt = document.getElementById("scheduleAt");
  const setMsg = (t) => (msg.textContent = t || "");

  const showPayload = (action, extra = {}) => {
    const cur = getCurrent() || {};
    const payload = {
      action,
      at: extra.at || null,
      draftId: cur.draftId || null,
      prompt: cur.prompt || "",
      scenesCount: Array.isArray(cur.scenes) ? cur.scenes.length : 0,
      voiceoverEnabled: !!cur.voiceover?.enabled,
      timestamp: new Date().toISOString(),
    };
    out.textContent = JSON.stringify(payload, null, 2);
  };

  document.getElementById("scheduleBtn").onclick = () => {
    const at = scheduleAt.value || null;
    if (!at) {
      setMsg("Pick a schedule time first.");
      return;
    }
    setMsg("Scheduled (local simulation).");
    showPayload("schedule", { at });
  };

  document.getElementById("publishBtn").onclick = () => {
    setMsg("Published (local simulation).");
    showPayload("publish_now");
  };

  showPayload("ready");
}
