#!/bin/sh
set -e

# Prefix each line of a process's output with a tag
prefix() {
  local tag="$1"
  shift
  "$@" 2>&1 | while IFS= read -r line; do
    echo "${tag} ${line}"
  done
}

echo "[gitvise] Starting backend on port ${PORT_API:-3001}..."
prefix "[api]" uvicorn main:app \
  --host 0.0.0.0 \
  --port "${PORT_API:-3001}" \
  --app-dir /app/backend &
BACKEND_PID=$!

echo "[gitvise] Starting frontend on port ${PORT_WEB:-3000}..."
prefix "[web]" env \
  HOSTNAME=0.0.0.0 \
  PORT="${PORT_WEB:-3000}" \
  NEXT_PUBLIC_API_URL="http://localhost:${PORT_API:-3001}" \
  node /app/frontend/server.js &
FRONTEND_PID=$!

# Shutdown both on SIGTERM / SIGINT
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" TERM INT

wait $BACKEND_PID $FRONTEND_PID
