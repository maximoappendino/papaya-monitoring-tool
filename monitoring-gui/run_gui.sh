#!/bin/bash

# Setup environment
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt --quiet
pip install flask flask-cors --quiet

# Kill existing background processes on exit
trap "kill 0" EXIT

# Start Python API in background
echo "🚀 Starting Backend API (Port 3001)..."
python3 src/server.py > api_logs.txt 2>&1 &

# Start Vite Frontend (preview mode since we built it)
echo "🌐 Starting UI (Port 5173)..."
npx vite preview --port 5173 --host
