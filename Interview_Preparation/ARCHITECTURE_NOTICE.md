# Architecture notice

Interview preparation notes in this folder may still describe the **legacy FastAPI** layout (`backend/`, `attention_service/`, Uvicorn).

**Active production runtime:**

- `backend-node/` — Express Main + Python Vision Worker
- `attention-node/` — Express Attention + Python Attention Worker
- No FastAPI / Uvicorn / Gunicorn HTTP servers

Prefer `README.md` and `MIGRATION_EXPRESS.md` at the repo root for current architecture.
