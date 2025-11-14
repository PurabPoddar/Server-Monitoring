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
        
        # Add is_demo column for distinguishing demo vs live servers
        column_added = not column_exists(engine, "servers", "is_demo")
        add_column_if_missing(engine, "servers", "is_demo", "BOOLEAN DEFAULT 0")
        
        # If column was just added, set existing servers (IDs 1-11) to is_demo=True
        # and keep new servers (ID 12+) as is_demo=False
        if column_added:
            with engine.connect() as conn:
                # Set existing servers (IDs 1-11) to is_demo=True
                conn.execute(text("UPDATE servers SET is_demo = 1 WHERE id <= 11"))
                # Ensure new servers (ID 12+) are is_demo=False
                conn.execute(text("UPDATE servers SET is_demo = 0 WHERE id > 11"))
                conn.commit()
            print("Added is_demo column and updated existing servers.")
        
        # Add encrypted_password column for password storage
        add_column_if_missing(engine, "servers", "encrypted_password", "TEXT")
        
        # Add winrm_port column for Windows servers
        add_column_if_missing(engine, "servers", "winrm_port", "INTEGER DEFAULT 5985")
        
        # Add ssh_port column for Linux servers
        add_column_if_missing(engine, "servers", "ssh_port", "INTEGER DEFAULT 22")
        
        print("Migration completed (or already up-to-date).")


if __name__ == "__main__":
    run()


