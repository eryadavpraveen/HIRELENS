# Integration test report (Express stack)

Old FastAPI apps (`backend/`, `attention_service/`) have been **removed**.

Active runtime under test:

- `backend-node/` (Express Main + Vision Worker)
- `attention-node/` (Express Attention + Attention Worker)

Latest automated run (this cleanup verification): **32 passed / 0 failed** via `scripts/integration-test.mjs`, plus WebRTC signaling suite **9/9** and tunnel validation **12/12**.

See `README.md` / `MIGRATION_EXPRESS.md` for current architecture.
