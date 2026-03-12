#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
#  DECP Platform — Demo Runner
#  Usage: ./run-demo.sh
#
#  What this does:
#   1. Checks Node.js + Playwright are available
#   2. Installs Playwright Chromium browser if missing
#   3. Runs the headed demo as Omar Hassan (alumni)
#      → sends messages to Liam Foster (log in on mobile as Liam)
#   4. Cleans up everything created, so the demo is idempotent
# ══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEMO_JS="$SCRIPT_DIR/scripts/demo.js"

# ── Colours ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[demo]${NC} $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $*"; }
error() { echo -e "${RED}[error]${NC} $*"; exit 1; }

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  DECP Platform — Architecture Demo Runner               ║"
echo "║  CO528 Applied Software Architecture Mini Project        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── 1. Node.js ───────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
    error "node not found. Install Node.js 18+ first."
fi
info "Node: $(node --version)"

# ── 2. Playwright package ────────────────────────────────────────────────────
cd "$SCRIPT_DIR"
if [ ! -d node_modules/playwright ]; then
    warn "playwright not found — installing…"
    npm install --save-dev playwright@1.48 --quiet
fi
info "Playwright: $(node -e "console.log(require('playwright/package.json').version)")"

# ── 3. Chromium browser ───────────────────────────────────────────────────────
CHROMIUM_CACHE="$HOME/.cache/ms-playwright/chromium-*/chrome-linux/chrome"
if ! ls $CHROMIUM_CACHE &>/dev/null; then
    info "Installing Playwright Chromium browser…"
    node_modules/.bin/playwright install chromium
fi
info "Chromium: ready"

# ── 4. Hint ────────────────────────────────────────────────────────────────
echo ""
echo "  Before starting, make sure these are running:"
echo "  ┌─────────────────────────────────────────────────────┐"
echo "  │  Backend:  docker compose up -d                     │"
echo "  │  Web app:  cd web && npm run dev  (port 3100)       │"
echo "  └─────────────────────────────────────────────────────┘"
echo ""
echo "  On your mobile device, log in as:"
echo "  ┌─────────────────────────────────────────────────────┐"
echo "  │  Email:    liam.foster@decp.io                      │"
echo "  │  Password: Pass1234                                 │"
echo "  │  Open the Messages tab to see incoming messages      │"
echo "  └─────────────────────────────────────────────────────┘"
echo ""

# 5-second countdown
for i in 5 4 3 2 1; do
    echo -ne "\r  Starting demo in ${i}s… (Ctrl+C to abort)  "
    sleep 1
done
echo -e "\r  Starting demo now!                              "
echo ""

# ── 5. Run ───────────────────────────────────────────────────────────────────
node "$DEMO_JS"
EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    info "Demo finished. Run ./run-demo.sh again to repeat."
else
    warn "Demo exited with code $EXIT_CODE. Cleanup was still attempted."
fi
echo ""
