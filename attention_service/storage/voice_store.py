import json

import numpy as np
from sqlalchemy import text

from config import get_engine


def save_voiceprint(candidate_id: str, embedding: np.ndarray) -> None:
    engine = get_engine()
    embedding_json = json.dumps(embedding.tolist())
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO voiceprints (candidate_id, embedding, created_at, updated_at)
                VALUES (:candidate_id, CAST(:embedding AS jsonb), NOW(), NOW())
                ON CONFLICT (candidate_id)
                DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = NOW()
                """
            ),
            {"candidate_id": candidate_id, "embedding": embedding_json},
        )


def load_voiceprint(candidate_id: str) -> np.ndarray | None:
    engine = get_engine()
    with engine.connect() as conn:
        row = conn.execute(
            text(
                "SELECT embedding FROM voiceprints WHERE candidate_id = :candidate_id"
            ),
            {"candidate_id": candidate_id},
        ).fetchone()
    if not row:
        return None
    values = row[0]
    if isinstance(values, str):
        values = json.loads(values)
    return np.array(values, dtype=np.float32)


def delete_voiceprint(candidate_id: str) -> bool:
    engine = get_engine()
    with engine.begin() as conn:
        result = conn.execute(
            text("DELETE FROM voiceprints WHERE candidate_id = :candidate_id"),
            {"candidate_id": candidate_id},
        )
    return result.rowcount > 0
