"""
Interview cascade-delete service.

Removes every interview-scoped artifact in one atomic operation:
  * violations, participants, interview row (PostgreSQL)
  * verification photos on disk
  * voice registrations in the attention service (in-memory)
  * WebSocket room state (in-memory)

If any step fails the database transaction is rolled back so no orphan
DB rows remain. External cleanup (files / voice / WS) runs before commit;
on failure the pending DB deletes are rolled back.
"""

import logging
import os
import re
import requests
from sqlalchemy.orm import Session

from app.models.interview import Interview
from app.models.participant import Participant
from app.models.violation import Violation
from app.api.signaling import manager

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(__file__)
    )
)

VERIFICATION_DIR = os.path.join(BASE_DIR, "uploads", "verification")
ATTENTION_SERVICE_URL = os.getenv("ATTENTION_SERVICE_URL", "http://localhost:8001")


def safe_candidate_id(candidate_id: str) -> str:
    return re.sub(r"[^A-Za-z0-9_-]", "_", candidate_id or "unknown")


def _verification_photo_path(candidate_id: str) -> str:
    return os.path.join(VERIFICATION_DIR, f"{safe_candidate_id(candidate_id)}.jpg")


def _collect_cleanup_targets(interview_id: str, participants: list) -> tuple[set, set]:
    """Return (candidate_ids, photo_file_paths) to purge for this interview."""
    candidate_ids = {str(interview_id)}
    photo_paths: set[str] = set()

    for participant in participants:
        candidate_ids.add(str(participant.student_id))
        if participant.verification_photo:
            photo_paths.add(participant.verification_photo)

    for candidate_id in candidate_ids:
        photo_paths.add(_verification_photo_path(candidate_id))

    return candidate_ids, photo_paths


def _delete_verification_photos(photo_paths: set[str]) -> int:
    deleted = 0
    for path in photo_paths:
        if os.path.isfile(path):
            os.remove(path)
            deleted += 1
            logger.info("Deleted verification photo: %s", path)
    return deleted


def _delete_voice_registration(candidate_id: str) -> bool:
    """Remove a voiceprint from the attention service. 404 is treated as success."""
    url = f"{ATTENTION_SERVICE_URL}/voice/{candidate_id}"
    response = requests.delete(url, timeout=10)
    if response.status_code in (200, 404):
        logger.info("Voice registration removed for candidate_id=%s (status=%s)", candidate_id, response.status_code)
        return response.status_code == 200
    raise RuntimeError(
        f"Voice delete failed for {candidate_id}: HTTP {response.status_code} {response.text}"
    )


def delete_interview_cascade(db: Session, interview_id: str) -> dict | None:
    """
    Delete an interview and all associated data atomically.

    Returns a summary dict on success, or None when the interview does not exist.
    Raises on any cleanup failure (DB transaction rolled back).
    """
    interview = (
        db.query(Interview)
        .filter(Interview.id == interview_id)
        .first()
    )
    if not interview:
        return None

    participants = (
        db.query(Participant)
        .filter(Participant.interview_id == interview_id)
        .all()
    )

    candidate_ids, photo_paths = _collect_cleanup_targets(interview_id, participants)

    try:
        violations_deleted = (
            db.query(Violation)
            .filter(Violation.interview_id == interview_id)
            .delete(synchronize_session=False)
        )

        participants_deleted = (
            db.query(Participant)
            .filter(Participant.interview_id == interview_id)
            .delete(synchronize_session=False)
        )

        db.delete(interview)
        db.flush()

        photos_deleted = _delete_verification_photos(photo_paths)

        voices_deleted = 0
        for candidate_id in candidate_ids:
            if _delete_voice_registration(candidate_id):
                voices_deleted += 1

        websocket_peers_evicted = manager.evict_room(str(interview_id))

        db.commit()

        summary = {
            "message": "Interview deleted successfully",
            "id": str(interview_id),
            "violations_deleted": violations_deleted,
            "participants_deleted": participants_deleted,
            "verification_photos_deleted": photos_deleted,
            "voice_registrations_deleted": voices_deleted,
            "websocket_peers_evicted": websocket_peers_evicted,
            "reports_deleted": violations_deleted,
        }

        logger.info(
            "Interview cascade delete completed: interview_id=%s violations=%d participants=%d "
            "photos=%d voices=%d ws_peers=%d",
            interview_id,
            violations_deleted,
            participants_deleted,
            photos_deleted,
            voices_deleted,
            websocket_peers_evicted,
        )

        return summary

    except Exception:
        db.rollback()
        logger.exception("Interview cascade delete failed; transaction rolled back: interview_id=%s", interview_id)
        raise
