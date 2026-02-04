let voiceovers = [
  { id: "v1", name: "Standard Male", tier: "free", src: "/audio/voice1.mp3" },
  { id: "v2", name: "Standard Female", tier: "free", src: "/audio/voice2.mp3" },
  { id: "v3", name: "Pro Narrator", tier: "premium", src: "/audio/voice3.mp3" }
];

let music = [
  { id: "m1", name: "Ambient 1", src: "/audio/music1.mp3" },
  { id: "m2", name: "Corporate 1", src: "/audio/music2.mp3" }
];

let uploads = [];
let listeners = [];

function notify() {
  listeners.forEach(fn => fn());
}

export function getVoiceovers() {
  return voiceovers;
}

export function getMusic() {
  return music;
}

export function getAudioUploads() {
  return uploads;
}

export function addAudioUpload(file) {
  const url = URL.createObjectURL(file);
  uploads.push({
    id: crypto.randomUUID(),
    name: file.name,
    src: url
  });
  notify();
}

export function subscribeAudio(fn) {
  listeners.push(fn);
}
