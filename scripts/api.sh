#!/bin/bash
# Kanbu API Server Management Script
# Usage: ./scripts/api.sh [start|stop|restart|status]

# Setup PATH for pnpm/node
export PATH="/home/robin/snap/code/217/.local/share/pnpm/nodejs/22.21.1/bin:/home/robin/snap/code/217/.local/share/pnpm:$PATH"

API_DIR="/home/robin/genx/v6/dev/kanbu/apps/api"
API_PORT=3001
PID_FILE="/tmp/kanbu-api.pid"

start_api() {
    if lsof -ti :$API_PORT > /dev/null 2>&1; then
        echo "API already running on port $API_PORT"
        return 1
    fi

    cd "$API_DIR"
    echo "Starting Kanbu API on port $API_PORT..."
    nohup pnpm dev > /tmp/kanbu-api.log 2>&1 &
    echo $! > "$PID_FILE"
    sleep 2

    if lsof -ti :$API_PORT > /dev/null 2>&1; then
        echo "API started successfully (PID: $(cat $PID_FILE))"
    else
        echo "API failed to start. Check /tmp/kanbu-api.log"
        return 1
    fi
}

stop_api() {
    echo "Stopping Kanbu API..."

    # Kill by port
    if lsof -ti :$API_PORT > /dev/null 2>&1; then
        lsof -ti :$API_PORT | xargs kill -9 2>/dev/null
        echo "Killed processes on port $API_PORT"
    fi

    # Clean up PID file
    rm -f "$PID_FILE"

    sleep 1
    if lsof -ti :$API_PORT > /dev/null 2>&1; then
        echo "Warning: Port $API_PORT still in use"
        return 1
    else
        echo "API stopped"
    fi
}

status_api() {
    if lsof -ti :$API_PORT > /dev/null 2>&1; then
        echo "API is RUNNING on port $API_PORT"
        lsof -i :$API_PORT
    else
        echo "API is NOT running"
    fi
}

restart_api() {
    stop_api
    sleep 1
    start_api
}

case "$1" in
    start)
        start_api
        ;;
    stop)
        stop_api
        ;;
    restart)
        restart_api
        ;;
    status)
        status_api
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac
