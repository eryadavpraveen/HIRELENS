"""
Startup schema validation — compares SQLAlchemy models to live PostgreSQL schema.

Fails fast before the application serves requests when tables, columns, or
compatible types do not match model definitions.
"""

import logging
from dataclasses import dataclass
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text, inspect
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.engine import Engine
from sqlalchemy.schema import MetaData

from app.database.migration_runner import MIGRATIONS_DIR, migration_for_column

logger = logging.getLogger(__name__)

# SQLAlchemy type -> acceptable PostgreSQL data_type values (information_schema)
_TYPE_ALIASES: dict[str, set[str]] = {
    "uuid": {"uuid"},
    "string": {"character varying", "varchar", "text"},
    "text": {"text", "character varying", "varchar"},
    "datetime": {"timestamp without time zone", "timestamp with time zone"},
    "float": {"double precision", "real", "numeric"},
    "integer": {"integer", "bigint", "smallint"},
    "boolean": {"boolean"},
}


@dataclass
class SchemaMismatch:
    kind: str
    table: str
    column: Optional[str] = None
    detail: str = ""
    migration_file: Optional[str] = None

    def format_log(self) -> str:
        lines = ["[SCHEMA MISMATCH]"]
        lines.append(f"Table: {self.table}")
        if self.column:
            lines.append(f"Column: {self.column}")
        if self.kind == "missing_table":
            lines.append("Issue: table defined in models but missing in PostgreSQL")
            lines.append("Action: run pending migrations and ensure create_all has run")
        elif self.kind == "missing_column":
            lines.append(f"Issue: missing column '{self.column}'")
            if self.migration_file:
                lines.append(f"Required Migration: {self.migration_file}")
            else:
                lines.append("Required Migration: create a new NNN_description.sql migration")
        elif self.kind == "type_mismatch":
            lines.append(f"Issue: type mismatch on '{self.column}'")
            lines.append(f"Detail: {self.detail}")
            if self.migration_file:
                lines.append(f"Related Migration: {self.migration_file}")
        else:
            lines.append(f"Issue: {self.detail}")
        return "\n".join(lines)


def _model_type_family(column) -> str:
    col_type = column.type
    if isinstance(col_type, UUID):
        return "uuid"
    if isinstance(col_type, String):
        return "string"
    if isinstance(col_type, Text):
        return "text"
    if isinstance(col_type, DateTime):
        return "datetime"
    if isinstance(col_type, Float):
        return "float"
    if isinstance(col_type, Integer):
        return "integer"
    if isinstance(col_type, Boolean):
        return "boolean"
    return str(col_type).lower()


def _reflect_pg_family(type_obj) -> str:
    name = type_obj.__class__.__name__.upper()
    mapping = {
        "UUID": "uuid",
        "VARCHAR": "string",
        "TEXT": "text",
        "STRING": "string",
        "TIMESTAMP": "datetime",
        "DATETIME": "datetime",
        "DOUBLE_PRECISION": "float",
        "FLOAT": "float",
        "REAL": "float",
        "NUMERIC": "float",
        "INTEGER": "integer",
        "BIGINT": "integer",
        "SMALLINT": "integer",
        "BOOLEAN": "boolean",
    }
    return mapping.get(name, name.lower())


def _pg_type_matches(family: str, pg_family: str) -> bool:
    if family == pg_family:
        return True
    allowed = _TYPE_ALIASES.get(family)
    if not allowed:
        return True
    return pg_family in allowed


def _migration_file_hint(version: str | None) -> Optional[str]:
    if not version:
        return None
    path = MIGRATIONS_DIR / f"{version}.sql"
    return path.name if path.exists() else version


def validate_schema(engine: Engine, metadata: MetaData) -> list[SchemaMismatch]:
    inspector = inspect(engine)
    db_tables = set(inspector.get_table_names())
    mismatches: list[SchemaMismatch] = []

    for table_name, table in metadata.tables.items():
        if table_name == "schema_migrations":
            continue

        if table_name not in db_tables:
            mismatches.append(
                SchemaMismatch(
                    kind="missing_table",
                    table=table_name,
                    detail="Table missing in PostgreSQL",
                )
            )
            continue

        db_column_map = {col["name"]: col for col in inspector.get_columns(table_name)}
        model_columns = {col.name: col for col in table.columns}

        for column_name in sorted(set(model_columns) - set(db_column_map)):
            version = migration_for_column(table_name, column_name)
            mismatches.append(
                SchemaMismatch(
                    kind="missing_column",
                    table=table_name,
                    column=column_name,
                    migration_file=_migration_file_hint(version),
                )
            )

        for column_name, model_col in model_columns.items():
            if column_name not in db_column_map:
                continue
            db_col = db_column_map[column_name]
            family = _model_type_family(model_col)
            pg_family = _reflect_pg_family(db_col["type"])

            if not _pg_type_matches(family, pg_family):
                version = migration_for_column(table_name, column_name)
                mismatches.append(
                    SchemaMismatch(
                        kind="type_mismatch",
                        table=table_name,
                        column=column_name,
                        detail=f"model expects {family}, database has {pg_family}",
                        migration_file=_migration_file_hint(version),
                    )
                )

    return mismatches


def validate_schema_or_raise(engine: Engine, metadata: MetaData) -> None:
    mismatches = validate_schema(engine, metadata)

    if not mismatches:
        tables = sorted(
            t for t in metadata.tables.keys() if t != "schema_migrations"
        )
        logger.info(
            "Database schema validation passed (%d model tables match PostgreSQL: %s).",
            len(tables),
            ", ".join(tables),
        )
        return

    for mismatch in mismatches:
        logger.error(mismatch.format_log())

    raise RuntimeError(
        f"Database schema does not match SQLAlchemy models. "
        f"{len(mismatches)} issue(s) found. "
        "Apply pending migrations (python scripts/migrate.py apply) and see backend/migrations/README.md."
    )
