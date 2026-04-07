#!/bin/sh
set -e

# Start API in background
node /app/api/dist/index.js &
API_PID=$!

# Start Web
node /app/web/server.js &
WEB_PID=$!

# Shutdown both on exit
trap "kill $API_PID $WEB_PID 2>/dev/null; exit" TERM INT

wait $API_PID $WEB_PID
