"""Audit attention_service imports against installed packages."""
import os
import sys
from pathlib import Path

ATTENTION = Path(__file__).resolve().parent.parent
os.chdir(ATTENTION)
sys.path.insert(0, str(ATTENTION))

from config import load_environment, validate_config

load_environment()
validate_config()

checks = [
    "auth.jwt_auth",
    "storage.voice_store",
    "services.voice_verifier",
    "services.face_landmarker_service",
    "routers.voice_router",
    "main",
]

missing_roots = set()
other_errors = []

for mod in checks:
    try:
        __import__(mod)
        print(f"OK  {mod}")
    except ModuleNotFoundError as e:
        msg = str(e)
        print(f"MISSING {mod}: {e}")
        # No module named 'X' or No module named 'X.Y'
        part = msg.split("'")[1] if "'" in msg else msg
        missing_roots.add(part.split(".")[0])
    except Exception as e:
        other_errors.append((mod, type(e).__name__, str(e)))
        print(f"ERROR {mod}: {type(e).__name__}: {e}")

print("---")
print("Missing package roots:", sorted(missing_roots))
for item in other_errors:
    print(f"Other error: {item}")
