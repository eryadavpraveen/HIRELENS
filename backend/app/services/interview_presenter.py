"""Shared interview/report presentation helpers."""
from sqlalchemy import cast, String
from sqlalchemy.orm import Session

from app.models.participant import Participant
from app.models.user import User
from app.models.interview import Interview
from app.models.violation import Violation


def student_for_interview(db: Session, interview_id) -> tuple[str | None, str | None]:
    interview_key = str(interview_id)

    participant = (
        db.query(Participant)
        .filter(cast(Participant.interview_id, String) == interview_key)
        .order_by(Participant.joined_at.asc())
        .first()
    )

    student_id = participant.student_id if participant else None

    if not student_id:
        violation = (
            db.query(Violation)
            .filter(cast(Violation.interview_id, String) == interview_key)
            .order_by(Violation.timestamp.asc())
            .first()
        )
        if violation:
            student_id = violation.student_id

    if not student_id:
        return None, None

    student = db.query(User).filter(cast(User.id, String) == str(student_id)).first()
    if not student:
        student = db.query(User).filter(User.id == student_id).first()
    if not student:
        return None, None

    return student.name, student.email


def recruiter_for_interview(db: Session, recruiter_id) -> tuple[str | None, str | None]:
    recruiter = db.query(User).filter(cast(User.id, String) == str(recruiter_id)).first()
    if not recruiter:
        recruiter = db.query(User).filter(User.id == recruiter_id).first()
    if not recruiter:
        return None, None
    return recruiter.name, recruiter.email


def serialize_interview(db: Session, interview: Interview) -> dict:
    candidate_name, candidate_email = student_for_interview(db, interview.id)
    recruiter_name, recruiter_email = recruiter_for_interview(db, interview.recruiter_id)
    return {
        "id": str(interview.id),
        "title": interview.title,
        "description": interview.description,
        "recruiter_id": str(interview.recruiter_id),
        "recruiter_name": recruiter_name,
        "recruiter_email": recruiter_email,
        "status": interview.status,
        "completion_status": interview.status,
        "start_time": interview.start_time.isoformat() if interview.start_time else None,
        "end_time": interview.end_time.isoformat() if interview.end_time else None,
        "completed_at": interview.completed_at.isoformat() if interview.completed_at else None,
        "created_at": interview.created_at.isoformat() if interview.created_at else None,
        "candidate_name": candidate_name,
        "candidate_email": candidate_email,
    }
