# Attention Express API + Python Attention Worker (NDJSON; no Python HTTP server).
# Render: runtime docker, dockerfilePath ./attention-node/Dockerfile, context ./attention-node

FROM node:20-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive \
    NODE_ENV=production \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8001

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
    libsndfile1 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY python_attention_worker/requirements.txt ./python_attention_worker/requirements.txt
RUN python3 -m venv /opt/attention-venv \
    && /opt/attention-venv/bin/pip install --upgrade pip \
    && /opt/attention-venv/bin/pip install -r python_attention_worker/requirements.txt

COPY . .

# MediaPipe face landmarker model must ship with the image
RUN test -f python_attention_worker/models/face_landmarker.task \
    && test -f python_attention_worker/worker.py

ENV PYTHON_PATH=/opt/attention-venv/bin/python \
    ATTENTION_WORKER_SCRIPT=/app/python_attention_worker/worker.py

EXPOSE 8001

CMD ["node", "src/index.js"]
