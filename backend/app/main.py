from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.database.database import engine, Base
from app.database.migration_runner import apply_pending_migrations
from app.database.schema_check import validate_schema_or_raise
from app.api.auth import router as auth_router
from app.models.user import User
from app.models.interview import Interview
from app.models.participant import Participant
from app.models.violation import Violation
from app.models.refresh_token import RefreshToken
from app.models.password_reset_token import PasswordResetToken
from app.models.voiceprint import Voiceprint
from app.api.interview import router as interview_router
from app.api.participant import router as participant_router
from app.api.violation import router as violation_router
from app.api.report import router as report_router
from app.api.verification import router as verification_router
from app.api.cv import router as cv_router
from app.api.identity import router as identity_router
from app.api.object_detection import router as object_router
from app.api.signaling import router as signaling_router
from app.cors import build_cors_config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_MODELS = (
    User,
    Interview,
    Participant,
    Violation,
    RefreshToken,
    PasswordResetToken,
    Voiceprint,
)

Base.metadata.create_all(bind=engine)
applied_migrations = apply_pending_migrations(engine)
if applied_migrations:
    logger.info("Startup applied migrations: %s", ", ".join(applied_migrations))
validate_schema_or_raise(engine, Base.metadata)

app = FastAPI()

_cors_origins, _cors_regex = build_cors_config()

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=_cors_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(verification_router, prefix="/verification", tags=["Verification"])
app.include_router(object_router, prefix="/object-detection", tags=["Object Detection"])
app.include_router(identity_router, prefix="/identity", tags=["Identity"])
app.include_router(cv_router, prefix="/cv", tags=["Computer Vision"])
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(participant_router, prefix="/interviews", tags=["Participants"])
app.include_router(interview_router, prefix="/interviews", tags=["Interviews"])
app.include_router(violation_router, prefix="/violations", tags=["Violations"])
app.include_router(report_router, prefix="/reports", tags=["Reports"])
app.include_router(signaling_router, tags=["Signaling"])


@app.get("/")
def root():
    return {"message": "InterviewAI Backend Running"}
