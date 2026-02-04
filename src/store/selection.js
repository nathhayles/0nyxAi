let selectedSceneId = null;
const subs = new Set();

function notify(){ subs.forEach(fn=>{ try{fn();}catch(_){}}); }

export function getSelectedScene(){ return selectedSceneId; }

export function setSelectedScene(id){
  selectedSceneId = id;
  notify();
}

export function subscribeSelection(fn){
  subs.add(fn);
  return () => subs.delete(fn);
}
