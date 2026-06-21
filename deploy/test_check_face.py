"""POST /cv/check-face against local backend (optional Bearer token)."""
import sys
import requests
from pathlib import Path

base = "http://127.0.0.1:8000"
token = sys.argv[1] if len(sys.argv) > 1 else None
img = Path(__file__).parent / "test_face.jpg"
if not img.exists():
  import cv2
  import numpy as np
  cv2.imwrite(str(img), np.zeros((120, 120, 3), dtype=np.uint8))

headers = {}
if token:
  headers["Authorization"] = f"Bearer {token}"

with open(img, "rb") as f:
  r = requests.post(
    f"{base}/cv/check-face",
    files={"file": ("frame.jpg", f, "image/jpeg")},
    headers=headers,
    timeout=60,
  )
print("status:", r.status_code)
print("headers:", dict(r.headers))
print("body:", r.text[:2000])
