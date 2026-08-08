"""
Persistent Attention ML worker (NDJSON over stdin/stdout).

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
    format="%(asctime)s [attention-worker] %(levelname)s %(message)s",
)
logger = logging.getLogger("attention-worker")


def _emit(payload: dict) -> None:
    sys.stdout.write(json.dumps(payload, separators=(",", ":")) + "\n")
    sys.stdout.flush()


def _warm() -> None:
    logger.info("Warming MediaPipe FaceLandmarker + Resemblyzer VoiceEncoder...")
    from face_landmarker_service import (
        validate_face_landmarker_asset,
        warm_face_landmarker,
    )
    from voice_verifier import warm_voice_encoder

    validate_face_landmarker_asset()
    warm_face_landmarker()
    warm_voice_encoder()
    logger.info("Attention models warmed successfully")


def _handle(msg: dict):
    op = msg.get("op")
    req_id = msg.get("id")

    if op == "shutdown":
        _emit({"id": req_id, "ok": True, "result": {"status": "bye"}})
        raise SystemExit(0)

    if op == "analyze":
        from face_landmarker_service import detect_landmarks

        return detect_landmarks(msg["image_path"])

    if op == "embed":
        from voice_verifier import generate_embedding

        embedding = generate_embedding(msg["audio_path"])
        return embedding.tolist()

    if op == "ping":
        return {"pong": True}

    raise ValueError(f"Unknown op: {op}")


def main() -> None:
    try:
        _warm()
    except Exception:
        logger.exception("Attention model warm-up failed")
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
