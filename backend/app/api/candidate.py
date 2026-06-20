from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.interview import Interview
from app.models.participant import Participant
from app.models.user import User
from app.auth.dependencies import require_recruiter

router = APIRouter()


@router.get("/")
def list_candidates(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    interviews = (
        db.query(Interview)
        .filter(Interview.recruiter_id == str(current_user.id))
        .all()
    )
    if not interviews:
        return []

    interview_status = {str(i.id): i.status for i in interviews}
    interview_ids = list(interview_status.keys())

    participants = (
        db.query(Participant)
        .filter(Participant.interview_id.in_(interview_ids))
        .all()
    )

    stats: dict[str, dict] = defaultdict(lambda: {"interviews": 0, "has_active": False})
    student_ids: set[str] = set()

    for participant in participants:
        student_id = str(participant.student_id)
        student_ids.add(student_id)
        stats[student_id]["interviews"] += 1
        status = interview_status.get(str(participant.interview_id), "")
        if status in ("scheduled", "active"):
            stats[student_id]["has_active"] = True

    if not student_ids:
        return []

    users = db.query(User).filter(User.id.in_(list(student_ids))).all()
    results = []
    for user in users:
        student_id = str(user.id)
        entry = stats[student_id]
        results.append(
            {
                "id": student_id,
                "name": user.name,
                "email": user.email,
                "interviews": entry["interviews"],
                "status": "active" if entry["has_active"] else "completed",
            }
        )

    results.sort(key=lambda row: row["name"].lower())
    return results
