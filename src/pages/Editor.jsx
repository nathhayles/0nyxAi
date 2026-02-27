import React, { useEffect, useMemo, useRef, useState } from "react";
import SceneStrip from "../components/SceneStrip.jsx";
import StoryboardPanel from "../components/StoryboardPanel.jsx";
import VisualsPanel from "../components/VisualsPanel.jsx";
import AudioPanel from "../components/AudioPanel.jsx";
import ModalPrompt from "../components/ModalPrompt.jsx";
import "../styles/editor.css";

const AUTOSAVE_KEY = "onyx_editor_autosave_v2";
const AI_STUDIO_LIBRARY_KEY = "onyx_ai_studio_library_v1";

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function safeJsonParse(raw, fallback) {
  try {
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch (_) {
    return fallback;
  }
}

export default function Editor() {
  const [activeMenu, setActiveMenu] = useState("storyboard");

  const [visualsTab, setVisualsTab] = useState("uploads"); // uploads | stock | aistudio
  const [audioTab, setAudioTab] = useState("voiceovers"); // voiceovers | music | uploads

  const [ratio, setRatio] = useState("16:9");
  const [title, setTitle] = useState("Untitled Project");

  const [voiceoverVolume, setVoiceoverVolume] = useState(100);
  const [musicVolume, setMusicVolume] = useState(60);

  const [scenes, setScenes] = useState([
    {
      id: 1,
      narration: "",
      action: "",
      mode: "ai",
      savedAt: null,
      generatedAt: null,
      isAiGenerated: false,
      thumbnail: null, // dataURL or null
      transitionToNext: "cut", // cut|fade|slide|zoom
    },
  ]);
  const [activeScene, setActiveScene] = useState(1);

  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  const autosaveTimerRef = useRef(null);

  const [promptOpen, setPromptOpen] = useState(false);
  const [promptTitle, setPromptTitle] = useState("Save to AI Studio");
  const [promptLabel, setPromptLabel] = useState("Name");
  const [promptDefault, setPromptDefault] = useState("");
  const promptResolveRef = useRef(null);

  const snapshot = useMemo(() => {
    return {
      title,
      ratio,
      scenes,
      activeScene,
      activeMenu,
      visualsTab,
      audioTab,
      voiceoverVolume,
      musicVolume,
    };
  }, [title, ratio, scenes, activeScene, activeMenu, visualsTab, audioTab, voiceoverVolume, musicVolume]);

  const loadAutosave = () => {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.scenes)) return;

      setTitle(typeof data.title === "string" ? data.title : "Untitled Project");
      setRatio(typeof data.ratio === "string" ? data.ratio : "16:9");
      setScenes(data.scenes);
      setActiveScene(typeof data.activeScene === "number" ? data.activeScene : 1);

      setActiveMenu(typeof data.activeMenu === "string" ? data.activeMenu : "storyboard");
      setVisualsTab(typeof data.visualsTab === "string" ? data.visualsTab : "uploads");
      setAudioTab(typeof data.audioTab === "string" ? data.audioTab : "voiceovers");

      setVoiceoverVolume(typeof data.voiceoverVolume === "number" ? data.voiceoverVolume : 100);
      setMusicVolume(typeof data.musicVolume === "number" ? data.musicVolume : 60);

      setPast([]);
      setFuture([]);
    } catch (_) {}
  };

  const saveNow = () => {
    try {
      localStorage.setItem(
        AUTOSAVE_KEY,
        JSON.stringify({
          ...snapshot,
          savedAt: new Date().toISOString(),
        })
      );
    } catch (_) {}
  };

  const pushHistory = (prevSnapshot) => {
    setPast((p) => {
      const next = [...p, deepClone(prevSnapshot)];
      if (next.length > 60) next.shift();
      return next;
    });
    setFuture([]);
  };

  const applySnapshot = (snap) => {
    if (!snap) return;
    setTitle(typeof snap.title === "string" ? snap.title : "Untitled Project");
    setRatio(typeof snap.ratio === "string" ? snap.ratio : "16:9");
    setScenes(Array.isArray(snap.scenes) ? snap.scenes : []);
    setActiveScene(typeof snap.activeScene === "number" ? snap.activeScene : 1);

    setActiveMenu(typeof snap.activeMenu === "string" ? snap.activeMenu : "storyboard");
    setVisualsTab(typeof snap.visualsTab === "string" ? snap.visualsTab : "uploads");
    setAudioTab(typeof snap.audioTab === "string" ? snap.audioTab : "voiceovers");

    setVoiceoverVolume(typeof snap.voiceoverVolume === "number" ? snap.voiceoverVolume : 100);
    setMusicVolume(typeof snap.musicVolume === "number" ? snap.musicVolume : 60);
  };

  const undo = () => {
    setPast((p) => {
      if (p.length === 0) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [deepClone(snapshot), ...f]);
      applySnapshot(prev);
      return p.slice(0, -1);
    });
  };

  const redo = () => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      setPast((p) => [...p, deepClone(snapshot)]);
      applySnapshot(next);
      return f.slice(1);
    });
  };

  const commit = (mutator) => {
    const prev = deepClone(snapshot);
    mutator();
    pushHistory(prev);
  };

  const updateScenes = (nextScenes) => {
    commit(() => setScenes(nextScenes));
  };

  const updateTitle = (nextTitle) => {
    commit(() => setTitle(nextTitle));
  };

  const updateRatio = (nextRatio) => {
    commit(() => setRatio(nextRatio));
  };

  const addScene = () => {
    commit(() => {
      setScenes((s) => {
        const nextId = s.reduce((m, sc) => Math.max(m, sc.id), 0) + 1;
        const next = [...s];
        if (next.length > 0) {
          next[next.length - 1] = { ...next[next.length - 1], transitionToNext: next[next.length - 1].transitionToNext || "cut" };
        }
        next.push({
          id: nextId,
          narration: "",
          action: "",
          mode: "ai",
          savedAt: null,
          generatedAt: null,
          isAiGenerated: false,
          thumbnail: null,
          transitionToNext: "cut",
        });
        return next;
      });
      setActiveScene((prev) => prev);
    });
  };

  const duplicateScene = (sceneId) => {
    commit(() => {
      setScenes((s) => {
        const idx = s.findIndex((x) => x.id === sceneId);
        if (idx === -1) return s;

        const nextId = s.reduce((m, sc) => Math.max(m, sc.id), 0) + 1;
        const original = s[idx];
        const copy = {
          ...deepClone(original),
          id: nextId,
          savedAt: null,
          generatedAt: null,
        };

        const next = [...s];
        next.splice(idx + 1, 0, copy);
        return next;
      });
    });
  };

  const deleteScene = (sceneId) => {
    commit(() => {
      setScenes((s) => {
        if (s.length === 1) return s;
        const next = s.filter((x) => x.id !== sceneId);
        return next;
      });
      setActiveScene((curr) => {
        if (curr !== sceneId) return curr;
        const remaining = scenes.filter((x) => x.id !== sceneId);
        return remaining.length ? remaining[0].id : 1;
      });
    });
  };

  const setTransitionToNext = (sceneId, transition) => {
    commit(() => {
      setScenes((s) => s.map((sc) => (sc.id === sceneId ? { ...sc, transitionToNext: transition } : sc)));
    });
  };

  const openNamePrompt = ({ title: pTitle, label, defaultValue }) => {
    setPromptTitle(pTitle || "Name");
    setPromptLabel(label || "Name");
    setPromptDefault(defaultValue || "");
    setPromptOpen(true);

    return new Promise((resolve) => {
      promptResolveRef.current = resolve;
    });
  };

  const closePrompt = (value) => {
    setPromptOpen(false);
    const resolve = promptResolveRef.current;
    promptResolveRef.current = null;
    if (resolve) resolve(value);
  };

  const saveAiToLibrary = (sceneId, name) => {
    try {
      const scene = scenes.find((sc) => sc.id === sceneId);
      if (!scene) return;

      const raw = localStorage.getItem(AI_STUDIO_LIBRARY_KEY);
      const lib = safeJsonParse(raw || "[]", []);
      const entry = {
        id: `ai_${sceneId}_${Date.now()}`,
        name: name || `Scene ${sceneId}`,
        sceneId,
        title,
        ratio,
        narration: scene.narration || "",
        action: scene.action || "",
        mode: scene.mode || "ai",
        thumbnail: scene.thumbnail || null,
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem(AI_STUDIO_LIBRARY_KEY, JSON.stringify([entry, ...(Array.isArray(lib) ? lib : [])]));
    } catch (_) {}
  };

  const saveScene = async (sceneId) => {
    const scene = scenes.find((sc) => sc.id === sceneId);
    if (!scene) return;

    commit(() => {
      setScenes((s) => s.map((sc) => (sc.id === sceneId ? { ...sc, savedAt: new Date().toISOString() } : sc)));
    });

    if (scene.isAiGenerated) {
      const defaultName = `AI Scene ${sceneId}`;
      const name = await openNamePrompt({
        title: "Save AI Scene to AI Studio",
        label: "Scene name",
        defaultValue: defaultName,
      });
      if (name && String(name).trim().length) {
        saveAiToLibrary(sceneId, String(name).trim());
      }
    }
  };

  const generateScene = async (sceneId) => {
    const scene = scenes.find((sc) => sc.id === sceneId);
    if (!scene) return;

    commit(() => {
      setScenes((s) =>
        s.map((sc) =>
          sc.id === sceneId
            ? {
                ...sc,
                generatedAt: new Date().toISOString(),
                isAiGenerated: sc.mode === "ai",
              }
            : sc
        )
      );
    });

    if (scene.mode === "ai") {
      const defaultName = `AI Scene ${sceneId}`;
      const name = await openNamePrompt({
        title: "Save AI Scene to AI Studio",
        label: "Scene name",
        defaultValue: defaultName,
      });
      if (name && String(name).trim().length) {
        saveAiToLibrary(sceneId, String(name).trim());
      }
    }
  };

  const applyAiStudioItemToScene = (item) => {
    if (!item) return;
    commit(() => {
      setScenes((s) =>
        s.map((sc) =>
          sc.id === activeScene
            ? {
                ...sc,
                narration: item.narration || sc.narration,
                action: item.action || sc.action,
                thumbnail: item.thumbnail || sc.thumbnail,
              }
            : sc
        )
      );
    });
  };

  const goBack = () => {
    window.location.href = "/drafts";
  };

  useEffect(() => {
    loadAutosave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current);
    autosaveTimerRef.current = setInterval(() => {
      saveNow();
    }, 3000);
    return () => {
      if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, ratio, scenes, activeScene, activeMenu, visualsTab, audioTab, voiceoverVolume, musicVolume]);

  return (
    <div className="editorShell">
      <div className="topNav">
        <div className="topLeft">
          <button className="backBtn" onClick={goBack}>Back</button>
          <input className="titleInput" value={title} onChange={(e) => updateTitle(e.target.value)} />
          <button className="saveBtn" onClick={saveNow}>Save</button>
          <button className="addSceneTopBtn" onClick={addScene}>+ Add Scene</button>
        </div>

        <div className="topControls">
          <select value={ratio} onChange={(e) => updateRatio(e.target.value)}>
            <option>16:9</option>
            <option>9:16</option>
            <option>1:1</option>
          </select>

          <button onClick={undo} disabled={past.length === 0}>Undo</button>
          <button onClick={redo} disabled={future.length === 0}>Redo</button>

          <button>Preview</button>
          <button>Download</button>
          <button>Earn</button>
        </div>
      </div>

      <div className="editorBody">
        <div className="iconMenu">
          <div className={activeMenu === "storyboard" ? "active" : ""} onClick={() => setActiveMenu("storyboard")} title="Storyboard">📜</div>
          <div className={activeMenu === "visuals" ? "active" : ""} onClick={() => setActiveMenu("visuals")} title="Visuals">🎬</div>
          <div className={activeMenu === "audio" ? "active" : ""} onClick={() => setActiveMenu("audio")} title="Audio">🎵</div>
          <div className={activeMenu === "branding" ? "active" : ""} onClick={() => setActiveMenu("branding")} title="Branding">🏷</div>
          <div className={activeMenu === "styles" ? "active" : ""} onClick={() => setActiveMenu("styles")} title="Styles">🎨</div>
          <div className={activeMenu === "text" ? "active" : ""} onClick={() => setActiveMenu("text")} title="Text">🔤</div>
          <div className={activeMenu === "avatar" ? "active" : ""} onClick={() => setActiveMenu("avatar")} title="Avatar">🧍</div>
        </div>

        <div className="sidePanel">
          {activeMenu === "storyboard" && (
            <>
              <div className="panelHeader">
                <div>Storyboard</div>
              </div>

              <StoryboardPanel
                scenes={scenes}
                activeScene={activeScene}
                setActiveScene={(id) => commit(() => setActiveScene(id))}
                updateScenes={updateScenes}
                onSaveScene={saveScene}
                onGenerateScene={generateScene}
              />
            </>
          )}

          {activeMenu === "visuals" && (
            <VisualsPanel
              tab={visualsTab}
              setTab={(t) => commit(() => setVisualsTab(t))}
              onUseAiStudioItem={applyAiStudioItemToScene}
              libraryKey={AI_STUDIO_LIBRARY_KEY}
            />
          )}

          {activeMenu === "audio" && (
            <AudioPanel
              tab={audioTab}
              setTab={(t) => commit(() => setAudioTab(t))}
              voiceoverVolume={voiceoverVolume}
              setVoiceoverVolume={(v) => commit(() => setVoiceoverVolume(v))}
              musicVolume={musicVolume}
              setMusicVolume={(v) => commit(() => setMusicVolume(v))}
            />
          )}

          {activeMenu === "branding" && <div className="panelHeader">Branding</div>}
          {activeMenu === "styles" && <div className="panelHeader">Styles</div>}
          {activeMenu === "text" && <div className="panelHeader">Text</div>}
          {activeMenu === "avatar" && <div className="panelHeader">Avatar</div>}
        </div>

        <div className="canvasArea">
          <div className={`canvas ratio-${ratio.replace(":", "-")}`}>No Media</div>
        </div>
      </div>

      <SceneStrip
        scenes={scenes}
        activeScene={activeScene}
        setActiveScene={(id) => commit(() => setActiveScene(id))}
        updateScenes={updateScenes}
        onDuplicate={duplicateScene}
        onDelete={deleteScene}
        onTransitionChange={setTransitionToNext}
      />

      <ModalPrompt
        open={promptOpen}
        title={promptTitle}
        label={promptLabel}
        defaultValue={promptDefault}
        onCancel={() => closePrompt(null)}
        onConfirm={(v) => closePrompt(v)}
      />
    </div>
  );
}
