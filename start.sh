#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
#  DECP Platform — Full Stack Starter
#  Usage: ./start.sh [--stop]
#
#  What this does:
#   1. Starts all backend containers via Docker Compose
#   2. Waits for the API Gateway to be healthy
#   3. Starts the Next.js web frontend on port 3100
#   4. Prints access URLs
#
#  To stop everything:  ./start.sh --stop
# ══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_LOG="$SCRIPT_DIR/.web-dev.log"
WEB_PID_FILE="$SCRIPT_DIR/.web-dev.pid"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[decp]${NC} $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $*"; }
error() { echo -e "${RED}[error]${NC} $*"; exit 1; }

# ── Stop mode ─────────────────────────────────────────────────────────────────
if [ "${1}" = "--stop" ]; then
  info "Stopping DECP Platform…"

  # Stop frontend
  if [ -f "$WEB_PID_FILE" ]; then
    WEB_PID=$(cat "$WEB_PID_FILE")
    if kill -0 "$WEB_PID" 2>/dev/null; then
      kill "$WEB_PID" && info "Frontend stopped (PID $WEB_PID)"
    fi
    rm -f "$WEB_PID_FILE"
  else
    # fallback: kill by port
    fuser -k 3100/tcp 2>/dev/null && info "Frontend stopped (port 3100)" || true
  fi

  # Stop backend
  cd "$SCRIPT_DIR"
  docker compose down
  info "All backend containers stopped."
  exit 0
fi

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  DECP Platform — Starting Full Stack                    ║"
echo "║  CO528 Applied Software Architecture Mini Project        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── 1. Check requirements ─────────────────────────────────────────────────────
command -v docker  &>/dev/null || error "docker not found. Install Docker first."
command -v node    &>/dev/null || error "node not found. Install Node.js 18+ first."
command -v npm     &>/dev/null || error "npm not found."

info "Node  : $(node --version)"
info "Docker: $(docker --version | cut -d' ' -f3 | tr -d ',')"

# ── 2. Start backend ──────────────────────────────────────────────────────────
cd "$SCRIPT_DIR"
info "Starting backend containers…"
docker compose up -d --remove-orphans

# ── 3. Wait for gateway health ────────────────────────────────────────────────
info "Waiting for API Gateway to be ready…"
for i in $(seq 1 30); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8082/health 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ]; then
    info "Gateway ready (HTTP 200) ✓"
    break
  fi
  if [ "$i" = "30" ]; then
    warn "Gateway not responding after 30s — continuing anyway."
  fi
  sleep 1
done

# ── 4. Install web dependencies if needed ────────────────────────────────────
if [ ! -d "$SCRIPT_DIR/web/node_modules" ]; then
  info "Installing web dependencies…"
  cd "$SCRIPT_DIR/web" && npm install --silent
fi

# ── 5. Start frontend ─────────────────────────────────────────────────────────
info "Starting Next.js frontend on port 3100…"
cd "$SCRIPT_DIR/web"
npm run dev > "$WEB_LOG" 2>&1 &
WEB_PID=$!
echo $WEB_PID > "$WEB_PID_FILE"

# Wait for Next.js to be ready
for i in $(seq 1 30); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3100 2>/dev/null || echo "000")
  if [ "$STATUS" != "000" ]; then
    info "Frontend ready ✓"
    break
  fi
  if [ "$i" = "30" ]; then
    warn "Frontend not responding after 30s. Check $WEB_LOG"
  fi
  sleep 1
done

# ── 6. Summary ────────────────────────────────────────────────────────────────
echo ""
echo "  ┌─────────────────────────────────────────────────────┐"
echo "  │  DECP Platform is running                           │"
echo "  │                                                     │"
echo "  │  Web app   →  http://localhost:3100                 │"
echo "  │  API       →  http://localhost:8082                 │"
echo "  │  Realtime  →  http://localhost:3010                 │"
echo "  │                                                     │"
echo "  │  Demo      →  ./run-demo.sh                        │"
echo "  │  Stop all  →  ./start.sh --stop                    │"
echo "  └─────────────────────────────────────────────────────┘"
echo ""
info "Frontend logs: $WEB_LOG"
info "Press Ctrl+C to stop the frontend (backend keeps running)."
echo ""

# Keep running so Ctrl+C kills the frontend
trap "info 'Stopping frontend…'; kill $WEB_PID 2>/dev/null; rm -f $WEB_PID_FILE; info 'Frontend stopped. Run: docker compose down to stop backend.'; exit 0" INT
wait $WEB_PID
