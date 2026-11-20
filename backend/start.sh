#!/bin/bash
set -e

echo "🔵 Starting ArchitectAI Backend..."

# Create output directory
mkdir -p output

# Install dependencies
pip install -r requirements.txt --quiet

# Copy env if not present
if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠️  Created .env from .env.example — please add your ANTHROPIC_API_KEY"
  exit 1
fi

# Activate venv if it exists
if [ -d "venv" ]; then
  source venv/bin/activate
fi

# Start FastAPI
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
