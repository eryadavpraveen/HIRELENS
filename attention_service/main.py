import logging
import os
import tempfile
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

from config import load_environment, log_startup_config, validate_config
from cors import build_cors_config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load .env and validate before any module reads database or JWT settings.
load_environment()
validate_config()
log_startup_config()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("LOG: entering startup diagnostics")
    from services.face_landmarker_service import validate_face_landmarker_asset, warm_face_landmarker
    from services.voice_verifier import warm_voice_encoder

    try:
        model_path = validate_face_landmarker_asset()
        logger.info("LOG: face landmarker asset found at %s", model_path)
        logger.info("LOG: warming MediaPipe FaceLandmarker (TensorFlow Lite)")
        warm_face_landmarker()
        logger.info("LOG: warming Resemblyzer VoiceEncoder (PyTorch)")
        warm_voice_encoder()
        logger.info("LOG: all models initialized successfully")
    except Exception:
        logger.exception("[STARTUP ERROR] Attention service model initialization failed")
        raise

    yield


from services.face_landmarker_service import detect_landmarks
from routers.voice_router import router as voice_router

app = FastAPI(lifespan=lifespan)

app.include_router(voice_router)

_cors_origins, _cors_regex = build_cors_config()

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=_cors_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "MediaPipe Attention Service Running"}


@app.post("/attention/analyze")
async def analyze(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp:
        temp.write(await file.read())
        image_path = temp.name

    result = detect_landmarks(image_path)
    os.remove(image_path)
    return result
