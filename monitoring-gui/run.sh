#!/bin/bash
set -e

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "Installing dependencies..."
pip install -r requirements.txt

echo "Running Meet Monitor..."
# Ensure python finds the modules in src/
export PYTHONPATH=$PYTHONPATH:$(pwd)/src
python src/main.py
