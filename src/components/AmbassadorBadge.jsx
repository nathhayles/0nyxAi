// Ambassador badge (navbar) and usage panel (Studio), from GET /api/ambassador/me.
// Renders nothing for normal accounts.
import useAmbassador from "../hooks/useAmbassador.js";
import { ambassadorUsageSummary } from "../utils/ambassador.js";

export function AmbassadorBadge() {
  const { ambassador } = useAmbassador();
  const u = ambassadorUsageSummary(ambassador);
  if (!u) return null;
  const title = `Ambassador (${u.tierLabel}) · ${u.spent}/${u.cap} credits used this month · ${u.voUsed}/${u.voQuota} voiceover minutes`;
  return (
    <span
      title={title}
      aria-label={title}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999,
        fontSize: 11, fontWeight: 700, letterSpacing: "0.3px", whiteSpace: "nowrap",
        color: "var(--onyx-cyan)", border: "1px solid var(--onyx-cyan)", background: "transparent",
      }}
    >
      ★ Ambassador · {u.tierLabel}
    </span>
  );
}

function Bar({ label, used, total, unit }) {
  const pct = total > 0 ? Math.min(1, used / total) : 1;
  const color = pct < 0.75 ? "#10b981" : pct < 0.9 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ minWidth: 210, flex: 1 }}>
      <div style={{ fontSize: 11, color: "var(--onyx-text-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>{label}</div>
      <div style={{ height: 6, borderRadius: 3, background: "var(--chip-bg-strong)", overflow: "hidden", marginBottom: 6 }}>
        <div style={{ width: `${Math.round(pct * 100)}%`, height: "100%", background: color }} />
      </div>
      <div style={{ fontSize: 12, color, fontWeight: 600 }}>{used}/{total} {unit} used this month</div>
    </div>
  );
}

export function AmbassadorUsagePanel() {
  const { ambassador } = useAmbassador();
  const u = ambassadorUsageSummary(ambassador);
  if (!u) return null;
  return (
    <div style={{ padding: "12px 16px", background: "var(--onyx-surface)", border: "1px solid var(--onyx-hairline-strong)", borderRadius: 12, display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
      <AmbassadorBadge />
      <Bar label="Ambassador limit" used={u.spent} total={u.cap} unit="credits" />
      <Bar label="Voiceover minutes" used={u.voUsed} total={u.voQuota} unit="mins" />
      <div style={{ fontSize: 11, color: "var(--onyx-text-faint)", flexBasis: "100%" }}>
        Rendering, downloads and sharing are free. Exports include a short Onyx Reelz ad. Limits reset on the 1st (UTC).
      </div>
    </div>
  );
}
