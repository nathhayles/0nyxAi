import { canExport } from "./exportGate";

export function handleExport({
  credits,
  durationSeconds,
  onAllowed,
  onBlocked,
}: {
  credits: number;
  durationSeconds: number;
  onAllowed: () => void;
  onBlocked: () => void;
}) {
  if (!canExport(credits, durationSeconds)) {
    onBlocked();
    return;
  }
  onAllowed();
}
