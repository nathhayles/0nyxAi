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

/* ----------------------------
   MEDIA CARD FIX
   Adds:
   - correct image/video preview
   - video duration badge
   - consistent card sizing
----------------------------- */

function MediaCard({ item, onSelect }) {
  const [duration, setDuration] = React.useState(null)

  const src = item.src || item.url || item.mediaUrl
  const thumb = item.thumbnail || src

  const isVideo =
    item.type === "video" ||
    item.mediaType === "video" ||
    (src && src.match(/\.mp4|\.webm|\.mov/i))

  return (
    <div
      className="media-card"
      draggable
      onDragStart={(e) =>
        e.dataTransfer.setData("application/json", JSON.stringify(item))
      }
      onClick={() => onSelect(item)}
      style={{
        width: "100%",
        height: 120,
        borderRadius: 8,
        overflow: "hidden",
        position: "relative",
        cursor: "pointer"
      }}
    >
      {isVideo ? (
        <video
          src={src}
          muted
          preload="metadata" playsInline
          onLoadedMetadata={(e) =>
            setDuration(Math.floor(e.target.duration))
          }
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover", width: "100%", height: "100%"
          }}
        />
      ) : (
        <img
          src={thumb}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover", width: "100%", height: "100%"
          }}
        />
      )}

      {isVideo && duration && (
        <div
          style={{
            position: "absolute",
            bottom: 6,
            right: 6,
            background: "rgba(0,0,0,0.75)",
            color: "#fff",
            fontSize: 11,
            padding: "2px 6px",
            borderRadius: 4
          }}
        >
          {formatDuration(duration)}
          {(duration % 60).toString().padStart(2, "0")}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          bottom: 6,
          left: 6,
          background: "rgba(0,0,0,0.65)",
          fontSize: 10,
          padding: "2px 6px",
          borderRadius: 4
        }}
      >
        {isVideo ? "VIDEO" : "IMAGE"}
      </div>
    </div>
  )
}


function formatDuration(seconds){
  if(!seconds) return null
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return m + ":" + s.toString().padStart(2,"0")
}

