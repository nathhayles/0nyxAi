import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { getAuthHeaders } from "../utils/auth.js";
import BrandSelector from "../components/BrandSelector.jsx";

// ─── Constants ───────────────────────────────────────────────────────────────

const PILLARS = ["authority", "trend", "community"];
const PILLAR_COLOR = {
  authority: { bg: "rgba(77,208,255,0.13)", border: "rgba(77,208,255,0.35)", text: "var(--onyx-cyan)" },
  trend:     { bg: "rgba(255,181,71,0.13)",  border: "rgba(255,181,71,0.35)",  text: "var(--onyx-amber)" },
  community: { bg: "rgba(180,141,255,0.13)", border: "rgba(180,141,255,0.35)", text: "var(--onyx-violet)" },
};

const STATUSES = ["idea", "hook_generated", "reel_generated", "scheduled", "published"];
const STATUS_LABEL = {
  idea:           "Idea",
  hook_generated: "Hook Generated",
  reel_generated: "Reel Generated",
  scheduled:      "Marked as Scheduled",
  published:      "Published",
};
const STATUS_COLOR = {
  idea:           { bg: "var(--chip-bg)", text: "var(--onyx-text-faint)" },
  hook_generated: { bg: "rgba(77,208,255,0.13)", text: "var(--onyx-cyan)" },
  reel_generated: { bg: "rgba(180,141,255,0.13)", text: "var(--onyx-violet)" },
  scheduled:      { bg: "rgba(255,181,71,0.13)", text: "var(--onyx-amber)" },
  published:      { bg: "rgba(76,211,160,0.13)", text: "var(--onyx-success)" },
};

const PLATFORM_ICON = {
  tiktok:    "🎵",
  instagram: "📸",
  youtube:   "▶️",
  linkedin:  "💼",
  twitter:   "𝕏",
};
const PLATFORMS = ["tiktok", "instagram", "youtube", "linkedin", "twitter"];

// ─── API helpers ─────────────────────────────────────────────────────────────

async function apiFetch(path, opts = {}) {
  const headers = await getAuthHeaders();
  const res = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...headers, ...opts.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PillarBadge({ pillar }) {
  const c = PILLAR_COLOR[pillar] || PILLAR_COLOR.authority;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
      padding: "2px 6px", borderRadius: 4,
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      flexShrink: 0,
    }}>
      {pillar}
    </span>
  );
}

function StatusBadge({ status }) {
  const c = STATUS_COLOR[status] || STATUS_COLOR.idea;
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, letterSpacing: "0.03em",
      padding: "2px 6px", borderRadius: 4,
      background: c.bg, color: c.text, flexShrink: 0,
    }}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

function PlatformIcons({ platforms }) {
  if (!platforms?.length) return null;
  return (
    <span style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
      {platforms.map(p => (
        <span key={p} title={p} style={{ fontSize: 11 }}>{PLATFORM_ICON[p] || p}</span>
      ))}
    </span>
  );
}

// ─── Plan Item Card ───────────────────────────────────────────────────────────

function ItemCard({ item, onClick, compact = false, isDragging = false }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--onyx-surface-2)",
        border: `1px solid var(--onyx-hairline-strong)`,
        borderLeft: `3px solid ${PILLAR_COLOR[item.pillar]?.text || "var(--onyx-cyan)"}`,
        borderRadius: 7,
        padding: compact ? "5px 7px" : "8px 10px",
        cursor: isDragging ? "grabbing" : "pointer",
        opacity: isDragging ? 0.85 : 1,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontSize: 12,
        userSelect: "none",
        transition: "box-shadow 0.15s",
        boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.4)" : "none",
      }}
      onMouseEnter={e => !isDragging && (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)")}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = isDragging ? "0 8px 24px rgba(0,0,0,0.4)" : "none")}
    >
      <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
        <PillarBadge pillar={item.pillar} />
        {!compact && <StatusBadge status={item.status} />}
      </div>
      {item.hook_text && (
        <p style={{
          margin: 0, color: "var(--onyx-text-dim)", lineHeight: 1.35,
          display: "-webkit-box", WebkitLineClamp: compact ? 2 : 3,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {item.hook_text}
        </p>
      )}
      {!compact && (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <PlatformIcons platforms={item.target_platforms} />
        </div>
      )}
    </div>
  );
}

// ─── Draggable wrapper ────────────────────────────────────────────────────────

function DraggableItem({ id, item, onClick, compact }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ touchAction: "none" }}>
      <ItemCard item={item} onClick={onClick} compact={compact} isDragging={isDragging} />
    </div>
  );
}

// ─── Calendar View ────────────────────────────────────────────────────────────

function CalendarDropCell({ date, children }) {
  const { setNodeRef, isOver } = useDroppable({ id: `cal-${date}` });
  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: 80,
        padding: "4px 3px",
        borderRight: "0.5px solid var(--onyx-hairline)",
        borderBottom: "0.5px solid var(--onyx-hairline)",
        background: isOver ? "rgba(77,208,255,0.06)" : "transparent",
        transition: "background 0.15s",
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      {children}
    </div>
  );
}

function CalendarView({ plan, items, onItemClick, onItemMove }) {
  const start = new Date(plan.start_date + "T00:00:00");
  const end = new Date(plan.end_date + "T00:00:00");

  // Build a date range: find first Sunday on or before start, last Saturday on or after end
  const calStart = new Date(start);
  calStart.setDate(calStart.getDate() - calStart.getDay()); // Sunday
  const calEnd = new Date(end);
  calEnd.setDate(calEnd.getDate() + (6 - calEnd.getDay())); // Saturday

  // Build weeks array
  const weeks = [];
  const cur = new Date(calStart);
  while (cur <= calEnd) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  const itemsByDate = {};
  items.forEach(item => {
    const d = item.target_date;
    if (!itemsByDate[d]) itemsByDate[d] = [];
    itemsByDate[d].push(item);
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ overflowX: "auto" }}>
      {/* Month headers */}
      {(() => {
        const months = [];
        let prev = null;
        let span = 0;
        weeks.forEach(week => {
          const m = week[0].toLocaleString("default", { month: "long", year: "numeric" });
          if (m !== prev) {
            if (prev) months.push({ label: prev, span });
            prev = m; span = 1;
          } else { span++; }
        });
        if (prev) months.push({ label: prev, span });
        return (
          <div style={{ display: "flex", borderBottom: "0.5px solid var(--onyx-hairline)" }}>
            {months.map(({ label, span }) => (
              <div key={label} style={{
                flex: span, minWidth: span * 100, padding: "6px 10px",
                fontWeight: 700, fontSize: 13, color: "var(--onyx-text-dim)",
                borderRight: "0.5px solid var(--onyx-hairline)",
              }}>
                {label}
              </div>
            ))}
          </div>
        );
      })()}

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} style={{
            padding: "5px 6px", fontSize: 11, fontWeight: 600, color: "var(--onyx-text-mute)",
            textAlign: "center", borderRight: "0.5px solid var(--onyx-hairline)",
            borderBottom: "0.5px solid var(--onyx-hairline)",
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
          {week.map(day => {
            const iso = day.toISOString().slice(0, 10);
            const inRange = day >= start && day <= end;
            const isToday = iso === today;
            const dayItems = itemsByDate[iso] || [];
            return (
              <CalendarDropCell key={iso} date={iso}>
                <div style={{
                  fontSize: 11, fontWeight: isToday ? 700 : 400,
                  color: isToday ? "var(--onyx-cyan)" : inRange ? "var(--onyx-text-dim)" : "var(--onyx-text-mute)",
                  padding: "1px 2px",
                }}>
                  {day.getDate()}
                </div>
                {dayItems.map(item => (
                  <DraggableItem
                    key={item.id}
                    id={item.id}
                    item={item}
                    compact
                    onClick={() => onItemClick(item)}
                  />
                ))}
              </CalendarDropCell>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Kanban View ─────────────────────────────────────────────────────────────

function KanbanColumn({ status, items, onItemClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: `kanban-${status}` });
  return (
    <div style={{
      flex: "0 0 220px",
      display: "flex",
      flexDirection: "column",
      gap: 0,
      background: "var(--onyx-surface)",
      border: "0.5px solid var(--onyx-hairline-strong)",
      borderRadius: 10,
      overflow: "hidden",
    }}>
      {/* Column header */}
      <div style={{
        padding: "10px 12px",
        borderBottom: "0.5px solid var(--onyx-hairline)",
        background: "var(--onyx-surface-2)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--onyx-text-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {STATUS_LABEL[status]}
        </span>
        <span style={{
          fontSize: 11, padding: "1px 6px", borderRadius: 10,
          background: "var(--chip-bg-strong)", color: "var(--onyx-text-faint)",
        }}>
          {items.length}
        </span>
      </div>
      {/* Drop zone */}
      <div
        ref={setNodeRef}
        style={{
          flex: 1,
          padding: "8px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          minHeight: 120,
          background: isOver ? "rgba(77,208,255,0.04)" : "transparent",
          transition: "background 0.15s",
        }}
      >
        {items.map(item => (
          <DraggableItem
            key={item.id}
            id={item.id}
            item={item}
            onClick={() => onItemClick(item)}
          />
        ))}
      </div>
    </div>
  );
}

function KanbanView({ items, onItemClick }) {
  return (
    <div style={{ display: "flex", gap: 12, overflowX: "auto", alignItems: "flex-start", padding: "0 2px 12px" }}>
      {STATUSES.map(status => (
        <KanbanColumn
          key={status}
          status={status}
          items={items.filter(i => i.status === status)}
          onItemClick={onItemClick}
        />
      ))}
    </div>
  );
}

// ─── Generate Reel Modal ──────────────────────────────────────────────────────

function GenerateReelModal({ item, onClose, onReelCreated }) {
  const [phase, setPhase] = useState("generating"); // generating | picking | confirming | creating
  const [scripts, setScripts] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [error, setError] = useState("");

  // Map plan item fields to campaign generate-scripts input
  const platform = item.target_platforms?.[0]
    ? { tiktok: "TikTok", instagram: "Instagram Reels", youtube: "YouTube Shorts", linkedin: "LinkedIn", twitter: "Twitter" }[item.target_platforms[0]] || "TikTok"
    : "TikTok";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch("/api/campaign/generate-scripts", {
          method: "POST",
          body: JSON.stringify({
            brief: item.hook_text || item.topic || "Create an engaging short-form video",
            product: item.topic || item.hook_text || "Content",
            audience: "social media audience",
            tone: item.pillar === "authority" ? "educational" : item.pillar === "trend" ? "bold" : "inspirational",
            platform,
            reelCount: 3,
            theme: item.pillar,
            additionalContext: item.additional_context || undefined,
            shotSequence: item.shot_sequence || undefined,
          }),
        });
        if (!cancelled) {
          setScripts(data.scripts || []);
          setPhase("picking");
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleConfirm() {
    setPhase("creating");
    setError("");
    try {
      const script = scripts[selectedIdx];
      const reelData = await apiFetch("/api/campaign/create-reel", {
        method: "POST",
        body: JSON.stringify({ script, theme: item.pillar, platform, brand_id: item.brand_id || undefined }),
      });
      // Link reel to plan item
      const { item: updatedItem } = await apiFetch(`/api/content-plans/items/${item.id}/link-reel`, {
        method: "POST",
        body: JSON.stringify({ reel_id: reelData.id }),
      });
      onReelCreated(updatedItem, reelData.id);
    } catch (err) {
      setError(err.message);
      setPhase("picking");
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1100,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--onyx-bg-2)", border: "0.5px solid var(--onyx-hairline-strong)",
          borderRadius: 14, width: "100%", maxWidth: 560,
          padding: "28px 32px", display: "flex", flexDirection: "column", gap: 18,
          position: "relative", maxHeight: "88vh", overflowY: "auto",
        }}
      >
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "var(--chip-bg)", border: "none", color: "var(--onyx-text-faint)", width: 28, height: 28, borderRadius: 7, cursor: "pointer", fontSize: 16 }}>×</button>

        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--onyx-text)" }}>🎬 Generate Reel</h2>

        {/* Credit cost notice */}
        <div style={{
          padding: "10px 14px", borderRadius: 9,
          background: "rgba(76,211,160,0.08)", border: "1px solid rgba(76,211,160,0.25)",
          fontSize: 12, color: "var(--onyx-success)", lineHeight: 1.5,
        }}>
          ✓ <strong>No credits charged</strong> — this creates a draft reel with stock footage. AI video generation (Kling/Luma) is a separate step inside the editor.
        </div>

        {phase === "generating" && (
          <div style={{ textAlign: "center", padding: "30px 0", color: "var(--onyx-text-faint)" }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>✍️</div>
            <p style={{ margin: 0, fontSize: 14 }}>Writing 3 script options…</p>
          </div>
        )}

        {(phase === "picking" || phase === "confirming" || phase === "creating") && scripts.length > 0 && (
          <>
            <p style={{ margin: 0, fontSize: 13, color: "var(--onyx-text-faint)" }}>
              Pick a script for <strong style={{ color: "var(--onyx-text)" }}>"{item.hook_text || item.topic}"</strong>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {scripts.map((s, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedIdx(i)}
                  style={{
                    padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                    border: selectedIdx === i ? "1.5px solid var(--onyx-cyan)" : "0.5px solid var(--onyx-hairline-strong)",
                    background: selectedIdx === i ? "rgba(0,229,229,0.07)" : "var(--onyx-surface)",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 5 }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                      background: selectedIdx === i ? "var(--onyx-cyan)" : "var(--chip-bg)",
                      border: selectedIdx === i ? "none" : "1px solid var(--onyx-hairline-strong)",
                      color: selectedIdx === i ? "#06121b" : "var(--onyx-text-mute)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700,
                    }}>{i + 1}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--onyx-text)" }}>{s.title}</span>
                    <span style={{
                      marginLeft: "auto", fontSize: 10, padding: "2px 7px", borderRadius: 4,
                      background: "var(--chip-bg)", color: "var(--onyx-text-mute)",
                    }}>{s.angle}</span>
                  </div>
                  <p style={{ margin: "0 0 4px 28px", fontSize: 12, color: "var(--onyx-cyan)", fontStyle: "italic", lineHeight: 1.3 }}>
                    "{s.hook}"
                  </p>
                  <p style={{ margin: "0 0 0 28px", fontSize: 11, color: "var(--onyx-text-dim)", lineHeight: 1.4 }}>
                    {s.narration.replace(/\|/g, " · ").slice(0, 120)}…
                  </p>
                </div>
              ))}
            </div>

            {error && <p style={{ margin: 0, color: "var(--onyx-rose)", fontSize: 13 }}>{error}</p>}

            <button
              onClick={handleConfirm}
              disabled={phase === "creating"}
              className="btn-teal"
              style={{
                width: "100%", padding: "12px 20px", fontSize: 14,
                cursor: phase === "creating" ? "wait" : "pointer",
                opacity: phase === "creating" ? 0.6 : 1,
              }}
            >
              {phase === "creating" ? "Creating reel…" : "✓ Create Reel with this Script"}
            </button>
          </>
        )}

        {error && phase === "generating" && (
          <p style={{ margin: 0, color: "var(--onyx-rose)", fontSize: 13 }}>{error}</p>
        )}
      </div>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({ item, onClose, onStatusChange, onReelCreated }) {
  const navigate = useNavigate();
  const [localItem, setLocalItem] = useState(item);
  const [saving, setSaving] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [additionalContext, setAdditionalContext] = useState(item.additional_context || "");
  const [contextSaving, setContextSaving] = useState(false);
  const [shotSequence, setShotSequence] = useState(item.shot_sequence || "");
  const [shotSequenceSaving, setShotSequenceSaving] = useState(false);

  const hasReel = !!localItem.reel_id;
  // Statuses blocked once a reel exists (pre-reel states)
  const PRE_REEL = new Set(["idea", "hook_generated"]);

  async function handleStatusChange(newStatus) {
    setSaving(true);
    try {
      await apiFetch(`/api/content-plans/items/${localItem.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setLocalItem(prev => ({ ...prev, status: newStatus }));
      onStatusChange(localItem.id, newStatus);
    } catch (err) {
      console.error("Status update failed:", err);
    }
    setSaving(false);
  }

  async function handleHookSwap(hookObj) {
    if (hookObj.text === localItem.hook_text) return;
    setSaving(true);
    try {
      // Reorder hooks: put selected first, keep others
      const allHooks = localItem.hook_metadata?.hooks || [];
      const reordered = [hookObj, ...allHooks.filter(h => h.text !== hookObj.text)];
      const newMetadata = { ...localItem.hook_metadata, hooks: reordered };
      await apiFetch(`/api/content-plans/items/${localItem.id}`, {
        method: "PATCH",
        body: JSON.stringify({ hook_text: hookObj.text, hook_metadata: newMetadata }),
      });
      setLocalItem(prev => ({ ...prev, hook_text: hookObj.text, hook_metadata: newMetadata }));
    } catch (err) {
      console.error("Hook swap failed:", err);
    }
    setSaving(false);
  }

  async function handleContextBlur() {
    const trimmed = additionalContext.trim();
    if (trimmed === (localItem.additional_context || "")) return;
    setContextSaving(true);
    try {
      await apiFetch(`/api/content-plans/items/${localItem.id}`, {
        method: "PATCH",
        body: JSON.stringify({ additional_context: trimmed || null }),
      });
      setLocalItem(prev => ({ ...prev, additional_context: trimmed || null }));
    } catch (err) {
      console.error("Context save failed:", err);
    }
    setContextSaving(false);
  }

  async function handleShotSequenceBlur() {
    const trimmed = shotSequence.trim();
    if (trimmed === (localItem.shot_sequence || "")) return;
    setShotSequenceSaving(true);
    try {
      await apiFetch(`/api/content-plans/items/${localItem.id}`, {
        method: "PATCH",
        body: JSON.stringify({ shot_sequence: trimmed || null }),
      });
      setLocalItem(prev => ({ ...prev, shot_sequence: trimmed || null }));
    } catch (err) {
      console.error("Shot sequence save failed:", err);
    }
    setShotSequenceSaving(false);
  }

  function handleReelCreated(updatedItem, reelId) {
    setLocalItem(updatedItem);
    setShowGenerate(false);
    onReelCreated(updatedItem);
  }

  return (
    <>
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--onyx-bg-2)",
          border: "0.5px solid var(--onyx-hairline-strong)",
          borderRadius: 14,
          width: "100%", maxWidth: 520,
          padding: "28px 32px",
          display: "flex", flexDirection: "column", gap: 18,
          position: "relative",
          maxHeight: "85vh", overflowY: "auto",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 14, right: 14,
            background: "var(--chip-bg)", border: "none",
            color: "var(--onyx-text-faint)", width: 28, height: 28,
            borderRadius: 7, cursor: "pointer", fontSize: 16, lineHeight: "28px",
            textAlign: "center",
          }}
        >×</button>

        {/* Header */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <PillarBadge pillar={localItem.pillar} />
          <StatusBadge status={localItem.status} />
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--onyx-text-mute)" }}>
            {new Date(localItem.target_date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>

        {/* Topic */}
        {localItem.topic && (
          <div>
            <label style={labelStyle}>Topic / Niche</label>
            <p style={valueStyle}>{localItem.topic}</p>
          </div>
        )}

        {/* Hook text */}
        {localItem.hook_text && (
          <div>
            <label style={labelStyle}>Hook Text</label>
            <p style={{ ...valueStyle, fontSize: 15, fontWeight: 500, lineHeight: 1.5, color: "var(--onyx-text)" }}>
              "{localItem.hook_text}"
            </p>
          </div>
        )}

        {/* Additional context */}
        <div>
          <label style={labelStyle}>
            Additional Context <span style={{ color: "var(--onyx-text-mute)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
            {contextSaving && <span style={{ marginLeft: 8, color: "var(--onyx-text-mute)", fontSize: 10, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>saving…</span>}
          </label>
          <textarea
            value={additionalContext}
            onChange={e => setAdditionalContext(e.target.value)}
            onBlur={handleContextBlur}
            placeholder="Add talking points, stats, key details or specific angles you want in the reel scenes…"
            rows={3}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "8px 10px", borderRadius: 8, resize: "vertical",
              background: "var(--onyx-surface)", border: "0.5px solid var(--onyx-hairline-strong)",
              color: "var(--onyx-text)", fontSize: 13, lineHeight: 1.5,
              fontFamily: "inherit", outline: "none", marginTop: 4,
            }}
          />
        </div>

        {/* Shot sequence */}
        <div>
          <label style={labelStyle}>
            Shot Sequence <span style={{ color: "var(--onyx-text-mute)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
            {shotSequenceSaving && <span style={{ marginLeft: 8, color: "var(--onyx-text-mute)", fontSize: 10, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>saving…</span>}
          </label>
          <textarea
            value={shotSequence}
            onChange={e => setShotSequence(e.target.value)}
            onBlur={handleShotSequenceBlur}
            placeholder="Describe the shot order or framing you want, e.g. wide establishing shot, then close-up, then product shot…"
            rows={3}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "8px 10px", borderRadius: 8, resize: "vertical",
              background: "var(--onyx-surface)", border: "0.5px solid var(--onyx-hairline-strong)",
              color: "var(--onyx-text)", fontSize: 13, lineHeight: 1.5,
              fontFamily: "inherit", outline: "none", marginTop: 4,
            }}
          />
        </div>

        {/* Platforms */}
        <div>
          <label style={labelStyle}>Target Platforms</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
            {(localItem.target_platforms || []).map(p => (
              <span key={p} style={{
                padding: "3px 10px", borderRadius: 6, fontSize: 12,
                background: "var(--chip-bg)", border: "0.5px solid var(--onyx-hairline-strong)",
                color: "var(--onyx-text-dim)",
              }}>
                {PLATFORM_ICON[p] || ""} {p}
              </span>
            ))}
          </div>
        </div>

        {/* Status changer */}
        <div>
          <label style={labelStyle}>Status</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
            {STATUSES.map(s => {
              const isBlocked = hasReel && PRE_REEL.has(s);
              const isCurrent = s === localItem.status;
              return (
                <button
                  key={s}
                  disabled={saving || isBlocked}
                  onClick={() => !isCurrent && !isBlocked && handleStatusChange(s)}
                  title={isBlocked ? "Can't move back — a reel has been created for this item" : undefined}
                  style={{
                    padding: "4px 10px", borderRadius: 6, fontSize: 11,
                    cursor: isCurrent || isBlocked ? "default" : "pointer",
                    fontWeight: isCurrent ? 700 : 400,
                    background: isCurrent ? (STATUS_COLOR[s]?.bg || "var(--chip-bg)") : "var(--chip-bg)",
                    border: isCurrent ? `1px solid ${STATUS_COLOR[s]?.text || "var(--onyx-hairline)"}` : "0.5px solid var(--onyx-hairline)",
                    color: isBlocked ? "var(--onyx-text-mute)" : isCurrent ? (STATUS_COLOR[s]?.text || "var(--onyx-text)") : "var(--onyx-text-faint)",
                    opacity: isBlocked ? 0.45 : 1,
                    transition: "all 0.15s",
                  }}
                >
                  {STATUS_LABEL[s]}
                </button>
              );
            })}
          </div>
          {hasReel && (
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--onyx-text-mute)" }}>
              Idea and Hook Generated are locked — a reel has been created for this item.
            </p>
          )}
        </div>

        {/* Hook variations — all hooks from metadata, clickable to swap active */}
        {localItem.hook_metadata?.hooks?.length > 0 && (
          <div>
            <label style={labelStyle}>Hook Variations <span style={{ color: "var(--onyx-text-mute)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(click to use)</span></label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
              {localItem.hook_metadata.hooks.map((h, i) => {
                const isActive = h.text === localItem.hook_text;
                return (
                  <div
                    key={i}
                    onClick={() => !saving && handleHookSwap(h)}
                    style={{
                      padding: "8px 10px", borderRadius: 7, cursor: saving ? "default" : "pointer",
                      background: isActive ? "rgba(0,229,229,0.08)" : "var(--onyx-surface)",
                      border: isActive ? "1px solid rgba(0,229,229,0.45)" : "0.5px solid var(--onyx-hairline)",
                      fontSize: 12, color: isActive ? "var(--onyx-text)" : "var(--onyx-text-dim)", lineHeight: 1.4,
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: isActive ? "var(--onyx-cyan)" : "var(--onyx-text-mute)" }}>
                        {h.framework}
                      </span>
                      {isActive && (
                        <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--onyx-cyan)", background: "rgba(0,229,229,0.15)", padding: "1px 5px", borderRadius: 4 }}>
                          active
                        </span>
                      )}
                    </div>
                    "{h.text}"
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Reel link (post-generation) */}
        {hasReel && (
          <div style={{
            padding: "12px 14px", borderRadius: 9,
            background: "rgba(0,229,229,0.07)", border: "1px solid rgba(0,229,229,0.25)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>🎬</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--onyx-cyan)" }}>Reel Created</p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--onyx-text-mute)" }}>ID: {localItem.reel_id}</p>
            </div>
            <button
              onClick={() => { onClose(); navigate(`/editor?reelId=${localItem.reel_id}`); }}
              className="btn-teal"
              style={{ padding: "6px 14px", fontSize: 12 }}
            >
              Open in Editor →
            </button>
          </div>
        )}

        {/* Generate Reel button */}
        {!hasReel && (
          <button
            onClick={() => setShowGenerate(true)}
            className="btn-teal"
            style={{ marginTop: 4, padding: "11px 20px", fontSize: 14 }}
          >
            🎬 Generate Reel
          </button>
        )}
      </div>
    </div>

    {showGenerate && (
      <GenerateReelModal
        item={localItem}
        onClose={() => setShowGenerate(false)}
        onReelCreated={handleReelCreated}
      />
    )}
    </>
  );
}

const labelStyle = { display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--onyx-text-mute)", marginBottom: 2 };
const valueStyle = { margin: 0, fontSize: 13, color: "var(--onyx-text-dim)", lineHeight: 1.4 };

// ─── Create Plan Modal ────────────────────────────────────────────────────────

function CreatePlanModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(0); return d.toISOString().slice(0, 10);
  });
  const [cadence, setCadence] = useState(3);
  const [selectedPlatforms, setSelectedPlatforms] = useState(["tiktok", "instagram"]);
  const [niche, setNiche] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [brandId, setBrandId] = useState(null);
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function togglePlatform(p) {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
    setEstimate(null);
  }

  async function handleEstimate() {
    if (!name.trim() || !niche.trim() || !selectedPlatforms.length) {
      setError("Fill in name, niche, and at least one platform");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/api/content-plans/generate", {
        method: "POST",
        body: JSON.stringify({ name, start_date: startDate, end_date: endDate, cadence, platforms: selectedPlatforms, niche, extra_context: extraContext, brand_id: brandId }),
      });
      setEstimate(data.estimated);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function handleConfirm() {
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/api/content-plans/generate", {
        method: "POST",
        body: JSON.stringify({ name, start_date: startDate, end_date: endDate, cadence, platforms: selectedPlatforms, niche, extra_context: extraContext, brand_id: brandId, confirm: true }),
      });
      onCreated(data.plan);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  const inputStyle = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    background: "var(--input-bg)", border: "0.5px solid var(--onyx-hairline-strong)",
    color: "var(--onyx-text)", fontSize: 13, outline: "none", boxSizing: "border-box",
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "var(--onyx-bg-2)", border: "0.5px solid var(--onyx-hairline-strong)",
        borderRadius: 14, width: "100%", maxWidth: 500, padding: "28px 30px",
        display: "flex", flexDirection: "column", gap: 16, position: "relative",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "var(--chip-bg)", border: "none", color: "var(--onyx-text-faint)", width: 28, height: 28, borderRadius: 7, cursor: "pointer", fontSize: 16 }}>×</button>
        <h2 style={{ margin: 0, fontSize: 18, color: "var(--onyx-text)", fontWeight: 700 }}>Plan a Month</h2>

        <div>
          <label style={labelStyle}>Plan Name</label>
          <input style={inputStyle} value={name} onChange={e => { setName(e.target.value); setEstimate(null); }} placeholder="e.g. July — AI Tips" />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Start Date</label>
            <input type="date" style={inputStyle} value={startDate} onChange={e => { setStartDate(e.target.value); setEstimate(null); }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>End Date</label>
            <input type="date" style={inputStyle} value={endDate} onChange={e => { setEndDate(e.target.value); setEstimate(null); }} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Posts per Week</label>
          <div style={{ display: "flex", gap: 6 }}>
            {[1,2,3,4,5,7].map(n => (
              <button key={n} onClick={() => { setCadence(n); setEstimate(null); }} style={{
                padding: "6px 12px", borderRadius: 7, fontSize: 13, cursor: "pointer",
                background: cadence === n ? "var(--onyx-cyan)" : "var(--chip-bg)",
                color: cadence === n ? "#06121b" : "var(--onyx-text-dim)",
                border: "0.5px solid var(--onyx-hairline-strong)", fontWeight: cadence === n ? 700 : 400,
              }}>{n}</button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Platforms</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {PLATFORMS.map(p => (
              <button key={p} onClick={() => togglePlatform(p)} style={{
                padding: "5px 10px", borderRadius: 7, fontSize: 12, cursor: "pointer",
                background: selectedPlatforms.includes(p) ? "rgba(77,208,255,0.15)" : "var(--chip-bg)",
                border: selectedPlatforms.includes(p) ? "1px solid var(--onyx-cyan)" : "0.5px solid var(--onyx-hairline-strong)",
                color: selectedPlatforms.includes(p) ? "var(--onyx-cyan)" : "var(--onyx-text-dim)",
                fontWeight: selectedPlatforms.includes(p) ? 600 : 400,
              }}>
                {PLATFORM_ICON[p]} {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Niche / Topic</label>
          <input style={inputStyle} value={niche} onChange={e => { setNiche(e.target.value); setEstimate(null); }} placeholder="e.g. AI video editing tips" />
        </div>

        <div>
          <label style={labelStyle}>Brand (optional)</label>
          <BrandSelector value={brandId} onChange={(id) => setBrandId(id)} />
        </div>

        <div>
          <label style={labelStyle}>Additional Context (optional)</label>
          <textarea
            style={{ ...inputStyle, minHeight: 72, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
            value={extraContext}
            onChange={e => setExtraContext(e.target.value)}
            placeholder="Any extra context, trending topics, product launches, or specific angles to include across the plan…"
          />
        </div>

        {error && <p style={{ margin: 0, color: "var(--onyx-rose)", fontSize: 13 }}>{error}</p>}

        {!estimate ? (
          <button
            onClick={handleEstimate}
            disabled={loading}
            style={{
              padding: "11px 20px", borderRadius: 9, fontWeight: 700, fontSize: 14, cursor: loading ? "wait" : "pointer",
              background: "var(--btn-primary-grad)", color: "var(--btn-primary-text)", border: "none",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Estimating…" : "Get Estimate"}
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{
              padding: "12px 14px", borderRadius: 9,
              background: "rgba(77,208,255,0.07)", border: "1px solid rgba(77,208,255,0.2)",
              fontSize: 13, color: "var(--onyx-text-dim)", lineHeight: 1.5,
            }}>
              <strong style={{ color: "var(--onyx-text)" }}>
                {estimate.posts} posts
              </strong>{" "}
              across{" "}
              {new Date(startDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              {" – "}
              {new Date(endDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              {estimate.free_for_plan ? (
                <><br /><span style={{ color: "var(--onyx-success)" }}>✓ Free for your plan — no credits deducted</span></>
              ) : (
                <><br />Credit cost: <strong style={{ color: "var(--onyx-amber)" }}>{estimate.total_credits} credits</strong></>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setEstimate(null)}
                style={{
                  flex: 1, padding: "10px", borderRadius: 9, fontWeight: 600, fontSize: 13,
                  background: "var(--chip-bg)", border: "0.5px solid var(--onyx-hairline-strong)",
                  color: "var(--onyx-text-dim)", cursor: "pointer",
                }}
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                style={{
                  flex: 2, padding: "10px 20px", borderRadius: 9, fontWeight: 700, fontSize: 14,
                  background: "var(--btn-primary-grad)", color: "var(--btn-primary-text)", border: "none",
                  cursor: loading ? "wait" : "pointer", opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? "Generating…" : `Confirm — Generate ${estimate.posts} Posts`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContentPlan() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [plan, setPlan] = useState(null);
  const [items, setItems] = useState([]);
  const [view, setView] = useState("calendar"); // "calendar" | "kanban"
  const [loading, setLoading] = useState(true);
  const [planLoading, setPlanLoading] = useState(false);
  const [activeItem, setActiveItem] = useState(null); // drag overlay
  const [detailItem, setDetailItem] = useState(null); // modal
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // Load plan list
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { plans: list } = await apiFetch("/api/content-plans");
        setPlans(list || []);
        if (list?.length > 0) setSelectedPlanId(list[0].id);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    })();
  }, []);

  // Load selected plan + items
  useEffect(() => {
    if (!selectedPlanId) return;
    setPlanLoading(true);
    setPlan(null);
    setItems([]);
    apiFetch(`/api/content-plans/${selectedPlanId}`)
      .then(({ plan: p }) => {
        setPlan(p);
        setItems(p.items || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setPlanLoading(false));
  }, [selectedPlanId]);

  function handleDragStart(event) {
    const item = items.find(i => i.id === event.active.id);
    setActiveItem(item || null);
  }

  async function handleDragEnd(event) {
    setActiveItem(null);
    const { active, over } = event;
    if (!over || !active) return;

    const itemId = active.id;
    const dest = over.id;

    if (dest.startsWith("cal-")) {
      // Calendar drop — update target_date
      const newDate = dest.replace("cal-", "");
      const item = items.find(i => i.id === itemId);
      if (!item || item.target_date === newDate) return;
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, target_date: newDate } : i));
      try {
        await apiFetch(`/api/content-plans/items/${itemId}`, {
          method: "PATCH",
          body: JSON.stringify({ target_date: newDate }),
        });
      } catch (err) {
        // Roll back
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, target_date: item.target_date } : i));
      }
    } else if (dest.startsWith("kanban-")) {
      // Kanban drop — update status
      const newStatus = dest.replace("kanban-", "");
      const item = items.find(i => i.id === itemId);
      if (!item || item.status === newStatus) return;
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: newStatus } : i));
      try {
        await apiFetch(`/api/content-plans/items/${itemId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus }),
        });
      } catch (err) {
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: item.status } : i));
      }
    }
  }

  function handleItemClick(item) {
    setDetailItem(item);
  }

  function handleStatusChange(itemId, newStatus) {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: newStatus } : i));
    if (detailItem?.id === itemId) setDetailItem(d => ({ ...d, status: newStatus }));
  }

  function handleReelCreated(updatedItem) {
    setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
    setDetailItem(updatedItem);
  }

  function handlePlanCreated(newPlan) {
    setPlans(prev => [newPlan, ...prev]);
    setSelectedPlanId(newPlan.id);
    setShowCreate(false);
  }

  if (loading) return (
    <div style={pageWrap}>
      <p style={{ color: "var(--onyx-text-faint)", padding: 40 }}>Loading plans…</p>
    </div>
  );

  return (
    <div style={pageWrap}>
      {/* Page Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--onyx-text)" }}>Content Plan</h1>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--onyx-text-faint)" }}>Plan, batch-generate, and track your content calendar</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: "9px 18px", borderRadius: 9, fontWeight: 700, fontSize: 13,
            background: "var(--btn-primary-grad)", color: "var(--btn-primary-text)", border: "none", cursor: "pointer",
          }}
        >
          + Plan a Month
        </button>
      </div>

      {error && <p style={{ color: "var(--onyx-rose)", marginBottom: 12 }}>{error}</p>}

      {plans.length === 0 ? (
        <div style={{
          padding: "60px 40px", textAlign: "center",
          background: "var(--onyx-surface)", border: "0.5px solid var(--onyx-hairline-strong)",
          borderRadius: 14,
        }}>
          <p style={{ margin: "0 0 6px", fontSize: 18, color: "var(--onyx-text)", fontWeight: 700 }}>No plans yet</p>
          <p style={{ margin: "0 0 20px", color: "var(--onyx-text-faint)" }}>Generate your first month of content in one click.</p>
          <button onClick={() => setShowCreate(true)} style={{ padding: "10px 24px", borderRadius: 9, background: "var(--btn-primary-grad)", color: "var(--btn-primary-text)", border: "none", cursor: "pointer", fontWeight: 700 }}>
            Plan a Month
          </button>
        </div>
      ) : (
        <>
          {/* Controls bar */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
            {/* Plan selector */}
            <select
              value={selectedPlanId || ""}
              onChange={e => setSelectedPlanId(e.target.value)}
              style={{
                padding: "7px 12px", borderRadius: 8,
                background: "var(--input-bg)", border: "0.5px solid var(--onyx-hairline-strong)",
                color: "var(--onyx-text)", fontSize: 13, cursor: "pointer",
              }}
            >
              {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            {plan && (
              <span style={{ fontSize: 12, color: "var(--onyx-text-mute)" }}>
                {new Date(plan.start_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                {" – "}
                {new Date(plan.end_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                {" · "}
                {items.length} items
              </span>
            )}

            {/* View toggle */}
            <div style={{ marginLeft: "auto", display: "flex", background: "var(--chip-bg)", borderRadius: 8, padding: 2 }}>
              {["calendar", "kanban"].map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: view === v ? "var(--onyx-surface-2)" : "transparent",
                    border: view === v ? "0.5px solid var(--onyx-hairline-strong)" : "none",
                    color: view === v ? "var(--onyx-text)" : "var(--onyx-text-faint)",
                    transition: "all 0.15s",
                  }}
                >
                  {v === "calendar" ? "📅 Calendar" : "📋 Kanban"}
                </button>
              ))}
            </div>
          </div>

          {/* Plan legend */}
          <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            {PILLARS.map(p => (
              <span key={p} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--onyx-text-dim)" }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: PILLAR_COLOR[p].text }} />
                {p}
              </span>
            ))}
            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--onyx-text-mute)" }}>
              Drag cards to update dates (calendar) or status (kanban)
            </span>
          </div>

          {planLoading ? (
            <p style={{ color: "var(--onyx-text-faint)", padding: 40 }}>Loading items…</p>
          ) : plan ? (
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div style={{
                background: "var(--onyx-surface)",
                border: "0.5px solid var(--onyx-hairline-strong)",
                borderRadius: 12,
                overflow: "hidden",
              }}>
                {view === "calendar" ? (
                  <CalendarView
                    plan={plan}
                    items={items}
                    onItemClick={handleItemClick}
                    onItemMove={() => {}}
                  />
                ) : (
                  <div style={{ padding: "14px" }}>
                    <KanbanView items={items} onItemClick={handleItemClick} />
                  </div>
                )}
              </div>

              {/* Drag overlay */}
              <DragOverlay>
                {activeItem ? <ItemCard item={activeItem} compact isDragging /> : null}
              </DragOverlay>
            </DndContext>
          ) : null}
        </>
      )}

      {/* Modals */}
      {detailItem && (
        <DetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onStatusChange={handleStatusChange}
          onReelCreated={handleReelCreated}
        />
      )}
      {showCreate && (
        <CreatePlanModal
          onClose={() => setShowCreate(false)}
          onCreated={handlePlanCreated}
        />
      )}
    </div>
  );
}

const pageWrap = {
  padding: "30px 32px",
  maxWidth: 1200,
  margin: "0 auto",
  minHeight: "60vh",
  fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
};
