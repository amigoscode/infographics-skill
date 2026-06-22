#!/usr/bin/env bash
#
# One-line installer for the infographic skill.
#
#   curl -fsSL https://raw.githubusercontent.com/amigoscode/infographics-skill/main/install.sh | bash
#
# Override the install location with INFOGRAPHIC_SKILL_DIR.

set -euo pipefail

REPO_URL="https://github.com/amigoscode/infographics-skill.git"
DEST="${INFOGRAPHIC_SKILL_DIR:-$HOME/.claude/skills/infographic}"

info() { printf '\033[1;35m==>\033[0m %s\n' "$1"; }
err()  { printf '\033[1;31mError:\033[0m %s\n' "$1" >&2; }

# Preflight
for cmd in git node npm; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    err "'$cmd' is required but not found. Install it and re-run."
    exit 1
  fi
done

# Clone or update
if [ -d "$DEST/.git" ]; then
  info "Updating existing install at $DEST"
  git -C "$DEST" pull --ff-only
else
  info "Cloning into $DEST"
  mkdir -p "$(dirname "$DEST")"
  git clone --depth 1 "$REPO_URL" "$DEST"
fi

cd "$DEST"

# Dependencies (also downloads a headless Chromium for Playwright)
info "Installing dependencies"
npm install

# API key scaffold
if [ ! -f .env ]; then
  cp .env.example .env
  info "Created .env from .env.example"
fi

echo
info "Installed to $DEST"
if grep -q "your-gemini-api-key-here" .env 2>/dev/null && [ -z "${GEMINI_API_KEY:-}" ]; then
  printf '\033[1;33mNext:\033[0m add your Gemini API key.\n'
  printf '   - Get one at https://aistudio.google.com/apikey\n'
  printf "   - Edit %s/.env, or run: export GEMINI_API_KEY=...\n" "$DEST"
fi
echo
echo 'Then open Claude Code and ask: "Create an infographic about how Docker works"'
