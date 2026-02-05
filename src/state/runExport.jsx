import { canExport } from "./exportGate";

export async function runExport({
  credits,
  durationSeconds,
  ux,
  onSuccess,
}) {
  if (!canExport(credits, durationSeconds)) {
    ux.fail(`Not enough credits (${durationSeconds} needed)`);
    return;
  }

  try {
    ux.start();
    await onSuccess();
    ux.finish();
  } catch (e) {
    ux.fail("Export failed. Try again.");
  }
}
