from __future__ import annotations

import sqlite3
import threading
import time
from pathlib import Path
from typing import Any

from .models import RoomState


class SQLiteWorldStore:
    """Durable storage for authoritative room snapshots + command audit."""

    def __init__(self, db_path: str) -> None:
        self._db_path = Path(db_path)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(str(self._db_path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._init_schema()

    def _init_schema(self) -> None:
        with self._lock:
            self._conn.execute("PRAGMA journal_mode=WAL")
            self._conn.execute("PRAGMA synchronous=NORMAL")
            self._conn.execute(
                """
                CREATE TABLE IF NOT EXISTS worlds (
                    room_id TEXT PRIMARY KEY,
                    state_json TEXT NOT NULL,
                    updated_at REAL NOT NULL
                )
                """
            )
            self._conn.execute(
                """
                CREATE TABLE IF NOT EXISTS command_audit (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    room_id TEXT NOT NULL,
                    player_id TEXT NOT NULL,
                    tick INTEGER NOT NULL,
                    seq INTEGER NOT NULL,
                    command_json TEXT NOT NULL,
                    accepted INTEGER NOT NULL,
                    reason TEXT,
                    created_at REAL NOT NULL
                )
                """
            )
            self._conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_command_audit_room_created
                ON command_audit(room_id, created_at DESC)
                """
            )
            self._conn.commit()

    def save_room_state(self, state: RoomState) -> None:
        payload = state.model_dump_json(exclude_none=False)
        now = time.time()
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO worlds(room_id, state_json, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(room_id) DO UPDATE SET
                    state_json=excluded.state_json,
                    updated_at=excluded.updated_at
                """,
                (state.room_id, payload, now),
            )
            self._conn.commit()

    def load_room_state(self, room_id: str) -> RoomState | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT state_json FROM worlds WHERE room_id = ?",
                (room_id,),
            ).fetchone()
        if not row:
            return None
        return RoomState.model_validate_json(row["state_json"])

    def list_saved_rooms(self) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                """
                SELECT room_id, updated_at
                FROM worlds
                ORDER BY updated_at DESC
                """
            ).fetchall()
        return [
            {
                "room_id": row["room_id"],
                "updated_at_unix": int(row["updated_at"]),
            }
            for row in rows
        ]

    def log_command(
        self,
        *,
        room_id: str,
        player_id: str,
        tick: int,
        seq: int,
        command_json: str,
        accepted: bool,
        reason: str | None,
    ) -> None:
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO command_audit(
                    room_id, player_id, tick, seq, command_json, accepted, reason, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    room_id,
                    player_id,
                    tick,
                    seq,
                    command_json,
                    1 if accepted else 0,
                    reason,
                    time.time(),
                ),
            )
            self._conn.commit()

    def close(self) -> None:
        with self._lock:
            self._conn.close()
