# db.py
import sqlite3
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any

DB_PATH = Path(__file__).parent / "secure_timing.db"

_conn: sqlite3.Connection | None = None


def get_conn() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        _conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        _conn.row_factory = sqlite3.Row
    return _conn


def ensure_tables() -> None:
    conn = get_conn()
    cur = conn.cursor()

    # Simple devices table (used by device_hub)
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS devices (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            cone_id     TEXT,
            ip          TEXT,
            last_seen   TEXT,
            mode        TEXT
        )
        """
    )

    # Event log (security / connection events)
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS events (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            ts        TEXT,
            level     TEXT,
            device    TEXT,
            message   TEXT
        )
        """
    )

    # Saved runs: 1 runner + up to 2 cones for now
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS runs (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at  TEXT,
            runner      TEXT,
            mode        TEXT,
            cone1_id    TEXT,
            cone1_ts    TEXT,
            cone2_id    TEXT,
            cone2_ts    TEXT
        )
        """
    )

    conn.commit()


# --- small helpers used by device_hub / app ---------------------------------


def log_event(level: str, device: str, message: str) -> None:
    conn = get_conn()
    conn.execute(
        "INSERT INTO events (ts, level, device, message) VALUES (?,?,?,?)",
        (datetime.utcnow().isoformat(timespec="seconds"), level, device, message),
    )
    conn.commit()


def save_run(runner: str, mode: str, stamps: List[Dict[str, Any]]) -> int:
    """
    stamps: list of dicts like
      { "device_id": "ESP32-01", "device_label": "1. ESP32-01", "ts_iso": "..." }
    We collapse them to first stamp per device and store up to 2 devices.
    """
    if not stamps:
        raise ValueError("No stamps provided")

    per_device: dict[str, str] = {}
    for s in stamps:
        dev = s.get("device_label") or s.get("device_id")
        ts_iso = s.get("ts_iso")
        if dev and ts_iso and dev not in per_device:
            per_device[dev] = ts_iso

    ordered = list(per_device.items())
    cone1_id, cone1_ts = (ordered[0][0], ordered[0][1]) if len(ordered) > 0 else (None, None)
    cone2_id, cone2_ts = (ordered[1][0], ordered[1][1]) if len(ordered) > 1 else (None, None)

    conn = get_conn()
    cur = conn.execute(
        """
        INSERT INTO runs (created_at, runner, mode, cone1_id, cone1_ts, cone2_id, cone2_ts)
        VALUES (?,?,?,?,?,?,?)
        """,
        (
            datetime.utcnow().isoformat(timespec="seconds"),
            runner,
            mode,
            cone1_id,
            cone1_ts,
            cone2_id,
            cone2_ts,
        ),
    )
    conn.commit()
    return int(cur.lastrowid)


def list_runs(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_conn()
    cur = conn.execute(
        "SELECT id, created_at, runner, mode, cone1_id, cone1_ts, cone2_id, cone2_ts "
        "FROM runs ORDER BY id DESC LIMIT ?",
        (limit,),
    )
    rows = cur.fetchall()
    return [dict(r) for r in rows]
