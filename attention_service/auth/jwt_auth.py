from fastapi import HTTPException
from jose import jwt, JWTError
from sqlalchemy import text

from config import get_algorithm, get_engine, get_secret_key


def decode_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(
            token,
            get_secret_key(),
            algorithms=[get_algorithm()],
        )
        if payload.get("type") != "access":
            return None
        return payload
    except JWTError:
        return None


def authorize_student_voice(candidate_id: str, authorization: str | None) -> None:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization")

    token = authorization.split(" ", 1)[1]
    payload = decode_access_token(token)
    if not payload or payload.get("role") != "student":
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    engine = get_engine()
    with engine.connect() as conn:
        row = conn.execute(
            text(
                """
                SELECT 1 FROM participants
                WHERE interview_id::text = :interview_id AND student_id::text = :student_id
                """
            ),
            {"interview_id": candidate_id, "student_id": user_id},
        ).fetchone()

    if not row:
        raise HTTPException(status_code=403, detail="Not authorized for this interview")
