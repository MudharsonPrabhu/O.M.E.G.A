"""
Study Assistant: Quiz Generation, Answer Evaluation, and Analytics
"""

import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from .ingestion import get_db_connection
from .retrieval import search_study_chunks
from ..ai.gemini_client import gemini_service

logger = logging.getLogger("omega.study.quiz")


async def generate_quiz(subject: str, topic: str, count: int = 3) -> Dict[str, Any]:
    chunks = search_study_chunks(f"{subject} {topic}", limit=3)
    context_str = "\n".join(c["text"] for c in chunks) if chunks else "General computer science topic."

    prompt = f"""Generate a {count}-question multiple-choice quiz on the subject '{subject}', topic '{topic}'.
Reference Context:
{context_str[:2000]}

Return ONLY a valid JSON object matching this schema:
{{
  "subject": "{subject}",
  "topic": "{topic}",
  "questions": [
    {{
      "id": 1,
      "question": "Question text here?",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correct_answer": "A",
      "explanation": "Why A is correct"
    }}
  ]
}}
Do not include any markdown fences or preamble.
"""

    response, _ = await gemini_service.generate_response(contents=[prompt])
    text = response.text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    try:
        data = json.loads(text)
        return {"success": True, "quiz": data}
    except Exception as e:
        logger.warning(f"Failed to parse quiz JSON: {e}. Raw text: {text}")
        return {
            "success": False,
            "error": "Failed to parse generated quiz.",
            "raw": text,
        }


def record_quiz_answer(
    subject: str,
    topic: str,
    question: str,
    user_answer: str,
    correct_answer: str,
    explanation: str,
) -> Dict[str, Any]:
    is_correct = user_answer.strip().upper() == correct_answer.strip().upper()
    now_iso = datetime.now(timezone.utc).isoformat()

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO quiz_records (subject, topic, question, user_answer, correct_answer, is_correct, explanation, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (subject, topic, question, user_answer, correct_answer, 1 if is_correct else 0, explanation, now_iso),
        )
        conn.commit()
        return {
            "success": True,
            "is_correct": is_correct,
            "explanation": explanation,
            "recorded_at": now_iso,
        }
    finally:
        conn.close()


def get_study_analytics() -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                subject,
                topic,
                COUNT(*) as total_attempts,
                SUM(is_correct) as correct_count
            FROM quiz_records
            GROUP BY subject, topic
            """
        )
        rows = cursor.fetchall()
        topics_stats = []
        weak_topics = []

        for r in rows:
            total = r["total_attempts"]
            correct = r["correct_count"] or 0
            pct = round((correct / total) * 100, 1) if total > 0 else 0
            stat = {
                "subject": r["subject"],
                "topic": r["topic"],
                "total_attempts": total,
                "correct_count": correct,
                "accuracy_pct": pct,
            }
            topics_stats.append(stat)
            if pct < 60:
                weak_topics.append(stat)

        return {
            "success": True,
            "total_questions_attempted": sum(s["total_attempts"] for s in topics_stats),
            "topic_analytics": topics_stats,
            "weak_topics": weak_topics,
        }
    finally:
        conn.close()
