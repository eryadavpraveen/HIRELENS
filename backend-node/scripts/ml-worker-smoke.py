import json
import subprocess
import sys
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKER = ROOT / "python_vision_worker" / "worker.py"
IMG = ROOT / "scripts" / "test-face.jpg"
PY = ROOT / "python_vision_worker" / ".venv" / "Scripts" / "python.exe"

proc = subprocess.Popen(
    [str(PY), str(WORKER)],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    cwd=str(WORKER.parent),
)

ready = threading.Event()
responses = []


def read_stdout():
    for line in proc.stdout:
        line = line.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
        except json.JSONDecodeError:
            print("NON_JSON", line[:120])
            continue
        if msg.get("type") == "ready":
            print("VISION_WORKER_READY", msg)
            ready.set()
        else:
            responses.append(msg)
            print("RESP", msg)


t = threading.Thread(target=read_stdout, daemon=True)
t.start()

if not ready.wait(180):
    print("VISION_WORKER_READY_TIMEOUT")
    proc.kill()
    sys.exit(1)

for req_id, op in [("1", "count_faces"), ("2", "detect_objects")]:
    payload = {"id": req_id, "op": op, "image_path": str(IMG)}
    proc.stdin.write(json.dumps(payload) + "\n")
    proc.stdin.flush()
    # wait briefly for response
    for _ in range(100):
        if any(r.get("id") == req_id for r in responses):
            break
        ready.wait(0.1)

proc.kill()
print("SMOKE_DONE")
