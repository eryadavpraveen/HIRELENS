"""
HIRELENS migration CLI.

Usage (from backend/):
    python scripts/migrate.py status
    python scripts/migrate.py apply
    python scripts/migrate.py rollback [--version VERSION]
    python scripts/migrate.py create <name>   # e.g. add_candidate_score -> 003_add_candidate_score.sql
"""

import argparse
import os
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine

BACKEND_ROOT = Path(__file__).resolve().parent.parent
MIGRATIONS_DIR = BACKEND_ROOT / "migrations"


def _engine():
    load_dotenv(BACKEND_ROOT / ".env")
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL is not set.", file=sys.stderr)
        raise SystemExit(1)
    return create_engine(database_url)


def cmd_status(engine) -> int:
    from app.database.migration_runner import get_migration_status

    rows = get_migration_status(engine)
    if not rows:
        print("No migration files found in migrations/.")
        return 0

    print("Migration status:")
    for row in rows:
        mark = "applied" if row["applied"] else "pending"
        print(f"  [{mark:7}] {row['version']} — {row['description']}")
    return 0


def cmd_apply(engine) -> int:
    from app.database.migration_runner import apply_pending_migrations

    applied = apply_pending_migrations(engine)
    if applied:
        print(f"Applied: {', '.join(applied)}")
    else:
        print("No pending migrations.")
    return 0


def cmd_rollback(engine, version: str | None) -> int:
    from app.database.migration_runner import rollback_migration

    try:
        rolled = rollback_migration(engine, version=version)
        print(f"Rolled back: {rolled}")
    except ValueError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    return 0


def cmd_create(name: str) -> int:
    if not name or not name.replace("_", "").isalnum():
        print("ERROR: name must be alphanumeric with underscores (e.g. add_candidate_score)", file=sys.stderr)
        return 1

    existing = sorted(MIGRATIONS_DIR.glob("*.sql"))
    numbers = []
    for path in existing:
        if path.name[:3].isdigit():
            numbers.append(int(path.name[:3]))
    next_num = (max(numbers) + 1) if numbers else 1
    version = f"{next_num:03d}_{name}"
    up_path = MIGRATIONS_DIR / f"{version}.sql"
    down_path = MIGRATIONS_DIR / f"{version}_down.sql"

    if up_path.exists():
        print(f"ERROR: {up_path.name} already exists.", file=sys.stderr)
        return 1

    up_path.write_text(
        f"-- Migration {version}\n"
        f"-- Created: {datetime.utcnow().isoformat()}Z\n"
        f"-- TODO: add upgrade SQL\n",
        encoding="utf-8",
    )
    down_path.write_text(
        f"-- Rollback {version}\n"
        f"-- TODO: add rollback SQL\n",
        encoding="utf-8",
    )

    print(f"Created:\n  {up_path.name}\n  {down_path.name}")
    print("Update migrations/manifest.json with table/column metadata for schema validation hints.")
    return 0


def main() -> int:
    # Ensure app package is importable when run as script
    sys.path.insert(0, str(BACKEND_ROOT))

    parser = argparse.ArgumentParser(description="HIRELENS database migrations")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("status", help="Show applied and pending migrations")
    sub.add_parser("apply", help="Apply pending migrations")

    rollback_parser = sub.add_parser("rollback", help="Rollback last or specific migration")
    rollback_parser.add_argument("--version", help="Migration version id (filename stem)")

    create_parser = sub.add_parser("create", help="Create new migration file pair")
    create_parser.add_argument("name", help="Short name (e.g. add_candidate_score)")

    args = parser.parse_args()

    if args.command == "create":
        return cmd_create(args.name)

    engine = _engine()

    if args.command == "status":
        return cmd_status(engine)
    if args.command == "apply":
        return cmd_apply(engine)
    if args.command == "rollback":
        return cmd_rollback(engine, getattr(args, "version", None))

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
