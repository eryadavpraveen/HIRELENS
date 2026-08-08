# HIRELENS Express Main Backend

Main API + WebSocket signaling for HIRELENS.

## Architecture

- **Express** — REST API + WebSocket signaling
- **Prisma** — PostgreSQL/Supabase
- **Cloudinary** — verification photo storage
- **Python Vision Worker** — OpenCV / DeepFace / YOLO via NDJSON (not a web server)
- **Attention proxy** → Express Attention (`attention-node` on port **8001**)

## Setup

```bash
cd backend-node
copy .env.example .env
# Set DATABASE_URL, SECRET_KEY, CLOUDINARY_*, ATTENTION_SERVICE_URL=http://127.0.0.1:8001

npm install
npx prisma generate

# Worker venv (once)
cd python_vision_worker
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
cd ..
# Set PYTHON_PATH=...\python_vision_worker\.venv\Scripts\python.exe in .env

npm start
```

Default port: **8000**.

## Notes

- Verification images are stored in Cloudinary; URLs go in `participants.verification_photo`.
- Tunnel via `npm run tunnel` (see `../deploy/CLOUDFLARE_TUNNEL.md`).
