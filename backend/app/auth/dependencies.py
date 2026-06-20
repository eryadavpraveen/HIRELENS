from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.auth import get_current_user
from app.database.database import get_db
from app.models.interview import Interview
from app.models.participant import Participant
from app.models.user import User


def require_roles(*roles: str):
    def _dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return _dependency


require_recruiter = require_roles("recruiter")
require_student = require_roles("student")


def get_interview_or_404(
    interview_id: str,
    db: Session = Depends(get_db),
) -> Interview:
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview


def authorize_recruiter_interview(
    interview: Interview,
    current_user: User = Depends(require_recruiter),
) -> Interview:
    if str(interview.recruiter_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized for this interview")
    return interview


def authorize_student_participant(
    interview_id: str,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> Participant:
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
    return participant


def authorize_student_interview_access(
    interview_id: str,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> Interview:
    """Student may access an interview they joined, or verify before join if interview is open."""
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if interview.status == "completed":
        raise HTTPException(status_code=400, detail="Interview has already been completed")

    participant = (
        db.query(Participant)
        .filter(
            Participant.interview_id == interview_id,
            Participant.student_id == str(current_user.id),
        )
        .first()
    )
    if not participant:
        raise HTTPException(status_code=403, detail="Join the interview before accessing it")
    return interview


def ensure_student_participant(db: Session, interview_id: str, user: User) -> Participant:
    participant = (
        db.query(Participant)
        .filter(
            Participant.interview_id == interview_id,
            Participant.student_id == str(user.id),
        )
        .first()
    )
    if not participant:
        raise HTTPException(status_code=403, detail="Not authorized for this interview")
    return participant


def authorize_student_verification(
    interview_id: str,
    candidate_id: str,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> Interview:
    if candidate_id != interview_id:
        raise HTTPException(status_code=400, detail="candidate_id must match interview id")

    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if interview.status == "completed":
        raise HTTPException(status_code=400, detail="Interview has already been completed")

    participant = (
        db.query(Participant)
        .filter(
            Participant.interview_id == interview_id,
            Participant.student_id == str(current_user.id),
        )
        .first()
    )
    if not participant:
        raise HTTPException(status_code=403, detail="Join the interview before verification")
    return interview
