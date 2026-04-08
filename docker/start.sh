#!/bin/sh
set -e

echo "[gitvise] Starting backend..."
cd /app/backend
uvicorn main:app --host 0.0.0.0 --port "${PORT_API:-3001}" &
BACKEND_PID=$!

echo "[gitvise] Starting frontend..."
HOSTNAME=0.0.0.0 \
  PORT="${PORT_WEB:-3000}" \
  NEXT_PUBLIC_API_URL="http://localhost:${PORT_API:-3001}" \
  node /app/frontend/server.js &
FRONTEND_PID=$!

# Shutdown both on SIGTERM / SIGINT
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" TERM INT

wait $BACKEND_PID $FRONTEND_PID
