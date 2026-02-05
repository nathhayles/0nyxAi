export function canExport(credits: number, durationSeconds: number) {
  return credits >= durationSeconds;
}
