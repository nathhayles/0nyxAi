let stylesByScene = {};

export function getTextStyle(sceneId){
  return stylesByScene[sceneId] || {
    fontSize: 36,
    color: "#ffffff",
    align: "center"
  };
}

export function updateTextStyle(sceneId, patch){
  stylesByScene[sceneId] = {
    ...getTextStyle(sceneId),
    ...patch
  };
}

export function applyStyleToAllScenes(scenes, style){
  scenes.forEach(scene => {
    stylesByScene[scene.id] = {
      ...getTextStyle(scene.id),
      ...style
    };
  });
}
