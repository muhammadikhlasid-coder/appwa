"""
Database — Safe WA Gateway
============================
SQLite database untuk menyimpan sessions secara persisten.
Built-in Python, tidak perlu install apapun.
"""

import sqlite3
import os
import time

DB_PATH = os.path.join(os.path.dirname(__file__), "gateway.db")


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Akses kolom by name
    return conn


def init_db():
    """Buat tabel jika belum ada."""
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id          TEXT PRIMARY KEY,
                user_id     TEXT NOT NULL,
                name        TEXT NOT NULL,
                phone       TEXT NOT NULL,
                status      TEXT NOT NULL DEFAULT 'disconnected',
                trust       INTEGER NOT NULL DEFAULT 5,
                sent_today  INTEGER NOT NULL DEFAULT 0,
                proxy       TEXT NOT NULL DEFAULT '—',
                warmup      INTEGER NOT NULL DEFAULT 0,
                created_at  REAL NOT NULL DEFAULT (unixepoch())
            )
        """)
        
        # Migration: Remove UNIQUE constraint from phone column if it exists
        try:
            schema = conn.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='sessions'").fetchone()
            if schema and "UNIQUE" in schema["sql"].upper():
                conn.execute("ALTER TABLE sessions RENAME TO sessions_old")
                conn.execute("""
                    CREATE TABLE sessions (
                        id          TEXT PRIMARY KEY,
                        user_id     TEXT NOT NULL,
                        name        TEXT NOT NULL,
                        phone       TEXT NOT NULL,
                        status      TEXT NOT NULL DEFAULT 'disconnected',
                        trust       INTEGER NOT NULL DEFAULT 5,
                        sent_today  INTEGER NOT NULL DEFAULT 0,
                        proxy       TEXT NOT NULL DEFAULT '—',
                        warmup      INTEGER NOT NULL DEFAULT 0,
                        created_at  REAL NOT NULL DEFAULT (unixepoch())
                    )
                """)
                conn.execute("INSERT INTO sessions SELECT id, user_id, name, phone, status, trust, sent_today, proxy, warmup, created_at FROM sessions_old")
                conn.execute("DROP TABLE sessions_old")
        except Exception as e:
            print(f"Migration error: {e}")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id          TEXT PRIMARY KEY,
                username    TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at  REAL NOT NULL DEFAULT (unixepoch())
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sent_messages (
                id          TEXT NOT NULL,
                user_id     TEXT NOT NULL,
                to_phone    TEXT NOT NULL,
                text        TEXT NOT NULL,
                zwc         INTEGER NOT NULL DEFAULT 1,
                delay_ms    INTEGER NOT NULL DEFAULT 0,
                chunk       TEXT NOT NULL,
                sent_at     TEXT NOT NULL,
                simulated   INTEGER NOT NULL DEFAULT 0,
                created_at  REAL NOT NULL DEFAULT (unixepoch())
            )
        """)
        
        # Simple migration: add user_id column if it doesn't exist (for existing databases)
        try:
            conn.execute("ALTER TABLE sessions ADD COLUMN user_id TEXT NOT NULL DEFAULT 'system'")
        except sqlite3.OperationalError:
            pass  # Column already exists
            
        try:
            conn.execute("ALTER TABLE sent_messages ADD COLUMN user_id TEXT NOT NULL DEFAULT 'system'")
        except sqlite3.OperationalError:
            pass  # Column already exists
            
        conn.commit()


# ── Sessions CRUD ──────────────────────────────────────────────────────────────

def get_all_sessions(user_id: str = None) -> list[dict]:
    with get_conn() as conn:
        if user_id:
            rows = conn.execute("SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at ASC", (user_id,)).fetchall()
        else:
            rows = conn.execute("SELECT * FROM sessions ORDER BY created_at ASC").fetchall()
        return [dict(r) for r in rows]


def get_session(session_id: str, user_id: str = None) -> dict | None:
    with get_conn() as conn:
        if user_id:
            row = conn.execute("SELECT * FROM sessions WHERE id = ? AND user_id = ?", (session_id, user_id)).fetchone()
        else:
            row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
        return dict(row) if row else None


def add_session(session_id: str, user_id: str, name: str, phone: str, enable_warmup: bool = False) -> dict:
    session = {
        "id": session_id,
        "user_id": user_id,
        "name": name,
        "phone": phone,
        "status": "disconnected",
        "trust": 5,
        "sent_today": 0,
        "proxy": "—",
        "warmup": int(enable_warmup),
        "created_at": time.time(),
    }
    with get_conn() as conn:
        conn.execute("""
            INSERT INTO sessions (id, user_id, name, phone, status, trust, sent_today, proxy, warmup, created_at)
            VALUES (:id, :user_id, :name, :phone, :status, :trust, :sent_today, :proxy, :warmup, :created_at)
        """, session)
        conn.commit()
    return session


def update_session(session_id: str, **fields):
    if not fields:
        return
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [session_id]
    with get_conn() as conn:
        conn.execute(f"UPDATE sessions SET {set_clause} WHERE id = ?", values)
        conn.commit()


def increment_sent(session_id: str):
    with get_conn() as conn:
        conn.execute("UPDATE sessions SET sent_today = sent_today + 1 WHERE id = ?", (session_id,))
        conn.commit()


def delete_session(session_id: str, user_id: str = None):
    with get_conn() as conn:
        if user_id:
            conn.execute("DELETE FROM sessions WHERE id = ? AND user_id = ?", (session_id, user_id))
        else:
            conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        conn.commit()


# ── Sent Messages ──────────────────────────────────────────────────────────────

def log_sent_message(msg_id: str, user_id: str, to: str, text: str, zwc: bool,
                     delay_ms: int, chunk: str, sent_at: str, simulated: bool):
    with get_conn() as conn:
        conn.execute("""
            INSERT INTO sent_messages (id, user_id, to_phone, text, zwc, delay_ms, chunk, sent_at, simulated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (msg_id, user_id, to, text, int(zwc), delay_ms, chunk, sent_at, int(simulated)))
        conn.commit()


def get_recent_sent(limit: int = 20, user_id: str = None) -> list[dict]:
    with get_conn() as conn:
        if user_id:
            rows = conn.execute(
                "SELECT * FROM sent_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT ?", (user_id, limit,)
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM sent_messages ORDER BY created_at DESC LIMIT ?", (limit,)
            ).fetchall()
        return [
            {
                "id": r["id"], "to": r["to_phone"], "text": r["text"],
                "zwc": bool(r["zwc"]), "delay_ms": r["delay_ms"],
                "chunk": r["chunk"], "sent_at": r["sent_at"],
                "simulated": bool(r["simulated"]),
            }
            for r in rows
        ]

# ── Users CRUD ─────────────────────────────────────────────────────────────────

def get_user_by_username(username: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        return dict(row) if row else None


def create_user(user_id: str, username: str, password_hash: str) -> dict:
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)",
            (user_id, username, password_hash)
        )
        conn.commit()
    return get_user_by_username(username)
