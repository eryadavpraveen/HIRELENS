import logging
from pathlib import Path

from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import mediapipe as mp

from services.head_tracker import get_head_pose
from services.eye_tracker import get_eye_direction
from services.eye_closure import detect_eye_closure
from services.attention_engine import analyze_attention
from services.lipsync_detector import detect_mouth_open

logger = logging.getLogger(__name__)

ATTENTION_SERVICE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = ATTENTION_SERVICE_DIR / "models" / "face_landmarker.task"

_landmarker: vision.FaceLandmarker | None = None


def validate_face_landmarker_asset() -> Path:
    """Verify model file exists; raise with Python traceback if missing."""
    if not MODEL_PATH.is_file():
        raise FileNotFoundError(
            f"[STARTUP ERROR] Face landmarker model not found at {MODEL_PATH}. "
            "Place face_landmarker.task in attention_service/models/."
        )
    return MODEL_PATH


def _create_landmarker() -> vision.FaceLandmarker:
    model_path = validate_face_landmarker_asset()
    logger.info("LOG: before FaceLandmarker.create_from_options path=%s", model_path)
    try:
        base_options = python.BaseOptions(model_asset_path=str(model_path))
        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            output_face_blendshapes=True,
            output_facial_transformation_matrixes=True,
            num_faces=1,
        )
        landmarker = vision.FaceLandmarker.create_from_options(options)
        logger.info("LOG: after FaceLandmarker.create_from_options")
        return landmarker
    except Exception:
        logger.exception(
            "[STARTUP ERROR] MediaPipe FaceLandmarker failed to initialize (model=%s)",
            model_path,
        )
        raise


def get_landmarker() -> vision.FaceLandmarker:
    global _landmarker
    if _landmarker is None:
        _landmarker = _create_landmarker()
    return _landmarker


def warm_face_landmarker() -> None:
    """Optional startup hook — loads model and surfaces errors in Python."""
    get_landmarker()


def detect_landmarks(image_path):
    landmarker = get_landmarker()

    image = mp.Image.create_from_file(image_path)
    result = landmarker.detect(image)

    if len(result.face_landmarks) == 0:
        return {"face_detected": False}

    landmarks = result.face_landmarks[0]
    mouth_data = detect_mouth_open(landmarks)

    matrix = result.facial_transformation_matrixes[0]
    pose = get_head_pose(matrix)
    eye = get_eye_direction(landmarks)
    eye_state = detect_eye_closure(landmarks)
    attention = analyze_attention(
        pose["horizontal"],
        pose["vertical"],
        eye["direction"],
        eye_state["eyes_closed"],
    )

    return {
        "face_detected": True,
        "landmark_count": len(landmarks),
        "horizontal": pose["horizontal"],
        "vertical": pose["vertical"],
        "yaw": pose["yaw"],
        "pitch": pose["pitch"],
        "eye_direction": eye["direction"],
        "eye_ratio": eye["ratio"],
        "ear": eye_state["ear"],
        "eyes_closed": eye_state["eyes_closed"],
        "attention_loss": attention["attention_loss"],
        "drowsiness_alert": attention["drowsiness_alert"],
        "reasons": attention["reasons"],
        "mouth_open": mouth_data["mouth_open"],
        "mouth_ratio": mouth_data["mouth_ratio"],
    }
