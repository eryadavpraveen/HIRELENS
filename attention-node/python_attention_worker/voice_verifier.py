import logging

from resemblyzer import VoiceEncoder, preprocess_wav
import numpy as np

logger = logging.getLogger(__name__)

_encoder: VoiceEncoder | None = None


def _create_encoder() -> VoiceEncoder:
    logger.info("LOG: before VoiceEncoder()")
    try:
        encoder = VoiceEncoder()
        logger.info("LOG: after VoiceEncoder()")
        return encoder
    except Exception:
        logger.exception("[STARTUP ERROR] Resemblyzer VoiceEncoder failed to initialize")
        raise


def get_encoder() -> VoiceEncoder:
    global _encoder
    if _encoder is None:
        _encoder = _create_encoder()
    return _encoder


def warm_voice_encoder() -> None:
    """Optional startup hook — loads model and surfaces errors in Python."""
    get_encoder()


def generate_embedding(audio_path):
    wav = preprocess_wav(audio_path)
    return get_encoder().embed_utterance(wav)


def compare_embeddings(emb1, emb2):
    return float(np.dot(emb1, emb2))
