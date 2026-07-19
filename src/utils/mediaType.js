export function extOf(nameOrUrl = "") {
  const clean = String(nameOrUrl).split("?")[0].split("#")[0];
  const parts = clean.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

export function isVideo(nameOrUrl = "") {
  const ext = extOf(nameOrUrl);
  return ["mp4", "webm", "mov", "m4v"].includes(ext);
}

export function isImage(nameOrUrl = "") {
  const ext = extOf(nameOrUrl);
  return ["png", "jpg", "jpeg", "gif", "webp", "apng"].includes(ext);
}

export function isAudio(nameOrUrl = "") {
  const ext = extOf(nameOrUrl);
  return ["mp3", "wav", "m4a", "ogg", "aac", "flac"].includes(ext);
}

export function isVideoFile(file) {
  return file.type.startsWith("video/") || isVideo(file.name || "");
}

export function isAudioFile(file) {
  return file.type.startsWith("audio/") || isAudio(file.name || "");
}

// Three-bucket detection: video takes priority over audio, audio over image/else.
export function bucketFilesByAssetType(files) {
  const videoFiles = files.filter(isVideoFile);
  const audioFiles = files.filter((f) => !isVideoFile(f) && isAudioFile(f));
  const imageFiles = files.filter((f) => !isVideoFile(f) && !isAudioFile(f));
  return [
    [videoFiles, "video"],
    [audioFiles, "music"],
    [imageFiles, "image"],
  ];
}
