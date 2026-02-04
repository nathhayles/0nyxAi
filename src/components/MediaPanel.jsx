const STOCK_MEDIA = [
  { type: "image", src: "/stock/forest.jpg", label: "Forest" },
  { type: "image", src: "/stock/mountains.jpg", label: "Mountains" },
  { type: "image", src: "/stock/ocean.jpg", label: "Ocean" },
  { type: "image", src: "/stock/city.jpg", label: "City" }
];

let uploads = [];

export function MediaPanel(tab = "stock") {
  if (tab === "uploads") {
    return `
      <input type="file" id="mediaUpload" accept="image/*,video/*" multiple />
      <div class="mediaGrid">
        ${uploads.map(renderItem).join("")}
      </div>
    `;
  }

  return `
    <input class="searchInput" placeholder="Search stock..." />
    <div class="mediaGrid">
      ${STOCK_MEDIA.map(renderItem).join("")}
    </div>
  `;
}

export function bindMediaPanel() {
  const input = document.getElementById("mediaUpload");
  if (!input) return;

  input.onchange = () => {
    [...input.files].forEach(file => {
      uploads.push({
        type: file.type.startsWith("video") ? "video" : "image",
        src: URL.createObjectURL(file),
        label: file.name
      });
    });
    document.dispatchEvent(new Event("media:update"));
  };
}

function renderItem(item) {
  return `
    <div class="mediaThumb" draggable="true"
      ondragstart="event.dataTransfer.setData('text/plain','${item.src}')">
      ${
        item.type === "video"
          ? `<video src="${item.src}" muted></video>`
          : `<img src="${item.src}" />`
      }
      <span>${item.label}</span>
    </div>
  `;
}
