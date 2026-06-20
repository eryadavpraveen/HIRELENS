from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.participant import Participant
from app.models.interview import Interview
from app.auth.dependencies import require_student
from app.models.user import User
from app.auth.auth import get_current_user

router = APIRouter()


@router.post("/{interview_id}/join")
def join_interview(
    interview_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    if interview.status == "completed":
        raise HTTPException(
            status_code=400,
            detail="This interview has already been completed.",
        )

    existing = (
        db.query(Participant)
        .filter(
            Participant.interview_id == interview_id,
            Participant.student_id == str(current_user.id),
        )
        .first()
    )

    if existing:
        return {"message": "Already joined"}

    participant = Participant(
        interview_id=interview_id,
        student_id=str(current_user.id),
    )

    db.add(participant)
    db.commit()
    db.refresh(participant)

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
                Participant.interview_id == interview_id,
                Participant.student_id == str(current_user.id),
            )
            .first()
        )
        if not participant:
            raise HTTPException(status_code=403, detail="Not authorized for this interview")
    else:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    participants = (
        db.query(Participant)
        .filter(Participant.interview_id == interview_id)
        .all()
    )

    return participants
