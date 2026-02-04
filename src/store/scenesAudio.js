let listeners = [];

export function setSceneVoiceover(sceneId, voiceSrc) {
  const scenes = window.__scenes || [];
  const s = scenes.find(x => x.id === sceneId);
  if (s) s.voiceover = voiceSrc;
  notify();
}

export function setSceneMusic(sceneId, musicSrc) {
  const scenes = window.__scenes || [];
  const s = scenes.find(x => x.id === sceneId);
  if (s) s.music = musicSrc;
  notify();
}

function notify() {
  listeners.forEach(fn => fn());
}

export function subscribeSceneAudio(fn) {
  listeners.push(fn);
}
