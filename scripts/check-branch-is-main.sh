#!/usr/bin/env bash
# Guards against building this canonical directory from anything but main.
# This directory is what nginx serves dist/ from directly -- if it ever gets
# checked out to a feature branch (as happened repeatedly during the
# bleed-fade merge cycle, see the 2026-07-21 incident) a build run at that
# moment silently ships stale code with no error. Feature work belongs in a
# separate worktree (see scripts/README or CLAUDE.md), never in this checkout.
set -euo pipefail

BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ "$BRANCH" != "main" ]; then
  echo ""
  echo "BUILD BLOCKED: canonical checkout is on '$BRANCH', not 'main'."
  echo "This directory is what nginx serves live -- it must stay on main."
  echo "Do feature work in a worktree instead:"
  echo "    git worktree add .claude/worktrees/<name> -b <branch> main"
  echo "Then merge into main and build from here once you're back on main."
  echo ""
  exit 1
fi

exit 0
