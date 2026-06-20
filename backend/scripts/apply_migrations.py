"""
Apply pending migrations (delegates to migration runner).

Usage (from backend/):
    python scripts/apply_migrations.py
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

from app.database.migration_runner import apply_pending_migrations


def main() -> int:
    load_dotenv(BACKEND_ROOT / ".env")
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL is not set.", file=sys.stderr)
        return 1

    engine = create_engine(database_url)
    applied = apply_pending_migrations(engine)
    if applied:
        print(f"Applied: {', '.join(applied)}")
    else:
        print("No pending migrations.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
