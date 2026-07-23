"""
Study Assistant: Document Ingestion, PDF Processing, Text Chunking, and Indexing
"""

import sqlite3
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import pypdf

from ..config import settings
from ..security.validation import validate_workspace_path

logger = logging.getLogger("omega.study.ingestion")


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.database_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_study_db():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS study_documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                subject TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_type TEXT NOT NULL,
                total_pages INTEGER DEFAULT 1,
                created_at TEXT NOT NULL
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS study_chunks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                doc_id INTEGER NOT NULL,
                chunk_index INTEGER NOT NULL,
                page_number INTEGER,
                chapter TEXT,
                text TEXT NOT NULL,
                FOREIGN KEY (doc_id) REFERENCES study_documents (id) ON DELETE CASCADE
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS quiz_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject TEXT NOT NULL,
                topic TEXT NOT NULL,
                question TEXT NOT NULL,
                user_answer TEXT,
                correct_answer TEXT,
                is_correct INTEGER,
                explanation TEXT,
                timestamp TEXT NOT NULL
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


init_study_db()


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 150) -> List[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end].strip())
        start = end - overlap
        if start >= len(text) - overlap:
            break
    return [c for c in chunks if c]


def ingest_document(file_path_str: str, subject: str = "Computer Science", title: Optional[str] = None) -> Dict[str, Any]:
    valid, err, path = validate_workspace_path(file_path_str)
    if not valid or not path:
        return {"success": False, "error": err}

    if not path.is_file():
        return {"success": False, "error": f"Document '{path}' not found."}

    doc_title = title or path.stem.replace("_", " ").title()
    suffix = path.suffix.lower()
    now_iso = datetime.now(timezone.utc).isoformat()

    extracted_pages: List[Dict[str, Any]] = []

    try:
        if suffix == ".pdf":
            reader = pypdf.PdfReader(str(path))
            total_pages = len(reader.pages)
            for idx, page in enumerate(reader.pages):
                page_text = page.extract_text() or ""
                if page_text.strip():
                    extracted_pages.append({"page_number": idx + 1, "text": page_text})
        elif suffix in (".md", ".txt", ".py", ".ts", ".tsx", ".json"):
            text = path.read_text(encoding="utf-8", errors="replace")
            total_pages = 1
            extracted_pages.append({"page_number": 1, "text": text})
        else:
            return {"success": False, "error": f"Unsupported file extension '{suffix}'."}

        if not extracted_pages or all(not p["text"].strip() for p in extracted_pages):
            return {
                "success": False,
                "error": "No extractable text found in file. Scanned PDFs require an OCR engine.",
            }

        # Save document metadata
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO study_documents (title, subject, file_path, file_type, total_pages, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (doc_title, subject, str(path), suffix, total_pages, now_iso),
            )
            doc_id = cursor.lastrowid

            # Save chunks
            chunk_count = 0
            for page in extracted_pages:
                page_chunks = chunk_text(page["text"])
                for chunk in page_chunks:
                    cursor.execute(
                        """
                        INSERT INTO study_chunks (doc_id, chunk_index, page_number, chapter, text)
                        VALUES (?, ?, ?, ?, ?)
                        """,
                        (doc_id, chunk_count, page["page_number"], None, chunk),
                    )
                    chunk_count += 1

            conn.commit()
            return {
                "success": True,
                "doc_id": doc_id,
                "title": doc_title,
                "subject": subject,
                "pages": total_pages,
                "chunks_indexed": chunk_count,
            }
        finally:
            conn.close()

    except Exception as e:
        logger.error(f"Failed to ingest document {path}: {e}")
        return {"success": False, "error": f"Failed to ingest document: {e}"}


def list_study_documents() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT d.*, COUNT(c.id) as chunk_count
            FROM study_documents d
            LEFT JOIN study_chunks c ON d.id = c.doc_id
            GROUP BY d.id
            ORDER BY d.id DESC
            """
        )
        return [dict(r) for r in cursor.fetchall()]
    finally:
        conn.close()
