# Main Express API + Python Vision Worker (NDJSON; no Python HTTP server).
# Render: runtime docker, dockerfilePath ./backend-node/Dockerfile, context ./backend-node

FROM node:20-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive \
    NODE_ENV=production \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY python_vision_worker/requirements.txt ./python_vision_worker/requirements.txt
RUN python3 -m venv /opt/vision-venv \
    && /opt/vision-venv/bin/pip install --upgrade pip \
    && /opt/vision-venv/bin/pip install -r python_vision_worker/requirements.txt

COPY . .

# Ensure YOLO weights and worker modules are present in image
RUN test -f python_vision_worker/yolov8n.pt \
    && test -f python_vision_worker/worker.py

ENV PYTHON_PATH=/opt/vision-venv/bin/python \
    VISION_WORKER_SCRIPT=/app/python_vision_worker/worker.py

EXPOSE 8000

# Render injects PORT; Express reads process.env.PORT
CMD ["node", "src/index.js"]
