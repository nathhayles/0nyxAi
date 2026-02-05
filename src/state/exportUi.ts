export function exportUiState(credits, duration) {
  if (credits < duration) {
    return { disabled: true, help: `Needs ${duration} credits` };
  }
  return { disabled: false, help: "" };
}
