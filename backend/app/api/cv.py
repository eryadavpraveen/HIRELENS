import logging
import traceback

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException

from app.services.face_detector import count_faces_from_bytes
from app.auth.dependencies import require_student

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/check-face")
async def check_face(
    file: UploadFile = File(...),
    _user=Depends(require_student),
):
    try:
        raw = await file.read()
        logger.info(
            "check-face: received %d bytes, content_type=%s",
            len(raw),
            file.content_type,
        )

        if not raw:
            return {"status": "NO_FACE", "face_count": 0}

        count = count_faces_from_bytes(raw)

        if count == 0:
            status = "NO_FACE"
        elif count == 1:
            status = "FACE_PRESENT"
        else:
            status = "MULTIPLE_FACE"

        return {"status": status, "face_count": count}
    except HTTPException:
        raise
    except Exception:
        logger.error("check-face failed:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Face check failed")
