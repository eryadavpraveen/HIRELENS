-- Migration 001_add_interviews_completed_at
-- Adds completion timestamp for interview locking (PATCH /interviews/{id}/complete).

ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITHOUT TIME ZONE NULL;

COMMENT ON COLUMN interviews.completed_at IS
  'UTC timestamp when the interview was marked completed (recruiter or TAB_SWITCH auto-complete).';
