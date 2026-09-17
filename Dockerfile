# Multi-stage optimized production Dockerfile for NavaRail backend
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Install system dependencies needed for LightGBM, SQLite, and network tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    curl \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Install CPU-only PyTorch first (reduces image size from 4.5GB down to ~800MB)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Install remaining Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend codebase, trained ML models, and data
COPY server/ /app/server/
COPY data/ /app/data/

# Expose REST & WebSocket port
EXPOSE 8000
EXPOSE 8080

# Launch production server with 2 workers for concurrent WebSocket streams
CMD ["sh", "-c", "uvicorn server.api.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2"]
