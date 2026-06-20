from fastapi import APIRouter, UploadFile, File, Depends
import tempfile
import os

from app.services.object_detector import (
    detect_objects
)

from app.auth.dependencies import require_student

router = APIRouter()


@router.post("/check")
async def check_objects(
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

    try:

        result = detect_objects(
            temp_path
        )

        return result

    finally:

        if os.path.exists(
            temp_path
        ):
            os.remove(temp_path)