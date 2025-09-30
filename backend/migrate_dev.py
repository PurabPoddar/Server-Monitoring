from sqlalchemy import text
from backend.app import app
from backend.db import db


def column_exists(engine, table: str, column: str) -> bool:
    with engine.connect() as conn:
        res = conn.execute(text(f"PRAGMA table_info({table})"))
        return any(row[1] == column for row in res.fetchall())


def add_column_if_missing(engine, table: str, column: str, ddl: str) -> None:
    if not column_exists(engine, table, column):
        with engine.connect() as conn:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))


def run():
    with app.app_context():
        engine = db.engine
        # Add new columns for Server model introduced in Phase 2
        add_column_if_missing(engine, "servers", "name", "VARCHAR(255)")
        add_column_if_missing(engine, "servers", "auth_type", "VARCHAR(32)")
        add_column_if_missing(engine, "servers", "key_path", "VARCHAR(1024)")
        add_column_if_missing(engine, "servers", "status", "VARCHAR(64)")
        add_column_if_missing(engine, "servers", "last_seen", "DATETIME")
        add_column_if_missing(engine, "servers", "notes", "TEXT")
        print("Migration completed (or already up-to-date).")


if __name__ == "__main__":
    run()


