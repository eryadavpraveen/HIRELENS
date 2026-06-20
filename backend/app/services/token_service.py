import hashlib
import secrets
from datetime import datetime, timedelta
import os

from sqlalchemy.orm import Session

from app.models.refresh_token import RefreshToken

REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def create_refresh_token_record(db: Session, user_id) -> str:
    plain = generate_refresh_token()
    record = RefreshToken(
        user_id=user_id,
        token_hash=hash_token(plain),
        expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        revoked=False,
    )
    db.add(record)
    db.commit()
    return plain


def rotate_refresh_token(db: Session, plain_token: str) -> tuple[str, str] | None:
    token_hash = hash_token(plain_token)
    record = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked.is_(False),
        )
        .first()
    )
    if not record or record.expires_at < datetime.utcnow():
        return None

    record.revoked = True
    db.commit()

    new_plain = create_refresh_token_record(db, record.user_id)
    return str(record.user_id), new_plain


def revoke_refresh_token(db: Session, plain_token: str) -> bool:
    token_hash = hash_token(plain_token)
    record = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == token_hash)
        .first()
    )
    if not record:
        return False
    record.revoked = True
    db.commit()
    return True


def revoke_all_user_tokens(db: Session, user_id) -> int:
    records = (
        db.query(RefreshToken)
        .filter(RefreshToken.user_id == user_id, RefreshToken.revoked.is_(False))
        .all()
    )
    for record in records:
        record.revoked = True
    db.commit()
    return len(records)
