from fastapi import APIRouter, UploadFile, File, Form, Header, HTTPException
import logging
import os
import shutil
import tempfile

from storage.voice_store import save_voiceprint, load_voiceprint, delete_voiceprint
from services.voice_verifier import generate_embedding, compare_embeddings
from auth.jwt_auth import authorize_student_voice

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice", tags=["Voice"])


def _save_upload(audio: UploadFile) -> tuple[str, str]:
    suffix = ".wav"
    if audio.filename and audio.filename.lower().endswith(".webm"):
        suffix = ".webm"
    elif audio.content_type and "webm" in audio.content_type:
        suffix = ".webm"

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        shutil.copyfileobj(audio.file, temp_file)
        temp_file.flush()
        return temp_file.name, suffix
    finally:
        temp_file.close()


def _cleanup(path: str) -> None:
    if path and os.path.exists(path):
        try:
            os.remove(path)
        except OSError:
            logger.warning("Could not delete temp audio file: %s", path)


@router.post("/register")
async def register_voice(
    candidate_id: str = Form(...),
    audio: UploadFile = File(...),
    authorization: str | None = Header(None),
):
    authorize_student_voice(candidate_id, authorization)

    audio_path, _ = _save_upload(audio)
    try:
        embedding = generate_embedding(audio_path)
        save_voiceprint(candidate_id, embedding)
    except Exception as exc:
        logger.exception("Voice registration failed for %s", candidate_id)
        raise HTTPException(
            status_code=400,
            detail=f"Voice processing failed: {exc}",
        ) from exc
    finally:
        _cleanup(audio_path)

    return {"status": "REGISTERED"}


@router.post("/verify")
async def verify_voice_api(
    candidate_id: str = Form(...),
    audio: UploadFile = File(...),
    authorization: str | None = Header(None),
):
    authorize_student_voice(candidate_id, authorization)

    stored = load_voiceprint(candidate_id)
    if stored is None:
        return {"status": "NOT_REGISTERED"}

    audio_path, _ = _save_upload(audio)
    try:
        current_embedding = generate_embedding(audio_path)
    except Exception as exc:
        logger.exception("Voice verify failed for %s", candidate_id)
        raise HTTPException(
            status_code=400,
            detail=f"Voice processing failed: {exc}",
        ) from exc
    finally:
        _cleanup(audio_path)

    similarity = compare_embeddings(stored, current_embedding)

    if similarity >= 0.85:
        status = "VERIFIED"
    elif similarity >= 0.75:
        status = "SUSPICIOUS"
    else:
        status = "VOICE_MISMATCH"

    return {"status": status, "similarity": round(similarity, 3)}


@router.delete("/{candidate_id}")
def delete_voice_registration(candidate_id: str):
    """Remove a registered voiceprint (used when an interview is deleted)."""
    deleted = delete_voiceprint(candidate_id)
    if deleted:
        return {"status": "DELETED", "candidate_id": candidate_id}
    return {"status": "NOT_FOUND", "candidate_id": candidate_id}
