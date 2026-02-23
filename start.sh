#!/bin/bash
#
# Kanbu Development Startup Script
# Starts all required services for local development
#
# Usage: ./start.sh
#
# Supports: Linux, macOS (Intel & Apple Silicon)
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                 Kanbu Development Startup                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Cross-platform port check (macOS uses lsof, Linux uses ss)
port_in_use() {
    local port="$1"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        lsof -i ":$port" -sTCP:LISTEN -t &>/dev/null
    else
        ss -tlnp 2>/dev/null | grep -q ":$port"
    fi
}

# 0. Build workspace packages (required before starting apps)
echo -e "${YELLOW}[0/3]${NC} Building workspace packages..."
if pnpm build > /tmp/kanbu-build.log 2>&1; then
    echo -e "      ${GREEN}✓${NC} Packages built"
else
    echo -e "      ${RED}✗${NC} Build failed - check /tmp/kanbu-build.log"
    exit 1
fi

# 1. Check/Start PostgreSQL Docker container
echo -e "${YELLOW}[1/3]${NC} Checking PostgreSQL..."
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "kanbu-postgres"; then
    echo -e "      ${GREEN}✓${NC} PostgreSQL already running"
else
    echo "      Starting PostgreSQL container..."
    cd docker
    docker compose up -d postgres
    cd ..
    sleep 3
    echo -e "      ${GREEN}✓${NC} PostgreSQL started"
fi

# 2. Start API Server
echo -e "${YELLOW}[2/3]${NC} Starting API Server..."
if port_in_use 3001; then
    echo -e "      ${GREEN}✓${NC} API already running on :3001"
else
    cd apps/api
    pnpm dev > /tmp/kanbu-api.log 2>&1 &
    API_PID=$!
    cd ../..
    sleep 4
    if port_in_use 3001; then
        echo -e "      ${GREEN}✓${NC} API started on :3001 (PID: $API_PID)"
    else
        echo -e "      ${RED}✗${NC} API failed to start - check /tmp/kanbu-api.log"
        exit 1
    fi
fi

# 3. Start Web Server
echo -e "${YELLOW}[3/3]${NC} Starting Web Server..."
if port_in_use 5173; then
    echo -e "      ${GREEN}✓${NC} Web already running on :5173"
else
    cd apps/web
    pnpm dev > /tmp/kanbu-web.log 2>&1 &
    WEB_PID=$!
    cd ../..
    sleep 4
    if port_in_use 5173; then
        echo -e "      ${GREEN}✓${NC} Web started on :5173 (PID: $WEB_PID)"
    else
        echo -e "      ${RED}✗${NC} Web failed to start - check /tmp/kanbu-web.log"
        exit 1
    fi
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Kanbu is ready!                                              ║"
echo "║                                                                ║"
echo "║  Web:  http://localhost:5173                                  ║"
echo "║  API:  http://localhost:3001                                  ║"
echo "║  DB:   postgresql://kanbu:***@localhost:5432/kanbu           ║"
echo "║                                                                ║"
echo "║  Logs: /tmp/kanbu-api.log, /tmp/kanbu-web.log                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
