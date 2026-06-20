from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.interview import Interview
from app.models.participant import Participant
from app.schemas.interview import InterviewCreate, InterviewComplete, InterviewJoinPreview
from app.services.interview_cleanup import delete_interview_cascade
from app.services.interview_complete import complete_interview as complete_interview_service
from app.auth.auth import get_current_user
from app.auth.dependencies import require_recruiter, require_student
from app.models.user import User

router = APIRouter()


@router.post("/")
def create_interview(
    interview: InterviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    new_interview = Interview(
        title=interview.title,
        description=interview.description,
        recruiter_id=str(current_user.id),
        start_time=interview.start_time,
        end_time=interview.end_time,
    )

    db.add(new_interview)
    db.commit()
    db.refresh(new_interview)

    return {
        "message": "Interview created",
        "id": str(new_interview.id),
    }


@router.get("/")
def get_interviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "recruiter":
        interviews = (
            db.query(Interview)
            .filter(Interview.recruiter_id == str(current_user.id))
            .all()
        )
        return interviews

    if current_user.role == "student":
        interviews = (
            db.query(Interview)
            .join(Participant, Participant.interview_id == Interview.id)
            .filter(Participant.student_id == str(current_user.id))
            .all()
        )
        return interviews

    raise HTTPException(status_code=403, detail="Insufficient permissions")


@router.get("/{interview_id}/join-preview", response_model=InterviewJoinPreview)
def get_interview_join_preview(
    interview_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    """Allow authenticated students to validate an interview before joining."""
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    if interview.status == "completed":
        raise HTTPException(
            status_code=400,
            detail="This interview has already been completed.",
        )

    return InterviewJoinPreview(
        id=str(interview.id),
        title=interview.title,
        description=interview.description,
        status=interview.status,
        start_time=interview.start_time,
        end_time=interview.end_time,
    )


@router.get("/{interview_id}")
def get_interview(
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

    return interview


@router.patch("/{interview_id}/complete")
async def complete_interview(
    interview_id: str,
    body: InterviewComplete = InterviewComplete(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    reason = body.reason or "RECRUITER"

    if current_user.role == "recruiter":
        if str(interview.recruiter_id) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized for this interview")
    elif current_user.role == "student":
        if reason != "TAB_SWITCH":
            raise HTTPException(status_code=403, detail="Students may only complete via tab switch")
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

    interview, _ = await complete_interview_service(db, interview_id, reason=reason)

    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    return interview


@router.delete("/{interview_id}")
def delete_interview(
    interview_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_recruiter),
):
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if str(interview.recruiter_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized for this interview")

    try:
        result = delete_interview_cascade(db, interview_id)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Interview deletion failed: {exc}",
        )

    if not result:
        raise HTTPException(status_code=404, detail="Interview not found")

    return result
