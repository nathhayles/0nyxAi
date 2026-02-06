export function mountSceneStrip() {
  const bar = document.querySelector(".editorScenes");
  if (!bar) return;

  bar.innerHTML = "";

  for (let i = 1; i <= 3; i++) {
    const btn = document.createElement("button");
    btn.className = "sceneBtn";
    btn.textContent = `Scene ${i}`;
    btn.dataset.sceneId = i;

    btn.onclick = () => {
      document.querySelectorAll(".sceneBtn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      window.setActiveScene?.(i);
    };

    if (i === 1) btn.classList.add("active");
    bar.appendChild(btn);
  }
}
