"""
HIRELENS migration runner — applies versioned SQL migrations with history tracking.

Migration files live in backend/migrations/:
  NNN_description.sql       — upgrade (applied once, recorded in schema_migrations)
  NNN_description_down.sql  — rollback (manual; removes history row)

The schema_migrations table is created automatically before any migration runs.
"""

import logging
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)

MIGRATIONS_DIR = Path(__file__).resolve().parent.parent.parent / "migrations"
MANIFEST_PATH = MIGRATIONS_DIR / "manifest.json"

MIGRATION_FILE_PATTERN = re.compile(r"^(\d{3})_[a-z0-9_]+\.sql$", re.IGNORECASE)
VERSION_PATTERN = re.compile(r"^(\d{3})")

CREATE_MIGRATIONS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(128) PRIMARY KEY,
    description TEXT,
    applied_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);
"""


@dataclass(frozen=True)
class MigrationFile:
    version: str
    path: Path
    description: str
    down_path: Path | None


def _load_manifest() -> dict:
    if not MANIFEST_PATH.exists():
        return {}
    import json

    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def discover_migrations() -> list[MigrationFile]:
    """Return upgrade migrations sorted by numeric version prefix."""
    manifest = _load_manifest()
    migrations: list[MigrationFile] = []

    for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
        if path.name.endswith("_down.sql"):
            continue
        if not MIGRATION_FILE_PATTERN.match(path.name):
            logger.warning("Skipping non-migration SQL file: %s", path.name)
            continue

        version = path.stem
        meta = manifest.get(version, {})
        description = meta.get("description", version)
        down_candidate = path.with_name(f"{version}_down.sql")
        down_path = down_candidate if down_candidate.exists() else None

        migrations.append(
            MigrationFile(
                version=version,
                path=path,
                description=description,
                down_path=down_path,
            )
        )

    migrations.sort(key=lambda m: int(VERSION_PATTERN.match(m.version).group(1)))
    return migrations


def ensure_migrations_table(engine: Engine) -> None:
    with engine.begin() as conn:
        conn.execute(text(CREATE_MIGRATIONS_TABLE_SQL))


def get_applied_versions(engine: Engine) -> set[str]:
    ensure_migrations_table(engine)
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT version FROM schema_migrations ORDER BY version"))
        return {row[0] for row in rows}


def get_migration_status(engine: Engine) -> list[dict]:
    applied = get_applied_versions(engine)
    status = []
    for migration in discover_migrations():
        status.append(
            {
                "version": migration.version,
                "description": migration.description,
                "applied": migration.version in applied,
                "file": migration.path.name,
            }
        )
    return status


def apply_pending_migrations(engine: Engine) -> list[str]:
    """
    Apply all migrations not yet recorded in schema_migrations.
    Returns list of version strings that were applied.
    """
    ensure_migrations_table(engine)
    applied_versions = get_applied_versions(engine)
    newly_applied: list[str] = []

    for migration in discover_migrations():
        if migration.version in applied_versions:
            logger.debug("Migration already applied: %s", migration.version)
            continue

        sql = migration.path.read_text(encoding="utf-8")
        logger.info("Applying migration %s (%s)", migration.version, migration.path.name)

        with engine.begin() as conn:
            conn.execute(text(sql))
            conn.execute(
                text(
                    "INSERT INTO schema_migrations (version, description, applied_at) "
                    "VALUES (:version, :description, :applied_at)"
                ),
                {
                    "version": migration.version,
                    "description": migration.description,
                    "applied_at": datetime.utcnow(),
                },
            )

        newly_applied.append(migration.version)
        logger.info("Migration applied: %s", migration.version)

    if not newly_applied:
        logger.info("No pending migrations.")
    else:
        logger.info("Applied %d migration(s): %s", len(newly_applied), ", ".join(newly_applied))

    return newly_applied


def rollback_migration(engine: Engine, version: str | None = None) -> str:
    """
    Roll back a single migration using its _down.sql file.
    If version is None, rolls back the most recently applied migration.
    """
    ensure_migrations_table(engine)

    with engine.connect() as conn:
        if version:
            row = conn.execute(
                text("SELECT version FROM schema_migrations WHERE version = :v"),
                {"v": version},
            ).fetchone()
            if not row:
                raise ValueError(f"Migration '{version}' is not in schema_migrations history.")
            target_version = version
        else:
            row = conn.execute(
                text(
                    "SELECT version FROM schema_migrations "
                    "ORDER BY applied_at DESC, version DESC LIMIT 1"
                )
            ).fetchone()
            if not row:
                raise ValueError("No migrations have been applied.")
            target_version = row[0]

    migration = next((m for m in discover_migrations() if m.version == target_version), None)
    if not migration or not migration.down_path:
        raise ValueError(
            f"No rollback file found for migration '{target_version}'. "
            f"Expected: {target_version}_down.sql"
        )

    down_sql = migration.down_path.read_text(encoding="utf-8")
    logger.warning("Rolling back migration %s (%s)", target_version, migration.down_path.name)

    with engine.begin() as conn:
        conn.execute(text(down_sql))
        conn.execute(
            text("DELETE FROM schema_migrations WHERE version = :version"),
            {"version": target_version},
        )

    logger.info("Rollback complete: %s", target_version)
    return target_version


def migration_for_column(table_name: str, column_name: str) -> str | None:
    """Return migration version id that documents adding this column (from manifest)."""
    manifest = _load_manifest()
    for version, meta in manifest.items():
        for change in meta.get("changes", []):
            if change.get("table") == table_name and change.get("column") == column_name:
                return version
    return None
