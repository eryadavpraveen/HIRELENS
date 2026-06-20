# HIRELENS database migrations

Permanent migration and schema-validation system for PostgreSQL. Replaces one-off `ALTER TABLE` fixes and prevents runtime `UndefinedColumn` errors when SQLAlchemy models change.

## Why this exists

`Base.metadata.create_all()` only creates **missing tables**. It never adds columns to existing tables. Every model change that affects existing tables must ship as a numbered SQL migration.

## Framework choice

**Custom SQL migration runner** (not Alembic):

- Already partially in place; extended with history tracking and startup integration
- Fits the project's small schema and SQL-first workflow
- No new heavy dependencies
- Migrations are plain SQL files — easy to review in PRs and deploy scripts

History is stored in PostgreSQL table `schema_migrations` (created automatically).

## Directory layout

```
backend/migrations/
  manifest.json                      # maps migrations → tables/columns (for validation hints)
  001_add_interviews_completed_at.sql
  001_add_interviews_completed_at_down.sql
  README.md
backend/app/database/
  migration_runner.py                # apply / rollback / discover
  schema_check.py                    # startup model vs DB validation
backend/scripts/
  migrate.py                         # CLI: status, apply, rollback, create
  apply_migrations.py                # shortcut: apply pending only
```

## Naming convention

| Pattern | Purpose |
|---------|---------|
| `NNN_short_description.sql` | Upgrade (applied once) |
| `NNN_short_description_down.sql` | Rollback (manual) |

Examples:

- `001_add_interviews_completed_at.sql`
- `002_add_candidate_score.sql`

Version id = filename stem (e.g. `001_add_interviews_completed_at`). Sorted by numeric prefix `NNN`.

## Developer workflow

```
Model change (SQLAlchemy)
        ↓
Create migration SQL
        ↓
Update manifest.json
        ↓
Apply migration (local)
        ↓
Validate schema
        ↓
Run backend
```

### 1. Change the SQLAlchemy model

Example: add a field to `Interview` in `app/models/interview.py`.

### 2. Generate migration files

```bash
cd backend
python scripts/migrate.py create add_candidate_score
```

Creates:

- `migrations/003_add_candidate_score.sql`
- `migrations/003_add_candidate_score_down.sql`

Edit the SQL (use `IF NOT EXISTS` / `IF EXISTS` when safe):

```sql
-- migrations/003_add_candidate_score.sql
ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS candidate_score DOUBLE PRECISION NULL;
```

```sql
-- migrations/003_add_candidate_score_down.sql
ALTER TABLE interviews
  DROP COLUMN IF EXISTS candidate_score;
```

### 3. Register in `manifest.json`

```json
{
  "003_add_candidate_score": {
    "description": "Add interviews.candidate_score",
    "changes": [
      { "table": "interviews", "column": "candidate_score", "action": "add" }
    ]
  }
}
```

This enables startup validation to print the exact migration file when a column is missing.

### 4. Apply migrations

```bash
python scripts/migrate.py apply
# or
python scripts/apply_migrations.py
```

### 5. Check status

```bash
python scripts/migrate.py status
```

```
Migration status:
  [applied ] 001_add_interviews_completed_at — Add interviews.completed_at ...
  [pending ] 003_add_candidate_score — ...
```

### 6. Start backend

Startup sequence (automatic in `app/main.py`):

1. `create_all` — create any missing tables (fresh DB)
2. `apply_pending_migrations` — run pending SQL migrations (existing DB patches)
3. `validate_schema_or_raise` — compare models to PostgreSQL; **fail startup** if mismatch

## Deployment workflow

### Existing production database

1. Backup database.
2. Deploy new code (includes new migration files).
3. On first process start, pending migrations run automatically **before** FastAPI serves traffic.
4. Confirm logs:
   - `Applying migration ...`
   - `Database schema validation passed`

Or apply explicitly before restart:

```bash
cd backend
python scripts/migrate.py apply
python -m uvicorn app.main:app ...
```

### Fresh database

1. Set `DATABASE_URL`.
2. Start backend (or run `migrate.py apply`):
   - `create_all` creates `users`, `interviews`, `participants`, `violations`
   - Pending migrations run (e.g. `001` is safe no-op if column already created by model)
   - Schema validation passes

No manual `ALTER TABLE` after initial setup.

### CI / staging

```bash
cd backend
python scripts/migrate.py apply
python -m py_compile app/main.py
# optional: import app.main to trigger validation without serving
python -c "from app.main import app; print('schema ok')"
```

## Rollback procedure

Rollback is **manual** and should be used rarely (staging/debug only).

```bash
python scripts/migrate.py rollback              # last applied migration
python scripts/migrate.py rollback --version 001_add_interviews_completed_at
```

Requirements:

- Matching `NNN_name_down.sql` must exist
- Removes row from `schema_migrations` after successful down SQL

**Production:** prefer forward-fix migrations rather than rollback.

## Startup validation design

On every backend start, `validate_schema_or_raise` checks all tables on `Base.metadata`:

| Model | Table |
|-------|-------|
| `User` | `users` |
| `Interview` | `interviews` |
| `Participant` | `participants` |
| `Violation` | `violations` |

Checks:

- Missing tables
- Missing columns (with migration file hint from `manifest.json`)
- Type mismatches (UUID, String, DateTime, Float, etc.)

Example failure log:

```
[SCHEMA MISMATCH]
Table: interviews
Column: completed_at
Issue: missing column 'completed_at'
Required Migration: 001_add_interviews_completed_at.sql
```

Application raises `RuntimeError` — **no requests served** with invalid schema.

## Migration history (prevent double apply)

Table `schema_migrations`:

| version | description | applied_at |
|---------|-------------|------------|
| `001_add_interviews_completed_at` | ... | timestamp |

Each upgrade file runs only if its version is not in this table. Re-running `apply` is safe.

## Current migrations

| Version | File | Description |
|---------|------|-------------|
| `001_add_interviews_completed_at` | `001_add_interviews_completed_at.sql` | Add `interviews.completed_at` |

## Verification steps

1. **Status**
   ```bash
   python scripts/migrate.py status
   ```

2. **Column exists**
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'interviews' AND column_name = 'completed_at';
   ```

3. **Startup logs**
   - `Database schema validation passed (4 model tables match PostgreSQL: ...)`

4. **Complete endpoint** — `PATCH /interviews/{id}/complete` without `UndefinedColumn`

5. **Intentional failure test** — remove a column in DB without migration; restart should fail with `[SCHEMA MISMATCH]`

## Backward compatibility

| Scenario | Behavior |
|----------|----------|
| Old DB, first deploy with this system | Startup applies `001`, validates, runs |
| Column added manually before runner | `001` uses `IF NOT EXISTS`; recorded once in `schema_migrations` |
| New app, migrations not run | Startup applies migrations then validates |
| Extra DB columns not in models | Ignored (validation is model-driven) |

## Troubleshooting

| Error | Fix |
|-------|-----|
| `UndefinedColumn: completed_at` | `python scripts/migrate.py apply` or restart backend (auto-apply) |
| Startup `SCHEMA MISMATCH` | Read log for table/column; apply or create migration |
| Migration already applied error | Check `schema_migrations`; do not re-insert duplicate versions |
