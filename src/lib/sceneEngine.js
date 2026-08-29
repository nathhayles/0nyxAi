function generateSceneId(index) {
  return `scene_${index + 1}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function themeStyle(theme = 'cinematic') {
  const styles = {
    cinematic: 'cinematic lighting, dramatic, high detail',
    luxury: 'luxury lifestyle visuals, polished, elegant',
    dark: 'dark moody atmosphere, contrast, shadows',
    motivational: 'uplifting energetic visuals, inspiring tone',
    documentary: 'documentary realism, natural detail',
    business: 'professional business setting, clean visuals',
    viral: 'short-form social media style, engaging composition',
    minimal: 'clean minimal composition',
    travel: 'travel lifestyle imagery, scenic visuals',
    realestate: 'modern property showcase, polished interiors',
  };
  return styles[theme] || styles.cinematic;
}

// Primary path: build scenes from GPT-4o semantic analysis output
export function buildScenesFromAnalysis(analysisScenes = [], theme = 'cinematic') {
  const now = new Date().toISOString();
  return analysisScenes.map((scene, index) => {
    const wordCount = (scene.narration || '').split(/\s+/).filter(Boolean).length;
    const calculatedDuration = Math.ceil(wordCount / 2.17);
    return {
      id: generateSceneId(index),
      narration: scene.narration || '',
      action: scene.visual_direction || scene.stock_query || scene.narration || '',
      stockQuery: scene.stock_query || '',
      duration: Math.max(3, Math.min(calculatedDuration, 15)),
      mood: scene.mood || '',
      pacing: scene.pacing || 'medium',
      mediaUrl: null,
      mediaType: null,
      generatedAt: now,
      mode: 'ai',
      voiceover: null,
      savedAt: null,
      isAiGenerated: false,
      thumbnail: null,
      transitionToNext: 'cut',
      transitionDirection: null,
      speakers: scene.speakers || [],
    };
  });
}

// Fallback: simple word-count splitter for when GPT analysis is unavailable
export function buildScenesFromScript(script = '', theme = 'cinematic') {
  const normalized = script.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n{2,}/).filter(Boolean);
  const sentences = [];
  for (const para of paragraphs) {
    const parts = para.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [para];
    sentences.push(...parts.map(s => s.trim()).filter(Boolean));
  }

  const scenes = [];
  let current = [], wc = 0;
  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).length;
    if (wc + words > 24 && current.length) {
      scenes.push(current.join(' '));
      current = [sentence];
      wc = words;
    } else {
      current.push(sentence);
      wc += words;
    }
  }
  if (current.length) scenes.push(current.join(' '));

  const now = new Date().toISOString();
  return scenes.filter(Boolean).map((narration, index) => ({
    id: generateSceneId(index),
    narration,
    action: `${narration.replace(/[.!?]/g, '').trim()}, ${themeStyle(theme)}`,
    stockQuery: narration.split(' ').slice(0, 5).join(' '),
    duration: Math.max(3, Math.ceil(narration.split(/\s+/).length / 2.2)),
    mediaUrl: null,
    mediaType: null,
    generatedAt: now,
    mode: 'ai',
    voiceover: null,
    savedAt: null,
    isAiGenerated: false,
    thumbnail: null,
    transitionToNext: 'cut',
    transitionDirection: null,
  }));
}
