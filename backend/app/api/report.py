from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.interview import Interview
from app.models.violation import Violation
from app.auth.dependencies import require_recruiter
from app.models.user import User

router = APIRouter()


def _build_report(interview: Interview, violations: list[Violation]) -> dict:
    events = [
        {
            "id": str(v.id),
            "type": v.type,
            "duration": v.duration,
            "confidence": v.confidence,
            "timestamp": v.timestamp.isoformat() if v.timestamp else None,
            "message": v.type.replace("_", " "),
        }
        for v in violations
    ]
    return {
        "id": str(interview.id),
        "interview_id": str(interview.id),
        "title": interview.title,
        "candidate_name": None,
        "events": events,
        "status": interview.status,
    }


@router.get("/")
def list_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    interviews = (
        db.query(Interview)
        .filter(Interview.recruiter_id == str(current_user.id))
        .all()
    )
    reports = []
    for interview in interviews:
        violations = (
            db.query(Violation)
            .filter(Violation.interview_id == str(interview.id))
            .order_by(Violation.timestamp.asc())
            .all()
        )
        reports.append(_build_report(interview, violations))
    return reports


@router.get("/{report_id}")
def get_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    interview = db.query(Interview).filter(Interview.id == report_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Report not found")
    if str(interview.recruiter_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized for this report")

    violations = (
        db.query(Violation)
        .filter(Violation.interview_id == report_id)
        .order_by(Violation.timestamp.asc())
        .all()
    )
    return _build_report(interview, violations)


@router.post("/generate/{interview_id}")
def generate_report(
    interview_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if str(interview.recruiter_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized for this interview")

    return {
        "message": "Report generated",
        "report_id": str(interview.id),
    }
