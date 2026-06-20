from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.user import User
from app.schemas.user import (
    UserRegister,
    UserLogin,
    UserResponse,
    TokenResponse,
    RefreshRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.auth.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from app.services.token_service import (
    create_refresh_token_record,
    rotate_refresh_token,
    revoke_refresh_token,
)
from app.services.password_reset_service import (
    request_password_reset,
    consume_password_reset_token,
)

router = APIRouter()


def _user_response(user: User) -> UserResponse:
    return UserResponse(
        id=str(user.id),
        name=user.name,
        email=user.email,
        role=user.role,
    )


def _issue_tokens(db: Session, user: User) -> TokenResponse:
    access_token = create_access_token({
        "sub": str(user.id),
        "role": user.role,
    })
    refresh_token = create_refresh_token_record(db, user.id)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/register")
def register_user(user: UserRegister, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    if user.role not in ("student", "recruiter"):
        raise HTTPException(status_code=400, detail="Invalid role")

    new_user = User(
        name=user.name,
        email=user.email,
        password_hash=hash_password(user.password),
        role=user.role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User registered successfully"}


@router.post("/login", response_model=TokenResponse)
def login_user(user: UserLogin, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if not existing_user or not verify_password(user.password, existing_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return _issue_tokens(db, existing_user)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return _user_response(current_user)


@router.post("/refresh", response_model=TokenResponse)
def refresh_tokens(body: RefreshRequest, db: Session = Depends(get_db)):
    rotated = rotate_refresh_token(db, body.refresh_token)
    if not rotated:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user_id, new_refresh = rotated
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    access_token = create_access_token({
        "sub": str(user.id),
        "role": user.role,
    })
    return TokenResponse(access_token=access_token, refresh_token=new_refresh)


@router.post("/logout")
def logout_user(body: RefreshRequest, db: Session = Depends(get_db)):
    revoke_refresh_token(db, body.refresh_token)
    return {"message": "Logged out"}


@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    request_password_reset(db, body.email)
    return {"message": "If an account exists for that email, a reset link has been sent."}


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    user_id = consume_password_reset_token(db, body.token)
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid reset token")

    user.password_hash = hash_password(body.password)
    db.commit()

    return {"message": "Password updated successfully"}
