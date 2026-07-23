"""
Study Assistant: Source-Grounded Knowledge Retrieval and Cited Question Answering
"""

import sqlite3
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from .ingestion import get_db_connection
from ..ai.gemini_client import gemini_service
from ..events.websocket_manager import ws_manager

logger = logging.getLogger("omega.study.retrieval")


def search_study_chunks(query: str, subject: Optional[str] = None, limit: int = 5) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        keywords = [k.strip().lower() for k in query.split() if len(k.strip()) > 2]
        if not keywords:
            keywords = [query.lower()]

        # Score matching chunks by keyword hits
        cursor.execute(
            """
            SELECT c.id, c.doc_id, c.chunk_index, c.page_number, c.text, d.title as doc_title, d.subject
            FROM study_chunks c
            JOIN study_documents d ON c.doc_id = d.id
            """
        )
        all_chunks = cursor.fetchall()
        scored = []
        for r in all_chunks:
            if subject and r["subject"].lower() != subject.lower():
                continue
            text_lower = r["text"].lower()
            title_lower = r["doc_title"].lower()
            score = sum(text_lower.count(k) * 2 + title_lower.count(k) * 3 for k in keywords)
            if score > 0:
                scored.append({
                    "chunk_id": r["id"],
                    "doc_id": r["doc_id"],
                    "doc_title": r["doc_title"],
                    "subject": r["subject"],
                    "page_number": r["page_number"],
                    "text": r["text"],
                    "score": score,
                })

        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:limit]
    finally:
        conn.close()


async def answer_study_question(question: str, subject: Optional[str] = None) -> Dict[str, Any]:
    chunks = search_study_chunks(question, subject=subject, limit=4)

    if not chunks:
        context_str = "No specific lecture notes or textbooks found matching this question in your study library."
        citations = []
    else:
        context_parts = []
        citations = []
        for c in chunks:
            citation_str = f"{c['doc_title']} (Page {c['page_number']})"
            citations.append({"doc_title": c["doc_title"], "page_number": c["page_number"]})
            context_parts.append(f"--- [Source: {citation_str}] ---\n{c['text']}")
        context_str = "\n\n".join(context_parts)

        # Emit memory touch event for research/study document access
        await ws_manager.emit_memory_touch({
            "id": f"src-{chunks[0]['doc_id']}",
            "label": f"Study Notes: {chunks[0]['doc_title']}",
            "type": "source",
            "linkedTo": [chunks[0]["subject"]],
            "sourceRef": f"doc://study/{chunks[0]['doc_title']}",
            "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000),
        })

    prompt = f"""You are O.M.E.G.A Study Assistant helping a computer science student.
The student asks: "{question}"

Study Library Context:
{context_str}

Instructions:
1. Provide a clear, rigorous, educational answer grounded in the study notes above.
2. Explicitly cite the document title and page number whenever using information from the sources.
3. If the provided notes do not contain sufficient detail, state clearly what the notes cover, and then explain the rest under a heading "[General Concept Explanation]".
4. Do not fabricate citations or page numbers.
"""

    response, _ = await gemini_service.generate_response(contents=[prompt])
    answer_text = response.text or "Unable to synthesize answer."

    return {
        "success": True,
        "question": question,
        "answer": answer_text,
        "citations": citations,
        "source_chunks_count": len(chunks),
    }
