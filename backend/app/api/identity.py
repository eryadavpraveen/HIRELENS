from fastapi import APIRouter, UploadFile, File, Form, Depends
import tempfile
import os
import re

from sqlalchemy.orm import Session

from app.database.database import get_db
from app.services.face_verification import verify_faces
from app.auth.dependencies import require_student, ensure_student_participant
from app.models.user import User

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
VERIFICATION_DIR = os.path.join(BASE_DIR, "uploads", "verification")


def safe_candidate_id(candidate_id: str) -> str:
    return re.sub(r"[^A-Za-z0-9_-]", "_", candidate_id or "unknown")


@router.post("/verify-identity")
async def verify_identity(
    candidate_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    ensure_student_participant(db, candidate_id, current_user)

    reference_image = os.path.join(
        VERIFICATION_DIR,
        f"{safe_candidate_id(candidate_id)}.jpg",
    )

    if not os.path.exists(reference_image):
        return {
            "verified": None,
            "status": "NOT_REGISTERED",
            "message": "No registered reference photo for this candidate",
        }

    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp:
        temp.write(await file.read())
        current_image = temp.name

    try:
        result = verify_faces(reference_image, current_image)
        return result
    except Exception as e:
        return {"verified": False, "error": str(e)}
    finally:
        if os.path.exists(current_image):
            os.remove(current_image)
