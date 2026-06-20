from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.violation import Violation
from app.models.interview import Interview
from app.models.participant import Participant
from app.schemas.violation import ViolationCreate
from app.auth.auth import get_current_user
from app.auth.dependencies import require_student, require_recruiter
from app.models.user import User

router = APIRouter()


@router.post("/")
def create_violation(
    violation: ViolationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    interview = (
        db.query(Interview)
        .filter(Interview.id == violation.interview_id)
        .first()
    )

    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    if interview.status == "completed":
        raise HTTPException(status_code=400, detail="Interview has already been completed")

    participant = (
        db.query(Participant)
        .filter(
            Participant.interview_id == violation.interview_id,
            Participant.student_id == str(current_user.id),
        )
        .first()
    )
    if not participant:
        raise HTTPException(status_code=403, detail="Not authorized for this interview")

    new_violation = Violation(
        interview_id=violation.interview_id,
        student_id=str(current_user.id),
        type=violation.type,
        duration=violation.duration,
        confidence=violation.confidence,
    )

    db.add(new_violation)
    db.commit()
    db.refresh(new_violation)

    return {
        "message": "Violation recorded",
        "id": str(new_violation.id),
    }


@router.get("/{interview_id}")
def get_violations(
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

    violations = (
        db.query(Violation)
        .filter(Violation.interview_id == interview_id)
        .order_by(Violation.timestamp.asc())
        .all()
    )

    return violations
