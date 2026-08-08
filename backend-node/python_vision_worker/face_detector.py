import logging

import cv2
import numpy as np

logger = logging.getLogger(__name__)

face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)

if face_cascade.empty():
    logger.error("OpenCV Haar cascade failed to load from %s", cv2.data.haarcascades)

_MAX_DIMENSION = 960


def _decode_bgr(image_bytes: bytes) -> np.ndarray | None:
    if not image_bytes:
        return None
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        logger.warning("cv2.imdecode returned None (%d bytes)", len(image_bytes))
    return image


def _resize_if_large(image: np.ndarray) -> np.ndarray:
    height, width = image.shape[:2]
    max_side = max(height, width)
    if max_side <= _MAX_DIMENSION:
        return image
    scale = _MAX_DIMENSION / max_side
    new_size = (int(width * scale), int(height * scale))
    return cv2.resize(image, new_size, interpolation=cv2.INTER_AREA)


def count_faces_from_bytes(image_bytes: bytes) -> int:
    if face_cascade.empty():
        raise RuntimeError("Haar cascade classifier is not loaded")

    image = _decode_bgr(image_bytes)
    if image is None:
        return 0

    image = _resize_if_large(image)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(30, 30),
    )
    return len(faces)


def count_faces(image_path: str) -> int:
    image = cv2.imread(image_path)
    if image is None:
        logger.warning("cv2.imread returned None for %s", image_path)
        return 0

    image = _resize_if_large(image)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(30, 30),
    )
    return len(faces)
