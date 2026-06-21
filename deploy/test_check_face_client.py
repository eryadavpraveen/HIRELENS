"""Local TestClient for /cv/check-face (no real auth token needed)."""
import io
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

import cv2
import numpy as np
from fastapi.testclient import TestClient

from app.main import app
from app.auth.dependencies import require_student


class _FakeUser:
    id = "00000000-0000-0000-0000-000000000001"
    role = "student"
    email = "test@local"
    name = "Test"


app.dependency_overrides[require_student] = lambda: _FakeUser()
client = TestClient(app)

img = np.zeros((480, 640, 3), dtype=np.uint8)
_, buf = cv2.imencode(".jpg", img)
files = {"file": ("frame.jpg", io.BytesIO(buf.tobytes()), "image/jpeg")}
r = client.post("/cv/check-face", files=files)
print("status:", r.status_code)
print("body:", r.text)
