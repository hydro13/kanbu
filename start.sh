#!/bin/bash
#
# Kanbu Development Startup Script
# Starts all required services for local development
#
# Usage: ./start.sh
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

# 1. Check/Start PostgreSQL Docker container
echo -e "${YELLOW}[1/3]${NC} Checking PostgreSQL..."
if sudo docker ps --format '{{.Names}}' | grep -q "kanbu-postgres"; then
    echo -e "      ${GREEN}✓${NC} PostgreSQL already running"
else
    echo "      Starting PostgreSQL container..."
    cd docker
    sudo docker compose up -d
    cd ..
    sleep 2
    echo -e "      ${GREEN}✓${NC} PostgreSQL started"
fi

# 2. Start API Server
echo -e "${YELLOW}[2/3]${NC} Starting API Server..."
if ss -tlnp 2>/dev/null | grep -q ":3001"; then
    echo -e "      ${GREEN}✓${NC} API already running on :3001"
else
    cd apps/api
    pnpm dev > /tmp/kanbu-api.log 2>&1 &
    API_PID=$!
    cd ../..
    sleep 3
    if ss -tlnp 2>/dev/null | grep -q ":3001"; then
        echo -e "      ${GREEN}✓${NC} API started on :3001 (PID: $API_PID)"
    else
        echo -e "      ${RED}✗${NC} API failed to start - check /tmp/kanbu-api.log"
    fi
fi

# 3. Start Web Server
echo -e "${YELLOW}[3/3]${NC} Starting Web Server..."
if ss -tlnp 2>/dev/null | grep -q ":5173"; then
    echo -e "      ${GREEN}✓${NC} Web already running on :5173"
else
    cd apps/web
    pnpm dev > /tmp/kanbu-web.log 2>&1 &
    WEB_PID=$!
    cd ../..
    sleep 3
    if ss -tlnp 2>/dev/null | grep -q ":5173"; then
        echo -e "      ${GREEN}✓${NC} Web started on :5173 (PID: $WEB_PID)"
    else
        echo -e "      ${RED}✗${NC} Web failed to start - check /tmp/kanbu-web.log"
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
