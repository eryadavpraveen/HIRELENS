from fastapi import APIRouter, UploadFile, File, Form, Header
import tempfile
import shutil

from storage.voice_store import save_voiceprint, load_voiceprint, delete_voiceprint
from services.voice_verifier import generate_embedding, compare_embeddings
from auth.jwt_auth import authorize_student_voice

router = APIRouter(prefix="/voice", tags=["Voice"])


@router.post("/register")
async def register_voice(
    candidate_id: str = Form(...),
    audio: UploadFile = File(...),
    authorization: str | None = Header(None),
):
    authorize_student_voice(candidate_id, authorization)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
        shutil.copyfileobj(audio.file, temp_file)
        audio_path = temp_file.name

    embedding = generate_embedding(audio_path)
    save_voiceprint(candidate_id, embedding)

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

    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
        shutil.copyfileobj(audio.file, temp_file)
        audio_path = temp_file.name

    current_embedding = generate_embedding(audio_path)
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
