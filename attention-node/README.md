# HIRELENS Express Attention Service

Attention analysis + voice verification for HIRELENS.

## Architecture

- **Express** — `/attention/analyze`, `/voice/*`, JWT auth, voiceprint DB
- **Prisma** — shared PostgreSQL (`voiceprints`, `participants`)
- **Python Attention Worker** — MediaPipe + Resemblyzer via NDJSON (not a web server)

## Setup

```bash
cd attention-node
copy .env.example .env
# DATABASE_URL + SECRET_KEY must match Main Express

npm install
npx prisma generate

# Worker venv (once)
cd python_attention_worker
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
cd ..
# Set PYTHON_PATH=...\python_attention_worker\.venv\Scripts\python.exe in .env

# Model asset required:
# python_attention_worker/models/face_landmarker.task

npm start
```

Default port: **8001** (Main Express `ATTENTION_SERVICE_URL` target; keep local-only).

## Endpoints

- `GET /`
- `POST /attention/analyze` (multipart `file`)
- `POST /voice/register` (multipart `candidate_id` + `audio`, Bearer student JWT)
- `POST /voice/verify`
- `DELETE /voice/:candidateId`
