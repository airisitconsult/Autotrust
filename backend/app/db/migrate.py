"""A small, safe schema upgrader for local development (SQLite).

`Base.metadata.create_all` creates missing *tables* but never alters existing
ones, so every new column used to mean deleting app.db. This adds the missing
columns on startup instead, keeping your data.

Add a row to COLUMNS whenever you add a column to an existing model. The
optional backfill SQL runs once, only when the column was just added (e.g. to
mark existing users as already verified).

This is deliberately SQLite-only. For production, use real migrations
(Alembic) — see the project notes.
"""

import logging

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

logger = logging.getLogger("uvicorn.error")

# (table, column, SQL type, backfill SQL or None)
COLUMNS: list[tuple[str, str, str, str | None]] = [
    ("vehicles", "body_type", "VARCHAR", None),
    ("vehicle_photos", "kind", "VARCHAR NOT NULL DEFAULT 'photo'", None),
    ("users", "bank_name", "VARCHAR", None),
    ("users", "bank_account_number", "VARCHAR", None),
    ("users", "bank_account_name", "VARCHAR", None),
    # Existing accounts predate email verification: treat them as verified.
    ("users", "email_verified_at", "DATETIME", "UPDATE users SET email_verified_at = created_at"),
]


def upgrade_schema(engine: Engine) -> None:
    if engine.dialect.name != "sqlite":
        return
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        for table, column, sql_type, backfill in COLUMNS:
            if table not in tables:
                continue
            existing = {c["name"] for c in inspector.get_columns(table)}
            if column in existing:
                continue
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {sql_type}"))
            if backfill:
                conn.execute(text(backfill))
            logger.info("Schema upgraded: added %s.%s", table, column)
