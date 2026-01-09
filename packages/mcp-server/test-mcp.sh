#!/bin/bash
export PATH="/home/robin/snap/code/217/.local/share/pnpm/nodejs/22.21.1/bin:$PATH"
cd /home/robin/genx/v6/dev/kanbu/packages/mcp-server

echo "Testing MCP server..."
{
  echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
  sleep 0.2
  echo '{"jsonrpc":"2.0","method":"notifications/initialized"}'
  sleep 0.2
  echo '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
  sleep 0.5
} | timeout 5 node dist/index.js
