# HIRELENS (InterviewAI)

AI-proctored remote interviews: WebRTC video between recruiter and student, real-time integrity monitoring (face, gaze, voice, objects), and downloadable reports.

| Layer | Host |
|-------|------|
| Frontend | [Vercel](https://hirelens-puce-two.vercel.app) |
| Database | Supabase (PostgreSQL) |
| Backend API + signaling | Your PC (`:8000`) via Cloudflare tunnel |
| Attention / voice ML | Your PC (`:8001`, internal) |

**Full technical docs:** [`docs/HIRELENS_DOCUMENTATION.md`](docs/HIRELENS_DOCUMENTATION.md)

---

## Prerequisites

- Windows PC (for free-tier backend hosting)
- Python 3.11+ with venv at `mediapipe_env/`
- Node 18+ (only if you build frontend locally)
- [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) installed
- Supabase project + env vars in `backend/.env`
- Vercel project linked to this repo

---

## Quick start: PC backend + Vercel frontend

### 1. Backend environment (`backend/.env`)

```env
FRONTEND_URL=https://hirelens-puce-two.vercel.app
ATTENTION_SERVICE_URL=http://127.0.0.1:8001
DATABASE_URL=postgresql://...
SECRET_KEY=your-secret-key
```

### 2. Install Python dependencies (once)

```powershell
D:\Desktop\InterviewAI_1\mediapipe_env\Scripts\python.exe -m pip install -r D:\Desktop\InterviewAI_1\backend\requirements.txt
```

WebRTC video requires WebSockets:

```powershell
D:\Desktop\InterviewAI_1\mediapipe_env\Scripts\python.exe -m pip install "uvicorn[standard]" websockets
```

### 3. Start services (three terminals)

**Terminal 1 — Attention (`:8001`)**

```powershell
cd D:\Desktop\InterviewAI_1\attention_service
..\mediapipe_env\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8001
```

**Terminal 2 — Backend (`:8000`)**

```powershell
cd D:\Desktop\InterviewAI_1\backend
..\mediapipe_env\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Wait for `Application startup complete`, then test:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/
```

Expected: `InterviewAI Backend Running`

**Terminal 3 — Cloudflare tunnel**

```powershell
cloudflared tunnel --url http://localhost:8000
```

Copy the URL printed in the terminal, for example:

```text
https://random-words.trycloudflare.com
```

Keep all three terminals open while using the app.

---

## Connect Vercel to your PC

The tunnel URL **changes** whenever you restart `cloudflared`. After each restart:

1. Copy the new `https://....trycloudflare.com` from the tunnel terminal (or `deploy/tunnel-api.log` if using the start script).
2. Vercel → Project → **Settings** → **Environment Variables** (Production):

| Variable | Example |
|----------|---------|
| `VITE_API_BASE_URL` | `https://random-words.trycloudflare.com` |
| `VITE_WS_BASE_URL` | `wss://random-words.trycloudflare.com` |
| `VITE_USE_MOCK` | `false` |

3. **Deployments** → **Redeploy** (use **Redeploy without cache** if the URL changed).

4. Verify the tunnel reaches your backend:

```powershell
Invoke-RestMethod https://YOUR-tunnel.trycloudflare.com/
```

**Rules:** paste only the URL (no Windows paths). Use `wss://` for WebSocket, not `https://`. No trailing slash.

---

## Local development (everything on one PC)

```powershell
# Backend :8000, Attention :8001 (see above)

cd frontend
npm install
npm run dev
```

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_WS_BASE_URL=ws://127.0.0.1:8000
VITE_USE_MOCK=false
```

Open http://localhost:5173

---

## Optional: start script

```cmd
D:\Desktop\InterviewAI_1\deploy\start-free-windows.bat
```

Starts attention, backend, and tunnel in the background. Logs: `deploy/backend-err.log`, `deploy/tunnel-api.log`.

---

## Repository structure

```text
backend/           FastAPI API, WebSocket signaling, CV/identity/object
attention_service/ MediaPipe attention + voice verification
frontend/          React + Vite (deployed to Vercel)
deploy/            Tunnel notes, Windows start scripts, tests
docs/              Full technical documentation
```

---

## Troubleshooting

| Problem | What to check |
|---------|----------------|
| Login / API fails on Vercel | Backend running? Tunnel URL correct in Vercel? Redeploy after env change |
| CORS error in browser | `FRONTEND_URL` in `backend/.env` matches your Vercel URL |
| 502 on API | Backend crashed — terminal 2 or `deploy/backend-err.log` |
| Video stuck on "Connecting" | `websockets` installed; WebSocket URL is `wss://` same host as API |
| Tunnel URL unknown | Read output of `cloudflared` or `deploy/tunnel-api.log` |

---

## License & links

- **GitHub:** https://github.com/eryadavpraveen/HIRELENS
- **Production app:** https://hirelens-puce-two.vercel.app
- **Documentation:** https://drive.google.com/file/d/1Zm6oYHtleAHODCNt6UWASCwYfnQuCPUc/view?usp=sharing
