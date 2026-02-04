export default function Drafts() {
  const drafts = JSON.parse(localStorage.getItem("drafts") || "[]");

  return `
    <h1>Drafts</h1>
    <p>These are persisted locally (localStorage) so you can test full flow end‑to‑end.</p>

    <div class="draftList">
      ${drafts.map(d => `
        <div
          class="draftCard"
          style="cursor:pointer;padding:12px;border:1px solid #ccc;margin:8px 0;"
          onclick="(function(){
            localStorage.setItem('activeDraftId','${d.id}');
            window.location.href='/editor';
          })()"
        >
          <strong>${d.title || "Untitled Draft"}</strong>
        </div>
      `).join("")}
    </div>
  `;
}
