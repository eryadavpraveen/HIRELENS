"""
Single source of truth for marking an interview completed and closing
its WebSocket room with role-specific messages.
"""

from datetime import datetime
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from app.models.interview import Interview

COMPLETION_MESSAGES = {
    "RECRUITER": {
        "recruiter": "Interview completed by recruiter.",
        "student": "Interview completed by recruiter.",
        "default": "Interview completed by recruiter.",
    },
    "TAB_SWITCH": {
        "recruiter": "Interview automatically completed due to candidate tab switching.",
        "student": "Interview terminated due to tab switching. The interview has been marked as completed.",
        "default": "Interview completed.",
    },
}


def completion_ws_payload(interview_id: str, reason: str, role: str) -> dict:
    messages = COMPLETION_MESSAGES.get(reason, COMPLETION_MESSAGES["RECRUITER"])
    message = messages.get(role) or messages.get("default")
    return {
        "type": "interview-completed",
        "reason": reason,
        "interview_id": str(interview_id),
        "message": message,
    }


async def complete_interview(
    db: Session,
    interview_id: str,
    reason: str = "RECRUITER",
) -> Tuple[Optional[Interview], bool]:
    """
    Mark interview completed and notify connected peers.

    Returns (interview, newly_completed).
    If already completed, returns (interview, False) without re-closing the room.
    """
    from app.api.signaling import manager

    interview = (
        db.query(Interview)
        .filter(Interview.id == interview_id)
        .first()
    )

    if not interview:
        return None, False

    if interview.status == "completed":
        return interview, False

    interview.status = "completed"
    interview.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(interview)

    await manager.close_room(str(interview_id), reason=reason)

    return interview, True
