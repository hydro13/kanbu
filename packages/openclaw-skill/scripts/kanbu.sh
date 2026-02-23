#!/usr/bin/env bash
# kanbu.sh — Universal Kanbu tRPC CLI wrapper for OpenClaw
# Usage: kanbu.sh <procedure> [json-input]
# Examples:
#   kanbu.sh project.list '{"workspaceId":534}'
#   kanbu.sh task.create '{"projectId":314,"title":"New task","workspaceId":534}'
#   kanbu.sh task.update '{"taskId":307,"title":"Updated","workspaceId":534}'
#
# Config: reads from ~/.config/kanbu/mcp.json (created by kanbu_connect pairing)
# Env overrides: KANBU_URL, KANBU_TOKEN

set -euo pipefail

# --- Config ---
CONFIG_FILE="${KANBU_CONFIG:-$HOME/.config/kanbu/mcp.json}"

if [[ -z "${KANBU_URL:-}" || -z "${KANBU_TOKEN:-}" ]]; then
  if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "ERROR: No config found. Run the Kanbu MCP pairing flow first, or set KANBU_URL + KANBU_TOKEN." >&2
    exit 1
  fi
  KANBU_URL="${KANBU_URL:-$(jq -r '.kanbuUrl' "$CONFIG_FILE")}"
  KANBU_TOKEN="${KANBU_TOKEN:-$(jq -r '.token' "$CONFIG_FILE")}"
fi

PROCEDURE="${1:?Usage: kanbu.sh <procedure> [json-input]}"
INPUT="${2:-}"

# --- Determine method: mutations use POST, queries use GET ---
# Known mutation prefixes (all others default to GET)
MUTATIONS="create|update|delete|move|add|remove|toggle|grant|revoke|deny|reset|unlock|disable|reactivate|send|cancel|resend|link|unlink|import|export|copy|apply|simulate|sync|set|regenerate|change|restore|setup|verify|bulk"

METHOD="GET"
# Extract the action part (after the dot)
ACTION="${PROCEDURE#*.}"
if [[ "$ACTION" =~ ^($MUTATIONS) ]]; then
  METHOD="POST"
fi

# --- Execute ---
CURL_OPTS=(-sk -H "Content-Type: application/json" -H "Authorization: Bearer $KANBU_TOKEN")

if [[ "$METHOD" == "GET" ]]; then
  if [[ -n "$INPUT" ]]; then
    URL="${KANBU_URL}/trpc/${PROCEDURE}?input=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$INPUT")"
  else
    URL="${KANBU_URL}/trpc/${PROCEDURE}"
  fi
  RESPONSE=$(curl "${CURL_OPTS[@]}" "$URL" 2>/dev/null)
else
  URL="${KANBU_URL}/trpc/${PROCEDURE}"
  if [[ -n "$INPUT" ]]; then
    RESPONSE=$(curl "${CURL_OPTS[@]}" -X POST -d "$INPUT" "$URL" 2>/dev/null)
  else
    RESPONSE=$(curl "${CURL_OPTS[@]}" -X POST "$URL" 2>/dev/null)
  fi
fi

# --- Output ---
# Extract result.data if present, otherwise output raw (includes errors)
if echo "$RESPONSE" | jq -e '.result.data' >/dev/null 2>&1; then
  echo "$RESPONSE" | jq '.result.data'
else
  echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
  # Exit with error if response contains error
  if echo "$RESPONSE" | jq -e '.error' >/dev/null 2>&1; then
    exit 1
  fi
fi
