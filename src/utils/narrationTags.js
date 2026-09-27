// Mirrors the backend's stripNarrationTags (lib/resolveTaggedEntities.js in
// 0nyxAi-backend) -- keep the regexes identical. Cleans tag syntax out of
// narration before it's displayed as a caption (the export's burned-in
// captions use the backend copy):
//   - "@Name:" speaker labels are removed entirely ("@Opal: Hello" -> "Hello")
//   - inline "@Name" mentions keep the name ("Welcome @Opal!" -> "Welcome Opal!")
// Capture group instead of a lookbehind for older mobile Safari; the
// preceding-char check leaves emails like a@b.com alone.
const SPEAKER_LABEL_TAG_RE = /(^|[^A-Za-z0-9_.])@[A-Za-z0-9_]+:/g;
const INLINE_MENTION_TAG_RE = /(^|[^A-Za-z0-9_.])@([A-Za-z0-9_]+)/g;

export function stripNarrationTags(text) {
  return String(text || "")
    .replace(SPEAKER_LABEL_TAG_RE, "$1 ")
    .replace(INLINE_MENTION_TAG_RE, "$1$2")
    .replace(/[ \t]+([,.;:!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
