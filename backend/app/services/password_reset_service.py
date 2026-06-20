import hashlib
import secrets
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.password_reset_token import PasswordResetToken
from app.services.email_service import send_password_reset_email

RESET_TOKEN_EXPIRE_MINUTES = 30


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_password_reset_token(db: Session, user_id) -> str:
    plain = secrets.token_urlsafe(48)
    record = PasswordResetToken(
        user_id=user_id,
        token_hash=hash_token(plain),
        expires_at=datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES),
        used=False,
    )
    db.add(record)
    db.commit()
    return plain


def consume_password_reset_token(db: Session, plain_token: str) -> str | None:
    token_hash = hash_token(plain_token)
    record = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used.is_(False),
        )
        .first()
    )
    if not record or record.expires_at < datetime.utcnow():
        return None

    record.used = True
    db.commit()
    return str(record.user_id)


def request_password_reset(db: Session, email: str) -> bool:
    from app.models.user import User

    user = db.query(User).filter(User.email == email).first()
    if not user:
        return False

    plain = create_password_reset_token(db, user.id)
    send_password_reset_email(user.email, plain)
    return True
