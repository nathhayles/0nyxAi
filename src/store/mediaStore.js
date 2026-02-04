let media = [];
const subs = new Set();

function notify(){ subs.forEach(fn=>{ try{fn();}catch(_){}}); }

export function subscribeMedia(fn){ subs.add(fn); return () => subs.delete(fn); }
export function getMedia(){ return media; }

function makeId(){ return "m_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2); }
function isVideo(file){ return (file?.type||"").startsWith("video/"); }
function isImage(file){ return (file?.type||"").startsWith("image/"); }

function loadVideoDuration(src, id){
  const v = document.createElement("video");
  v.preload = "metadata";
  v.src = src;
  v.onloadedmetadata = () => {
    const d = Number(v.duration);
    if (Number.isFinite(d) && d > 0) {
      media = media.map(m => m.id===id ? { ...m, duration: d } : m);
      notify();
    }
  };
  v.onerror = () => {};
}

export function addMedia(file){
  if (!file) return;
  const src = URL.createObjectURL(file);

  const item = {
    id: makeId(),
    name: file.name || "media",
    src,
    type: file.type || "",
    isVideo: isVideo(file),
    isImage: isImage(file),
    duration: null
  };

  media = [item, ...media];
  notify();

  if (item.isVideo) loadVideoDuration(src, item.id);
}
