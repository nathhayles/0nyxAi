export function TransitionMenu(current, onSelect) {
  const options = ["none", "fade", "slide"];

  return `
    <div class="transitionMenu">
      ${options.map(o => `
        <button data-val="${o}" class="${o===current?"active":""}">
          ${o}
        </button>
      `).join("")}
    </div>
  `;
}

export function bindTransitionMenu(root, cb) {
  root.querySelectorAll("[data-val]").forEach(b=>{
    b.onclick = () => cb(b.dataset.val);
  });
}
