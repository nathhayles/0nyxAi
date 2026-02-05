import { canExport } from "./exportGate";

export async function runExport({
  credits,
  durationSeconds,
  ux,
  progress,
  toast,
  onSuccess,
}) {
  if (!canExport(credits, durationSeconds)) {
    toast.show(`Not enough credits (${durationSeconds} needed)`, "error");
    return;
  }

  try {
    ux.start();
    progress.start();
    toast.show("Export started…");

    await onSuccess(progress);

    progress.finish();
    toast.show("Export completed", "success");
    ux.finish();
    setTimeout(progress.reset, 500);
  } catch (e) {
    ux.fail("Export failed");
    toast.show("Export failed. Try again.", "error");
    progress.reset();
  }
}
