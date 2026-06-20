-- Rollback migration 001 (optional — only if reverting completion feature schema).

ALTER TABLE interviews
  DROP COLUMN IF EXISTS completed_at;
