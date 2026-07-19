import React, { useState } from "react";

export default function FolderPicker({ folders, folderId, setFolderId, onCreate, onRename, onDelete }) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const selected = folders.find((f) => f.id === folderId) || null;

  const submitCreate = async () => {
    const name = newName.trim();
    if (!name) { setCreating(false); return; }
    await onCreate(name);
    setNewName("");
    setCreating(false);
  };

  const submitRename = async () => {
    const name = newName.trim();
    if (!name || !selected) { setRenaming(false); return; }
    await onRename(selected.id, name);
    setRenaming(false);
  };

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, color: "var(--onyx-text-dim)", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Folder</span>
        <button
          onClick={() => { setCreating((v) => !v); setNewName(""); setRenaming(false); }}
          style={{ background: "none", border: "none", color: "var(--onyx-cyan-deep)", fontSize: 11, fontWeight: 600, cursor: "pointer", padding: 0 }}
        >
          + New folder
        </button>
      </div>

      {creating && (
        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitCreate(); if (e.key === "Escape") setCreating(false); }}
            placeholder="Folder name"
            style={{ flex: 1, background: "var(--onyx-surface)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text)", borderRadius: 6, padding: "6px 8px", fontSize: 12 }}
          />
          <button onClick={submitCreate} style={{ padding: "0 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "var(--onyx-cyan-deep)", border: "none", color: "var(--btn-primary-text)", cursor: "pointer" }}>Add</button>
        </div>
      )}

      {renaming && selected && (
        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitRename(); if (e.key === "Escape") setRenaming(false); }}
            placeholder="Rename folder"
            style={{ flex: 1, background: "var(--onyx-surface)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text)", borderRadius: 6, padding: "6px 8px", fontSize: 12 }}
          />
          <button onClick={submitRename} style={{ padding: "0 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "var(--onyx-cyan-deep)", border: "none", color: "var(--btn-primary-text)", cursor: "pointer" }}>Save</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 6 }}>
        <select
          value={folderId}
          onChange={(e) => setFolderId(e.target.value)}
          style={{ flex: 1, background: "var(--onyx-surface)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text)", borderRadius: 6, padding: "7px 10px", fontSize: 12 }}
        >
          <option value="">All folders</option>
          <option value="none">Unfiled</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        {selected && (
          <>
            <button
              onClick={() => { setRenaming(true); setCreating(false); setNewName(selected.name); }}
              title="Rename folder"
              style={{ width: 28, borderRadius: 6, fontSize: 12, background: "var(--onyx-surface)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-text-faint)", cursor: "pointer" }}
            >
              ✎
            </button>
            <button
              onClick={() => { if (window.confirm(`Delete folder "${selected.name}"? Assets inside will become Unfiled.`)) onDelete(selected.id); }}
              title="Delete folder"
              style={{ width: 28, borderRadius: 6, fontSize: 12, background: "var(--onyx-surface)", border: "1px solid var(--onyx-hairline-strong)", color: "var(--onyx-rose)", cursor: "pointer" }}
            >
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  );
}
