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
# No timeframe arguments, it loads all today's sessions (up to 2500)
echo "🚀 Starting Backend API on port 3001..."
python3 src/server.py > api_logs.txt 2>&1 &

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 5

# Start Vite Frontend (preview mode since we built it)
echo "🌐 Starting UI (Port 5173)..."
npx vite preview --port 5173 --host
