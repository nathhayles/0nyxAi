#!/usr/bin/env bash
set -euo pipefail

TRIM_REF="trim-working-v1"

echo "== Restore EXACT working trim from: $TRIM_REF =="

# 0) Safety snapshot (won't lose anything)
git add -A || true
git commit -m "WIP: before restoring working trim" || true

# 1) Verify ref exists
git rev-parse --verify "$TRIM_REF" >/dev/null 2>&1 || {
  echo "ERROR: ref '$TRIM_REF' not found. Try: git tag --list | grep trim"
  exit 1
}

# 2) Show which files exist in that ref (so we restore the correct ones)
echo "== Files in $TRIM_REF (trim-related) =="
git ls-tree -r --name-only "$TRIM_REF" | egrep -i 'trim|video|player|editor\.jsx|main\.jsx|main\.js|editor\.css' || true
echo

# 3) Restore EXACT files from the working trim ref (overwrite current)
#    (These are the usual trim touchpoints; if any don't exist in your repo, git will warn.)
git checkout "$TRIM_REF" -- \
  src/pages/Editor.jsx \
  src/main.jsx \
  src/main.js \
  src/styles/editor.css \
  src/state/trimLogic.js \
  src/state/playerBridge.js \
  src/state/editorDelegation.js \
  src/state/videoPlayer.js \
  src/state/videojsPlayer.js \
  src/state/trimUI.js 2>/dev/null || true

# 4) Show what changed
echo "== Diff after restore =="
git diff --name-only || true

# 5) Commit restore
git add -A
git commit -m "Restore exact working trim (from trim-working-v1)" || true

echo
echo "== Restarting Vite =="
rm -rf node_modules/.vite
npm run dev
