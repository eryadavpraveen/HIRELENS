from fastapi import APIRouter, UploadFile, File, Form, Depends
import os
import re

from sqlalchemy.orm import Session

from app.database.database import get_db
from app.auth.dependencies import require_student, get_or_create_student_participant
from app.models.user import User

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads", "verification")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def safe_candidate_id(candidate_id: str) -> str:
    return re.sub(r"[^A-Za-z0-9_-]", "_", candidate_id or "unknown")


@router.post("/upload")
async def upload_verification_photo(
    candidate_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    get_or_create_student_participant(db, candidate_id, current_user)

    filename = f"{safe_candidate_id(candidate_id)}.jpg"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as buffer:
        buffer.write(await file.read())

    return {
        "status": "REGISTERED",
        "candidate_id": candidate_id,
        "photo_path": filepath,
    }
