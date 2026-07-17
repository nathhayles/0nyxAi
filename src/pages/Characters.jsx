import React, { useState, useEffect, useCallback, useRef } from "react";
import { getAuthHeaders } from "../utils/auth.js";
import BrandSelector from "../components/BrandSelector.jsx";

const MIN_RECOMMENDED = 2;
const MAX_RECOMMENDED = 4;

function emptyDraftFiles() {
  return []; // [{ file, angle, localUrl }]
}

// Only array-field editing precedent in this app (BrandKits.jsx's
// comma-separated voices/music inputs) — reused here for
// distinguishing_features/accessories rather than inventing a chip UI.
// Filters empty entries, unlike that original (a blank field there leaves a
// stray "" in the array).
function splitCommaList(raw) {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Module-level (not nested in Characters()) so it isn't recreated every
// render — an inline component definition here would remount on each
// keystroke and drop input focus. Mirrors the exact label/input styling
// already used for the name/description fields above, just parameterized
// to avoid repeating it ~18 times.
function IdentityField({ label, value, onChange, placeholder, helper }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--onyx-text-faint)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text)", fontSize: 14, boxSizing: "border-box" }}
      />
      {helper && <div style={{ fontSize: 11, color: "var(--onyx-text-faint)", marginTop: 4 }}>{helper}</div>}
    </div>
  );
}

export default function Characters() {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [brandId, setBrandId] = useState(null);
  const [draftFiles, setDraftFiles] = useState(emptyDraftFiles());
  const [primaryIndex, setPrimaryIndex] = useState(0);
  const [formError, setFormError] = useState(null);
  const fileInputRef = useRef(null);

  // Real-person disclosure (EU AI Act Article 50, Pass 1). No default
  // pre-selected — the user must make an explicit choice on every save.
  const [isRealPerson, setIsRealPerson] = useState(null); // null = not yet chosen, true/false once chosen
  const [realPersonType, setRealPersonType] = useState(null); // 'public_figure' | 'private_individual'
  const [consentChecked, setConsentChecked] = useState(false);

  // Structured identity fields (migration 029). All optional, all nullable —
  // matches the DB (no defaults, no backfill, existing characters have NULLs
  // here until a user fills them in). Plain strings for every field except
  // distinguishing_features/accessories, which are text[] columns edited as
  // a single comma-separated input (the only array-field precedent that
  // exists anywhere in this app — see BrandKits.jsx's voices/music fields —
  // split+trim+filter-empty on save, .join(", ") on load).
  const [apparentAge, setApparentAge] = useState("");
  const [gender, setGender] = useState("");
  const [build, setBuild] = useState("");
  const [heightImpression, setHeightImpression] = useState("");
  const [ethnicity, setEthnicity] = useState("");
  const [skinTone, setSkinTone] = useState("");
  const [hairColor, setHairColor] = useState("");
  const [hairLength, setHairLength] = useState("");
  const [hairStyle, setHairStyle] = useState("");
  const [hairTexture, setHairTexture] = useState("");
  const [eyeColor, setEyeColor] = useState("");
  const [distinguishingFeatures, setDistinguishingFeatures] = useState(""); // raw comma-separated text
  const [mannerisms, setMannerisms] = useState("");
  const [restingExpression, setRestingExpression] = useState("");
  const [defaultWardrobe, setDefaultWardrobe] = useState("");
  const [accessories, setAccessories] = useState(""); // raw comma-separated text
  const [wardrobeMode, setWardrobeMode] = useState("flexible"); // DB default; matches the check constraint
  const [referenceMode, setReferenceMode] = useState("scene_accuracy"); // DB default; matches the check constraint
  const [linkedVoiceId, setLinkedVoiceId] = useState(null);
  const [linkedVoiceProvider, setLinkedVoiceProvider] = useState(null);
  const [category, setCategory] = useState("");

  // Voice picker — mirrors BrandingPanel's Voice-tab pattern (the closer
  // analog found in this app; no extractable VoiceSelector component
  // exists to reuse directly). Provider is derived from the tier toggle,
  // same convention as brands' default_voice_id/default_voice_provider.
  const [voiceTier, setVoiceTier] = useState("standard"); // 'standard' | 'premium'
  const [voices, setVoices] = useState([]);
  const [voicesLoading, setVoicesLoading] = useState(false);

  const loadVoices = useCallback(async (tier) => {
    setVoicesLoading(true);
    try {
      const headers = await getAuthHeaders();
      const provider = tier === "premium" ? "elevenlabs" : "openai";
      const res = await fetch(`/api/tts/voices?provider=${provider}`, { headers });
      const data = await res.json();
      setVoices(Array.isArray(data?.voices) ? data.voices : []);
    } catch {
      setVoices([]);
    }
    setVoicesLoading(false);
  }, []);

  useEffect(() => { if (showForm) loadVoices(voiceTier); }, [showForm, voiceTier, loadVoices]);

  const fetchCharacters = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/characters", { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load characters");
      setCharacters(Array.isArray(data.characters) ? data.characters : []);
    } catch (e) {
      setError(e.message || "Failed to load characters");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCharacters(); }, [fetchCharacters]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setDescription("");
    setBrandId(null);
    setDraftFiles(emptyDraftFiles());
    setPrimaryIndex(0);
    setFormError(null);
    setIsRealPerson(null);
    setRealPersonType(null);
    setConsentChecked(false);
    setApparentAge(""); setGender(""); setBuild(""); setHeightImpression("");
    setEthnicity(""); setSkinTone(""); setHairColor(""); setHairLength("");
    setHairStyle(""); setHairTexture(""); setEyeColor(""); setDistinguishingFeatures("");
    setMannerisms(""); setRestingExpression(""); setDefaultWardrobe(""); setAccessories("");
    setWardrobeMode("flexible"); setReferenceMode("scene_accuracy"); setLinkedVoiceId(null); setLinkedVoiceProvider(null); setCategory("");
    setVoiceTier("standard");
  }

  function openCreateForm() {
    resetForm();
    setShowForm(true);
  }

  function openEditForm(character) {
    setEditingId(character.id);
    setName(character.name || "");
    setDescription(character.description || "");
    setBrandId(character.brand_id || null);
    setDraftFiles(emptyDraftFiles());
    setPrimaryIndex(0);
    setFormError(null);
    // is_real_person may be null for characters created before this field
    // existed — leave unset so the user is forced to make an explicit choice
    // (null must never be silently treated as "no" and saved back as false).
    setIsRealPerson(character.is_real_person === true ? true : character.is_real_person === false ? false : null);
    setRealPersonType(character.real_person_type || null);
    setConsentChecked(!!character.consent_attested_at);
    setApparentAge(character.apparent_age || "");
    setGender(character.gender || "");
    setBuild(character.build || "");
    setHeightImpression(character.height_impression || "");
    setEthnicity(character.ethnicity || "");
    setSkinTone(character.skin_tone || "");
    setHairColor(character.hair_color || "");
    setHairLength(character.hair_length || "");
    setHairStyle(character.hair_style || "");
    setHairTexture(character.hair_texture || "");
    setEyeColor(character.eye_color || "");
    setDistinguishingFeatures((character.distinguishing_features || []).join(", "));
    setMannerisms(character.mannerisms || "");
    setRestingExpression(character.resting_expression || "");
    setDefaultWardrobe(character.default_wardrobe || "");
    setAccessories((character.accessories || []).join(", "));
    setWardrobeMode(character.wardrobe_mode || "flexible");
    setReferenceMode(character.reference_mode || "scene_accuracy");
    setLinkedVoiceId(character.linked_voice_id || null);
    setLinkedVoiceProvider(character.linked_voice_provider || null);
    setVoiceTier(character.linked_voice_provider === "elevenlabs" ? "premium" : "standard");
    setCategory(character.category || "");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    resetForm();
  }

  function handleFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const additions = files.map((file) => ({ file, angle: "", localUrl: URL.createObjectURL(file) }));
    setDraftFiles((prev) => [...prev, ...additions]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function updateAngle(index, angle) {
    setDraftFiles((prev) => prev.map((f, i) => (i === index ? { ...f, angle } : f)));
  }

  function removeDraftFile(index) {
    setDraftFiles((prev) => prev.filter((_, i) => i !== index));
    setPrimaryIndex((prevIdx) => {
      if (index === prevIdx) return 0;
      if (index < prevIdx) return prevIdx - 1;
      return prevIdx;
    });
  }

  async function uploadReferenceImages(characterId, files, primaryIdx) {
    if (!files.length) return;
    // Put the primary image first so it lands at sort_order 0 server-side.
    const ordered = [
      files[primaryIdx],
      ...files.filter((_, i) => i !== primaryIdx),
    ];
    const headers = await getAuthHeaders();
    const form = new FormData();
    ordered.forEach((f) => {
      form.append("files", f.file);
      form.append("angle", f.angle || "");
    });
    const res = await fetch(`/api/characters/${characterId}/reference-images`, {
      method: "POST",
      headers,
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Image upload failed");
    return data.images;
  }

  async function handleSave() {
    setFormError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError("Name is required.");
      return;
    }
    const isCreate = !editingId;
    if (isCreate && draftFiles.length === 0) {
      setFormError("At least 1 reference image is required.");
      return;
    }

    if (isRealPerson === null) {
      setFormError('Please answer "Is this a real person?".');
      return;
    }
    if (isRealPerson && !realPersonType) {
      setFormError("Please specify public figure or private individual.");
      return;
    }
    if (isRealPerson && realPersonType === "private_individual" && !consentChecked) {
      setFormError("Consent confirmation is required for a private individual.");
      return;
    }

    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const jsonHeaders = { ...headers, "Content-Type": "application/json" };
      const body = {
        name: trimmedName,
        description: description || null,
        brand_id: brandId || null,
        is_real_person: isRealPerson,
        real_person_type: isRealPerson ? realPersonType : null,
        consent_attested: isRealPerson && realPersonType === "private_individual" ? consentChecked : undefined,
        apparent_age: apparentAge || null,
        gender: gender || null,
        build: build || null,
        height_impression: heightImpression || null,
        ethnicity: ethnicity || null,
        skin_tone: skinTone || null,
        hair_color: hairColor || null,
        hair_length: hairLength || null,
        hair_style: hairStyle || null,
        hair_texture: hairTexture || null,
        eye_color: eyeColor || null,
        distinguishing_features: splitCommaList(distinguishingFeatures),
        mannerisms: mannerisms || null,
        resting_expression: restingExpression || null,
        default_wardrobe: defaultWardrobe || null,
        accessories: splitCommaList(accessories),
        wardrobe_mode: wardrobeMode,
        reference_mode: referenceMode,
        linked_voice_id: linkedVoiceId || null,
        linked_voice_provider: linkedVoiceId ? linkedVoiceProvider : null,
        category: category || null,
      };

      let characterId = editingId;
      if (isCreate) {
        const res = await fetch("/api/characters", {
          method: "POST",
          headers: jsonHeaders,
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Create failed");
        characterId = data.character.id;
      } else {
        const res = await fetch(`/api/characters/${editingId}`, {
          method: "PUT",
          headers: jsonHeaders,
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Update failed");
      }

      if (draftFiles.length > 0) {
        await uploadReferenceImages(characterId, draftFiles, primaryIndex);
      }

      await fetchCharacters();
      closeForm();
    } catch (e) {
      setFormError(e.message || "Save failed");
    }
    setSaving(false);
  }

  async function handleDelete(character) {
    if (!confirm(`Delete "${character.name}"? This cannot be undone.`)) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/characters/${character.id}`, { method: "DELETE", headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setCharacters((prev) => prev.filter((c) => c.id !== character.id));
    } catch (e) {
      setError(e.message || "Failed to delete character");
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 40, color: "var(--onyx-text-faint)", textAlign: "center" }}>Loading characters...</div>
    );
  }

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--onyx-text)", margin: 0 }}>Character Library</h1>
          <p style={{ fontSize: 13, color: "var(--onyx-text-faint)", margin: "4px 0 0" }}>
            Reusable characters with reference images for consistent AI generation.
          </p>
        </div>
        <button
          onClick={openCreateForm}
          style={{
            padding: "9px 16px", fontSize: 13, fontWeight: 600,
            background: "var(--chip-bg-strong)", border: "1px solid var(--onyx-cyan)", color: "var(--onyx-cyan)",
            borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap",
          }}
        >
          + New Character
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: "8px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 4, fontSize: 12, color: "#f87171" }}>
          {error}
        </div>
      )}

      {characters.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--onyx-text-faint)", border: "1px dashed var(--onyx-hairline-strong)", borderRadius: 8 }}>
          No characters yet. Create one to get started.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {characters.map((c) => {
            const images = c.character_reference_images || [];
            const primary = images.find((img) => img.sort_order === 0) || images[0];
            return (
              <div
                key={c.id}
                style={{
                  border: "1px solid var(--onyx-hairline-strong)", borderRadius: 8,
                  background: "var(--onyx-surface)", overflow: "hidden", display: "flex", flexDirection: "column",
                }}
              >
                <div style={{ width: "100%", height: 160, background: "var(--onyx-surface-2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {primary ? (
                    <img src={primary.url} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--onyx-text-faint)" }}>No image</span>
                  )}
                </div>
                <div style={{ padding: 12, flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--onyx-text)" }}>{c.name}</div>
                  {c.description && (
                    <div style={{
                      fontSize: 12, color: "var(--onyx-text-faint)", overflow: "hidden",
                      textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                    }}>
                      {c.description}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "var(--onyx-text-faint)" }}>
                    {images.length} reference image{images.length === 1 ? "" : "s"}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 8 }}>
                    <button
                      onClick={() => openEditForm(c)}
                      style={{ flex: 1, padding: "6px 10px", fontSize: 11, background: "var(--onyx-surface-2)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text-faint)", borderRadius: 4, cursor: "pointer" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      style={{ flex: 1, padding: "6px 10px", fontSize: 11, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", borderRadius: 4, cursor: "pointer" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div
          onClick={closeForm}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto",
              background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", borderRadius: 10, padding: 22,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--onyx-text)", margin: "0 0 16px" }}>
              {editingId ? "Edit Character" : "New Character"}
            </h2>

            {formError && (
              <div style={{ marginBottom: 14, padding: "8px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 4, fontSize: 12, color: "#f87171" }}>
                {formError}
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--onyx-text-faint)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Name *
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Character name..."
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text)", fontSize: 14, boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--onyx-text-faint)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Description
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description..."
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text)", fontSize: 14, boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--onyx-text-faint)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Brand (optional)
              </label>
              <BrandSelector value={brandId} onChange={(id) => setBrandId(id)} />
            </div>

            <div style={{ marginBottom: 14, padding: 12, border: "1px solid var(--onyx-hairline-strong)", borderRadius: 8, background: "var(--onyx-surface)" }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--onyx-text-faint)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Is this a real person? *
              </label>
              <div style={{ display: "flex", gap: 16, marginBottom: isRealPerson ? 12 : 0 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--onyx-text)", cursor: "pointer" }}>
                  <input type="radio" name="is-real-person" checked={isRealPerson === true} onChange={() => setIsRealPerson(true)} />
                  Yes
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--onyx-text)", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="is-real-person"
                    checked={isRealPerson === false}
                    onChange={() => { setIsRealPerson(false); setRealPersonType(null); setConsentChecked(false); }}
                  />
                  No
                </label>
              </div>

              {isRealPerson === true && (
                <>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--onyx-text-faint)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Public figure or private individual? *
                  </label>
                  <div style={{ display: "flex", gap: 16, marginBottom: realPersonType === "private_individual" ? 12 : 0 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--onyx-text)", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="real-person-type"
                        checked={realPersonType === "public_figure"}
                        onChange={() => { setRealPersonType("public_figure"); setConsentChecked(false); }}
                      />
                      Public figure
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--onyx-text)", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="real-person-type"
                        checked={realPersonType === "private_individual"}
                        onChange={() => setRealPersonType("private_individual")}
                      />
                      Private individual
                    </label>
                  </div>

                  {realPersonType === "private_individual" && (
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "var(--onyx-text-faint)", cursor: "pointer", lineHeight: 1.4 }}>
                      <input
                        type="checkbox"
                        checked={consentChecked}
                        onChange={(e) => setConsentChecked(e.target.checked)}
                        style={{ marginTop: 2 }}
                      />
                      I confirm I have this person's consent to create AI-generated video or audio content depicting
                      them, or I am authorized to provide this consent on their behalf. *
                    </label>
                  )}
                </>
              )}
            </div>

            <div style={{ marginBottom: 14, padding: 12, border: "1px solid var(--onyx-hairline-strong)", borderRadius: 8, background: "var(--onyx-surface)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--onyx-text-faint)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Core Identity
              </div>
              <div style={{ fontSize: 11, color: "var(--onyx-text-faint)", marginBottom: 12 }}>
                Physical traits that should barely change once set — all optional.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <IdentityField label="Apparent age" value={apparentAge} onChange={setApparentAge} placeholder="e.g. late 20s" />
                <IdentityField label="Gender" value={gender} onChange={setGender} placeholder="e.g. male" />
                <IdentityField
                  label="Build" value={build} onChange={setBuild}
                  placeholder="e.g. heavyset, lean and athletic"
                  helper="Be specific — vague values like “average” are what this field exists to avoid."
                />
                <IdentityField label="Height impression" value={heightImpression} onChange={setHeightImpression} placeholder="e.g. tall" />
                <IdentityField label="Ethnicity" value={ethnicity} onChange={setEthnicity} placeholder="" />
                <IdentityField label="Skin tone" value={skinTone} onChange={setSkinTone} placeholder="" />
                <IdentityField label="Hair color" value={hairColor} onChange={setHairColor} placeholder="" />
                <IdentityField label="Hair length" value={hairLength} onChange={setHairLength} placeholder="" />
                <IdentityField label="Hair style" value={hairStyle} onChange={setHairStyle} placeholder="" />
                <IdentityField label="Hair texture" value={hairTexture} onChange={setHairTexture} placeholder="e.g. curly, straight" />
                <IdentityField label="Eye color" value={eyeColor} onChange={setEyeColor} placeholder="" />
              </div>
              <div style={{ marginTop: 12 }}>
                <IdentityField
                  label="Distinguishing features" value={distinguishingFeatures} onChange={setDistinguishingFeatures}
                  placeholder="comma separated — e.g. scar above left eyebrow, nose ring"
                />
              </div>
            </div>

            <div style={{ marginBottom: 14, padding: 12, border: "1px solid var(--onyx-hairline-strong)", borderRadius: 8, background: "var(--onyx-surface)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--onyx-text-faint)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Behavioral / Style
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <IdentityField label="Mannerisms" value={mannerisms} onChange={setMannerisms} placeholder="e.g. talks with their hands, frequent half-smile" />
                <IdentityField label="Resting expression" value={restingExpression} onChange={setRestingExpression} placeholder="" />
                <IdentityField label="Default wardrobe" value={defaultWardrobe} onChange={setDefaultWardrobe} placeholder="e.g. black leather jacket, white tee" />

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--onyx-text-faint)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Wardrobe mode
                  </label>
                  <div style={{ display: "flex", gap: 16 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--onyx-text)", cursor: "pointer" }}>
                      <input type="radio" name="wardrobe-mode" checked={wardrobeMode === "locked"} onChange={() => setWardrobeMode("locked")} />
                      Locked
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--onyx-text)", cursor: "pointer" }}>
                      <input type="radio" name="wardrobe-mode" checked={wardrobeMode === "flexible"} onChange={() => setWardrobeMode("flexible")} />
                      Flexible
                    </label>
                  </div>
                </div>

                <IdentityField label="Accessories" value={accessories} onChange={setAccessories} placeholder="comma separated — e.g. round glasses, silver watch" />

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--onyx-text-faint)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Linked voice
                  </label>
                  <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--onyx-text)", cursor: "pointer" }}>
                      <input type="radio" name="voice-tier" checked={voiceTier === "standard"} onChange={() => setVoiceTier("standard")} />
                      Standard
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--onyx-text)", cursor: "pointer" }}>
                      <input type="radio" name="voice-tier" checked={voiceTier === "premium"} onChange={() => setVoiceTier("premium")} />
                      Premium
                    </label>
                  </div>
                  <select
                    value={linkedVoiceId || ""}
                    onChange={(e) => {
                      const id = e.target.value || null;
                      setLinkedVoiceId(id);
                      setLinkedVoiceProvider(id ? (voiceTier === "premium" ? "elevenlabs" : "openai") : null);
                    }}
                    disabled={voicesLoading}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text)", fontSize: 14, boxSizing: "border-box" }}
                  >
                    <option value="">{voicesLoading ? "Loading voices..." : "No voice linked"}</option>
                    {voices.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}{v.gender ? ` · ${v.gender}` : ""}{v.accent ? ` · ${v.accent}` : ""}</option>
                    ))}
                  </select>
                </div>

                <IdentityField label="Category" value={category} onChange={setCategory} placeholder="e.g. protagonist, host, background" />
              </div>
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--onyx-text-faint)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Reference Images *
              </label>
              <div style={{ fontSize: 11, color: "var(--onyx-text-faint)", marginBottom: 8 }}>
                For best results, upload {MIN_RECOMMENDED}-{MAX_RECOMMENDED} reference images (front, side, 3/4, etc).
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFilesSelected}
                style={{ fontSize: 12, color: "var(--onyx-text)", marginBottom: 10 }}
              />

              {draftFiles.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {draftFiles.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, border: "1px solid var(--onyx-hairline-strong)", borderRadius: 6, background: "var(--onyx-surface)" }}>
                      <img src={f.localUrl} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
                      <input
                        value={f.angle}
                        onChange={(e) => updateAngle(i, e.target.value)}
                        placeholder="angle (e.g. front, side, 3/4)"
                        style={{ flex: 1, padding: "6px 8px", fontSize: 12, background: "var(--onyx-bg-2)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text)", borderRadius: 4 }}
                      />
                      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: primaryIndex === i ? "var(--onyx-cyan)" : "var(--onyx-text-faint)", whiteSpace: "nowrap", cursor: "pointer" }}>
                        <input
                          type="radio"
                          name="primary-image"
                          checked={primaryIndex === i}
                          onChange={() => setPrimaryIndex(i)}
                        />
                        Primary
                      </label>
                      <button
                        onClick={() => removeDraftFile(i)}
                        style={{ padding: "4px 8px", fontSize: 11, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", borderRadius: 4, cursor: "pointer" }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {draftFiles.length === 1 && (
                <div style={{ fontSize: 11, color: "var(--onyx-text-faint)", marginTop: 8 }}>
                  This will work, but adding {MIN_RECOMMENDED - 1}-{MAX_RECOMMENDED - 1} more angles (side, 3/4, etc) generally gives better, more consistent results.
                </div>
              )}

              <div style={{ marginTop: 14 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--onyx-text-faint)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Reference mode
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--onyx-text)", cursor: "pointer" }}>
                    <input type="radio" name="reference-mode" checked={referenceMode === "scene_accuracy"} onChange={() => setReferenceMode("scene_accuracy")} style={{ marginTop: 2 }} />
                    <span>
                      Scene accuracy <span style={{ color: "var(--onyx-text-faint)" }}>(default)</span>
                      <div style={{ fontSize: 11, color: "var(--onyx-text-faint)" }}>Scenes follow your prompt exactly. This character's look comes from the description above, not the photos.</div>
                    </span>
                  </label>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--onyx-text)", cursor: "pointer" }}>
                    <input type="radio" name="reference-mode" checked={referenceMode === "character_consistency"} onChange={() => setReferenceMode("character_consistency")} style={{ marginTop: 2 }} />
                    <span>
                      Character consistency
                      <div style={{ fontSize: 11, color: "var(--onyx-text-faint)" }}>Scenes closely match this character's reference photo, but may start the video anchored to that photo rather than the described scene.</div>
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button
                onClick={closeForm}
                disabled={saving}
                style={{ padding: "9px 16px", fontSize: 13, background: "var(--onyx-surface-2)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text-faint)", borderRadius: 6, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ padding: "9px 16px", fontSize: 13, fontWeight: 600, background: "var(--chip-bg-strong)", border: "1px solid var(--onyx-cyan)", color: "var(--onyx-cyan)", borderRadius: 6, cursor: "pointer" }}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
