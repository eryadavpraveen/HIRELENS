from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import cast, String
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.participant import Participant
from app.models.interview import Interview
from app.models.user import User
from app.auth.dependencies import require_student, get_or_create_student_participant
from app.auth.auth import get_current_user

router = APIRouter()


@router.post("/{interview_id}/join")
def join_interview(
    interview_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    participant = get_or_create_student_participant(db, interview_id, current_user)
    return {
        "message": "Joined interview",
        "participant_id": str(participant.id),
    }


@router.get("/{interview_id}/participants")
def get_participants(
    interview_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    if current_user.role == "recruiter":
        if str(interview.recruiter_id) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized for this interview")
    elif current_user.role == "student":
        participant = (
            db.query(Participant)
            .filter(
                cast(Participant.interview_id, String) == str(interview_id),
                cast(Participant.student_id, String) == str(current_user.id),
            )
            .first()
        )
        if not participant:
            raise HTTPException(status_code=403, detail="Not authorized for this interview")
    else:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    participants = (
        db.query(Participant)
        .filter(cast(Participant.interview_id, String) == str(interview_id))
        .all()
    )

    results = []
    for participant in participants:
        student = db.query(User).filter(cast(User.id, String) == str(participant.student_id)).first()
        if not student:
            student = db.query(User).filter(User.id == participant.student_id).first()
        results.append(
            {
                "id": str(participant.id),
                "interview_id": str(participant.interview_id),
                "student_id": str(participant.student_id),
                "joined_at": participant.joined_at.isoformat() if participant.joined_at else None,
                "name": student.name if student else None,
                "email": student.email if student else None,
            }
        )

    return results
