"""Trace attention_service startup imports to find native abort location."""
import logging
import os
import sys
import traceback
from pathlib import Path

ATTENTION = Path(__file__).resolve().parent.parent
os.chdir(ATTENTION)
sys.path.insert(0, str(ATTENTION))

logging.basicConfig(
    level=logging.INFO,
    format="LOG: %(message)s",
    force=True,
)

def step(msg: str) -> None:
    print(f"LOG: {msg}", flush=True)


step("entering config")
from config import load_environment, validate_config, log_startup_config

step("before load_environment")
load_environment()
step("after load_environment")
validate_config()
log_startup_config()

step("before import face_landmarker_service")
try:
    from services.face_landmarker_service import detect_landmarks
    step("after import face_landmarker_service")
except Exception as e:
    step(f"EXCEPTION face_landmarker_service: {e}")
    traceback.print_exc()
    sys.exit(1)

step("before import voice_router")
try:
    step("before import voice_verifier module only")
    import services.voice_verifier as voice_verifier_mod
    step("after import voice_verifier module (lazy — no VoiceEncoder yet)")

    from routers.voice_router import router as voice_router
    step("after import voice_router")
except Exception as e:
    step(f"EXCEPTION voice_router: {e}")
    traceback.print_exc()
    sys.exit(1)

step("before import main app pieces")
from fastapi import FastAPI
app = FastAPI()
app.include_router(voice_router)
step("startup trace complete")
