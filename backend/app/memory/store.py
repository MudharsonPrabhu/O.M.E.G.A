"""
Persistent Personal Memory Store (SQLite)
"""

import sqlite3
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from pathlib import Path

from ..config import settings
from ..events.websocket_manager import ws_manager

logger = logging.getLogger("omega.memory")


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.database_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_memory_db():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                category TEXT NOT NULL, -- fact, decision, preference, note, session
                tags TEXT,
                source_ref TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


init_memory_db()


async def save_memory(
    title: str,
    content: str,
    category: str = "note",
    tags: Optional[List[str]] = None,
    source_ref: Optional[str] = None,
) -> Dict[str, Any]:
    now_iso = datetime.now(timezone.utc).isoformat()
    tags_json = json.dumps(tags or [])

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO memories (title, content, category, tags, source_ref, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (title, content, category, tags_json, source_ref, now_iso, now_iso),
        )
        conn.commit()
        memory_id = cursor.lastrowid
    finally:
        conn.close()

    # Emit MemoryTouch event for live MemoryRail
    touch_data = {
        "id": f"mem-{memory_id}",
        "label": title,
        "type": "entity" if category in ("fact", "note") else "session",
        "linkedTo": tags or [category],
        "sourceRef": source_ref,
        "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000),
    }
    await ws_manager.emit_memory_touch(touch_data)

    return {
        "success": True,
        "memory_id": memory_id,
        "title": title,
        "category": category,
        "created_at": now_iso,
    }


def search_memory(query: str, category: Optional[str] = None) -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        search_pattern = f"%{query}%"
        if category:
            cursor.execute(
                """
                SELECT * FROM memories
                WHERE (title LIKE ? OR content LIKE ? OR tags LIKE ?) AND category = ?
                ORDER BY id DESC LIMIT 50
                """,
                (search_pattern, search_pattern, search_pattern, category),
            )
        else:
            cursor.execute(
                """
                SELECT * FROM memories
                WHERE title LIKE ? OR content LIKE ? OR tags LIKE ?
                ORDER BY id DESC LIMIT 50
                """,
                (search_pattern, search_pattern, search_pattern),
            )
        rows = cursor.fetchall()
        memories = [
            {
                "id": r["id"],
                "title": r["title"],
                "content": r["content"],
                "category": r["category"],
                "tags": json.loads(r["tags"] or "[]"),
                "source_ref": r["source_ref"],
                "created_at": r["created_at"],
                "updated_at": r["updated_at"],
            }
            for r in rows
        ]
        return {"success": True, "query": query, "count": len(memories), "memories": memories}
    finally:
        conn.close()


def list_memories(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM memories ORDER BY id DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        return [
            {
                "id": r["id"],
                "title": r["title"],
                "content": r["content"],
                "category": r["category"],
                "tags": json.loads(r["tags"] or "[]"),
                "source_ref": r["source_ref"],
                "created_at": r["created_at"],
                "updated_at": r["updated_at"],
            }
            for r in rows
        ]
    finally:
        conn.close()


def delete_memory(memory_id: int) -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
        conn.commit()
        deleted = cursor.rowcount > 0
        return {"success": deleted, "memory_id": memory_id, "verified": deleted}
    finally:
        conn.close()
