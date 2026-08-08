"""
Persistent Vision ML worker (NDJSON over stdin/stdout).

NOT a web server. Controlled by Express via child_process.spawn.
Logs go to stderr only — stdout is reserved for protocol messages.
"""
from __future__ import annotations

import json
import logging
import sys
import traceback

logging.basicConfig(
    level=logging.INFO,
    stream=sys.stderr,
    format="%(asctime)s [vision-worker] %(levelname)s %(message)s",
)
logger = logging.getLogger("vision-worker")


def _emit(payload: dict) -> None:
    sys.stdout.write(json.dumps(payload, separators=(",", ":")) + "\n")
    sys.stdout.flush()


def _warm() -> None:
    logger.info("Warming vision models...")
    # Importing object_detector loads YOLO once.
    import object_detector  # noqa: F401
    import face_detector  # noqa: F401

    # Touch DeepFace lightly so weights begin loading on first verify instead of import crash.
    from face_verification import verify_faces  # noqa: F401

    logger.info("Vision worker imports complete (YOLO/OpenCV ready; DeepFace lazy-ok)")


def _handle(msg: dict):
    op = msg.get("op")
    req_id = msg.get("id")

    if op == "shutdown":
        _emit({"id": req_id, "ok": True, "result": {"status": "bye"}})
        raise SystemExit(0)

    if op == "count_faces":
        from face_detector import count_faces

        image_path = msg["image_path"]
        count = count_faces(image_path)
        return count

    if op == "verify_faces":
        from face_verification import verify_faces

        result = verify_faces(msg["reference_image"], msg["current_image"])
        if isinstance(result, bool):
            return result
        return bool(result.get("verified"))

    if op == "detect_objects":
        from object_detector import detect_objects

        return detect_objects(msg["image_path"])

    if op == "ping":
        return {"pong": True}

    raise ValueError(f"Unknown op: {op}")


def main() -> None:
    try:
        _warm()
    except Exception:
        logger.exception("Vision model warm-up failed")
        # Do NOT emit type=ready — Node must treat warm-up failure as unavailable.
        _emit({"type": "error", "ok": False, "error": "warm-up failed"})
        raise SystemExit(1)

    _emit({"type": "ready", "ok": True})
    logger.info("Ready for NDJSON requests")

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
        except json.JSONDecodeError:
            logger.error("Invalid JSON: %s", line)
            continue

        req_id = msg.get("id")
        try:
            result = _handle(msg)
            _emit({"id": req_id, "ok": True, "result": result})
        except SystemExit:
            raise
        except Exception as exc:
            logger.error("op failed: %s\n%s", exc, traceback.format_exc())
            _emit({"id": req_id, "ok": False, "error": str(exc)})


if __name__ == "__main__":
    main()
