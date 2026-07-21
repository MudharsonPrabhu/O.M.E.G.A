"""
Audit Engine: Immutable Audit Log for all OS and Agent Actions
"""

import sqlite3
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from pathlib import Path
from ..config import settings

logger = logging.getLogger("omega.audit")


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.database_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_audit_db():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                tool_name TEXT NOT NULL,
                arguments TEXT,
                status TEXT NOT NULL,
                duration_ms REAL,
                verified INTEGER NOT NULL,
                user_approved INTEGER NOT NULL,
                error_details TEXT
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


def record_audit(
    tool_name: str,
    arguments: Dict[str, Any],
    status: str,
    duration_ms: float,
    verified: bool,
    user_approved: bool,
    error_details: Optional[str] = None,
):
    try:
        sanitized_args = settings.redact_secrets(json.dumps(arguments))
        sanitized_err = settings.redact_secrets(error_details) if error_details else None
        now_iso = datetime.now(timezone.utc).isoformat()

        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO audit_logs (timestamp, tool_name, arguments, status, duration_ms, verified, user_approved, error_details)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    now_iso,
                    tool_name,
                    sanitized_args,
                    status,
                    duration_ms,
                    1 if verified else 0,
                    1 if user_approved else 0,
                    sanitized_err,
                ),
            )
            conn.commit()
        finally:
            conn.close()
    except Exception as e:
        logger.error(f"Failed to record audit log: {e}")


def get_recent_audits(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?",
            (limit,),
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


init_audit_db()
