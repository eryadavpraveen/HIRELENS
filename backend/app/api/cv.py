from fastapi import APIRouter, UploadFile, File, Depends
import cv2
import tempfile

from app.services.face_detector import count_faces

from app.auth.dependencies import require_student

router = APIRouter()


@router.post("/check-face")
async def check_face(
    file: UploadFile = File(...),
    _user=Depends(require_student),
):

    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=".jpg"
    ) as temp:

        temp.write(
            await file.read()
        )

        temp_path = temp.name

    count = count_faces(temp_path)

    if count == 0:
        status = "NO_FACE"

    elif count == 1:
        status = "FACE_PRESENT"

    else:
        status = "MULTIPLE_FACE"

    return {
        "status": status,
        "face_count": count
    }