import "../editor.css";
import {
  getBrands,
  updateBrand,
  addBrand,
  subscribeBrand
} from "../store/brandStore.js";

export default function BrandKits(){
  return `<div id="brandKits"></div>`;
}

export function bindBrandKits(){
  const root = document.getElementById("brandKits");

  function render(){
    root.innerHTML = `
      <h2>Brand Kits</h2>
      <button id="newBrand" class="btn">+ New Brand</button>

      ${getBrands().map(b => `
        <div class="brandCard">
          <input value="${b.name}" data-name="${b.id}" />

          <label>Primary Color</label>
          <input value="${b.colors.primary}" data-primary="${b.id}" />

          <label>Secondary Color</label>
          <input value="${b.colors.secondary}" data-secondary="${b.id}" />

          <label>Voices (comma separated)</label>
          <input value="${b.voices.join(", ")}" data-voices="${b.id}" />

          <label>Music (comma separated)</label>
          <input value="${b.music.join(", ")}" data-music="${b.id}" />
        </div>
      `).join("")}
    `;

    bind();
  }

  function bind(){
    document.getElementById("newBrand").onclick = addBrand;

    root.querySelectorAll("[data-name]").forEach(i =>
      i.oninput = e =>
        updateBrand(e.target.dataset.name, { name: e.target.value })
    );

    root.querySelectorAll("[data-primary]").forEach(i =>
      i.oninput = e =>
        updateBrand(e.target.dataset.primary, {
          colors:{ primary:e.target.value }
        })
    );

    root.querySelectorAll("[data-secondary]").forEach(i =>
      i.oninput = e =>
        updateBrand(e.target.dataset.secondary, {
          colors:{ secondary:e.target.value }
        })
    );

    root.querySelectorAll("[data-voices]").forEach(i =>
      i.oninput = e =>
        updateBrand(e.target.dataset.voices, {
          voices: e.target.value.split(",").map(v=>v.trim())
        })
    );

    root.querySelectorAll("[data-music]").forEach(i =>
      i.oninput = e =>
        updateBrand(e.target.dataset.music, {
          music: e.target.value.split(",").map(m=>m.trim())
        })
    );
  }

  subscribeBrand(render);
  render();
}
