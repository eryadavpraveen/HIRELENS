# FastAPI → Express Migration (complete)

Old FastAPI applications (`backend/`, `attention_service/`) have been **removed**.

## Active architecture

```text
React → Express Main (:8000)
          ├── Prisma / PostgreSQL
          ├── Cloudinary (verification photos)
          ├── Python Vision Worker (NDJSON)
          └── Express Attention (:8001)
                ├── Prisma / PostgreSQL
                └── Python Attention Worker (NDJSON)
```

No FastAPI / Flask / Uvicorn / Gunicorn / Starlette HTTP servers in the active stack.
Python runs only as ML workers spawned by Express.

## Replacements

| Removed | Active |
|---|---|
| `backend/` (FastAPI) | `backend-node/` |
| `attention_service/` (FastAPI) | `attention-node/` |
| `interviewai_env/`, `mediapipe_env/` | `*/python_*_worker/.venv` |

## Environment

Use `backend-node/.env.example` and `attention-node/.env.example`.
If you still need values from the old FastAPI env, a local copy may exist at `local-env-backups/backend.env` (gitignored — never commit).

## Start

```powershell
cd attention-node; npm start
cd backend-node; npm start
cd frontend; npm run dev
# optional tunnel:
cd backend-node; npm run tunnel
```

## Tunnel

See `deploy/CLOUDFLARE_TUNNEL.md`. Origin: `http://127.0.0.1:8000` only.
