# HIRELENS ΓÇö Technical Documentation

**HIRELENS** (InterviewAI) is an AI-proctored remote interview platform. Recruiters create monitored interviews; students join via WebRTC video calls while computer-vision and voice models detect integrity violations in real time.

**Repository:** [github.com/eryadavpraveen/HIRELENS](https://github.com/eryadavpraveen/HIRELENS)
**LinkedIn:** [click here to see my linkedin post](https://www.linkedin.com/posts/eryadavpraveen_hirelens-softwareengineering-fullstackdevelopment-ugcPost-7477014565894139904-o7_-/?utm_source=share&utm_medium=member_desktop&rcm=ACoAADSw_ioBk2LmAm8RjwFzb-7SxfCnunP3-OI)

> **Active runtime (2026):** Express + Node.js APIs with Python **ML workers only** (no FastAPI / Flask / Uvicorn / Gunicorn HTTP servers).
> The old `backend/` and `attention_service/` FastAPI apps have been removed.

---

## Architecture

```text
React (Vite)
  Γåô
Main Express + Node.js (:8000)
  Γö£ΓöÇΓöÇ PostgreSQL / Supabase (Prisma)
  Γö£ΓöÇΓöÇ Cloudinary (verification photos)
  Γö£ΓöÇΓöÇ Python Vision Worker (OpenCV / DeepFace / YOLO via NDJSON)
  ΓööΓöÇΓöÇ Express Attention Service (:8001)  ΓåÉ local only; proxied by Main
         ΓööΓöÇΓöÇ Python Attention Worker (MediaPipe / Resemblyzer via NDJSON)
```

Optional public exposure:

```text
Internet ΓåÆ Cloudflare Tunnel ΓåÆ http://127.0.0.1:8000 (Main Express only)
```

Do **not** tunnel port `8001` or the Python workers.

---

## Repository structure

```
HIRELENS/
Γö£ΓöÇΓöÇ frontend/                 # React + Vite + Redux
Γö£ΓöÇΓöÇ backend-node/             # Main Express API + WS + Vision Worker
Γöé   Γö£ΓöÇΓöÇ src/
Γöé   Γö£ΓöÇΓöÇ prisma/
Γöé   ΓööΓöÇΓöÇ python_vision_worker/ # ML worker (+ yolov8n.pt)
Γö£ΓöÇΓöÇ attention-node/           # Attention Express + Attention Worker
Γöé   Γö£ΓöÇΓöÇ src/
Γöé   Γö£ΓöÇΓöÇ prisma/
Γöé   ΓööΓöÇΓöÇ python_attention_worker/  # ML worker (+ face_landmarker.task)
Γö£ΓöÇΓöÇ deploy/                   # Cloudflare Tunnel helpers only
Γöé   Γö£ΓöÇΓöÇ CLOUDFLARE_TUNNEL.md
Γöé   Γö£ΓöÇΓöÇ start-tunnel.ps1
Γöé   ΓööΓöÇΓöÇ cloudflare/
ΓööΓöÇΓöÇ MIGRATION_EXPRESS.md      # Migration notes
```

---

## Technology stack

| Layer | Technologies |
|-------|----------------|
| Frontend | React, Vite, Redux Toolkit, Tailwind, Axios, WebRTC |
| Main API | Express.js, Prisma, JWT, Cloudinary, `ws` |
| Attention API | Express.js, Prisma, JWT |
| Vision ML | Python worker ΓÇö OpenCV, DeepFace, Ultralytics YOLO, TensorFlow/PyTorch |
| Attention ML | Python worker ΓÇö MediaPipe, Resemblyzer, PyTorch |
| Database | PostgreSQL (Supabase) |
| Tunnel | Cloudflare `cloudflared` ΓåÆ Main Express `:8000` |

Python is used **only** for ML workers (stdin/stdout NDJSON). No Python web framework serves HTTP in production.

---

## Local development

### 1) Attention Express (spawns Attention Worker)

```powershell
cd D:\Desktop\HIRELENS\attention-node
copy .env.example .env   # if needed; fill DATABASE_URL + SECRET_KEY
npm install
npx prisma generate
npm start
```

### 2) Main Express (spawns Vision Worker)

```powershell
cd D:\Desktop\HIRELENS\backend-node
copy .env.example .env   # fill DATABASE_URL, SECRET_KEY, CLOUDINARY_*, ATTENTION_SERVICE_URL
npm install
npx prisma generate
npm start
```

`ATTENTION_SERVICE_URL` must be `http://127.0.0.1:8001`.

Worker venvs (created once):

```powershell
# Vision
cd backend-node\python_vision_worker
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt

# Attention
cd attention-node\python_attention_worker
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
```

Set `PYTHON_PATH` in each Node `.env` to the matching `.venv\Scripts\python.exe`.

### 3) Frontend

```powershell
cd D:\Desktop\HIRELENS\frontend
npm install
npm run dev
```

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_WS_BASE_URL=ws://127.0.0.1:8000
VITE_USE_MOCK=false
```

### 4) Cloudflare Tunnel (optional)

See [`deploy/CLOUDFLARE_TUNNEL.md`](deploy/CLOUDFLARE_TUNNEL.md).

```powershell
cd D:\Desktop\HIRELENS\backend-node
npm run tunnel
```

Then set frontend / Vercel:

```env
VITE_API_BASE_URL=https://<tunnel-domain>
VITE_WS_BASE_URL=wss://<tunnel-domain>
```

---

## Environment variables

### `backend-node/.env` (required)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL / Supabase |
| `SECRET_KEY` | JWT signing (must match Attention) |
| `ALGORITHM` | Usually `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` / `REFRESH_TOKEN_EXPIRE_DAYS` | Token lifetimes |
| `ATTENTION_SERVICE_URL` | `http://127.0.0.1:8001` |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Verification photos |
| `FRONTEND_URL` / `CORS_ORIGINS` | CORS |
| `PYTHON_PATH` | Vision worker Python executable |

### `attention-node/.env` (required)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Same database |
| `SECRET_KEY` | **Same as Main** |
| `PORT` | `8001` |
| `PYTHON_PATH` | Attention worker Python executable |

Never commit real `.env` files. Use `.env.example` templates.

---

## API surface (Main Express `:8000`)

Auth, interviews, participants, violations, reports, candidates, verification (Cloudinary), identity, CV face check, object detection, attention/voice **proxy**, WebSocket:

`/ws/interview/{id}?role=recruiter|student`

Attention Express (`:8001`) is called by Main only (`/attention/analyze`, `/voice/*`).

---

## Deployment notes

- Dockerfiles live under `backend-node/` and `attention-node/` (Node + Python worker in one image).
- Cloudflare Tunnel helpers live under `deploy/` (tunnel ΓåÆ Main Express only).
- Historical FastAPI/Uvicorn docs in older markdown under `docs/` or `Interview_Preparation/` are **not** the active runtime.

---

## Troubleshooting

| Symptom | Check |
|---|---|
| API unreachable from Vercel | Tunnel running? `VITE_API_BASE_URL` / `VITE_WS_BASE_URL` updated? |
| Attention 503 | Is `attention-node` up on `:8001`? Worker warmed? |
| Vision / face errors | Vision worker `.venv` + `yolov8n.pt` present? |
| CORS errors | `FRONTEND_URL` / `CORS_ORIGINS` include your Vercel origin |
| WS fails through tunnel | Use `wss://` with `https://` tunnel URL |

More tunnel detail: [`deploy/CLOUDFLARE_TUNNEL.md`](deploy/CLOUDFLARE_TUNNEL.md).

---

## License & links

- **GitHub:** https://github.com/eryadavpraveen/HIRELENS
- **Production app:** https://hirelens-puce-two.vercel.app
- **Documentation:** https://drive.google.com/file/d/1Zm6oYHtleAHODCNt6UWASCwYfnQuCPUc/view?usp=sharing
