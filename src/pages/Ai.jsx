import { setCurrent, upsertDraft } from "../store/appState.js";

export default function Ai() {
  return `
    <div class="page">
      <h1>AI Prompt</h1>
      <p class="hint">Generates a working draft payload you can open in the Editor + save in Drafts.</p>

      <label class="auth-label">Prompt</label>
      <textarea id="aiPrompt" class="auth-input" style="height:120px;resize:vertical" placeholder="Describe the video/post you want..."></textarea>

      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:12px">
        <button id="genBtn" class="btn primary">Generate draft</button>
        <button id="openEditorBtn" class="btn secondary">Open in Editor</button>
      </div>

      <div id="aiMsg" class="auth-msg" style="margin-top:12px"></div>
      <pre id="aiOut" style="margin-top:12px;white-space:pre-wrap;background:#11131a;border:1px solid #2a2f3a;border-radius:12px;padding:12px;min-height:120px"></pre>
    </div>
  `;
}

export function bindAiHandlers({ goEditor }) {
  const msg = document.getElementById("aiMsg");
  const out = document.getElementById("aiOut");
  const promptEl = document.getElementById("aiPrompt");

  const setMsg = (t) => (msg.textContent = t || "");

  document.getElementById("genBtn").onclick = () => {
    const prompt = (promptEl.value || "").trim();
    if (!prompt) {
      setMsg("Enter a prompt first.");
      return;
    }

    // Draft payload (MVP but real, portable across pages)
    const payload = {
      prompt,
      scenes: [
        { id: "s1", type: "text", text: "Hook: " + prompt.slice(0, 60) },
        { id: "s2", type: "broll", query: "stock video: " + prompt.split(" ").slice(0, 4).join(" ") },
        { id: "s3", type: "cta", text: "CTA: Follow for more." },
      ],
      timeline: { fps: 30, clips: [] },
      voiceover: { enabled: false, script: "" },
      assets: { images: [], videos: [] },
    };

    setCurrent(payload);
    const id = upsertDraft({ title: prompt.slice(0, 48) || "AI Draft", data: payload });
    setMsg("Draft generated + saved. Draft ID: " + id);
    out.textContent = JSON.stringify(payload, null, 2);
  };

  document.getElementById("openEditorBtn").onclick = () => goEditor();
}
