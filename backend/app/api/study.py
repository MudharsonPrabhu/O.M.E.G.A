"""
API Route: Study Assistant, Document Ingestion, Quizzes, and Analytics
"""

import shutil
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Dict, Any, List, Optional

from ..study.ingestion import ingest_document, list_study_documents
from ..study.retrieval import answer_study_question, search_study_chunks
from ..study.quiz import generate_quiz, record_quiz_answer, get_study_analytics
from ..config import settings

router = APIRouter(prefix="/study", tags=["study"])


class AskStudyRequest(BaseModel):
    question: str
    subject: Optional[str] = None


class QuizGenerateRequest(BaseModel):
    subject: str
    topic: str
    count: int = 3


class QuizAnswerRecordRequest(BaseModel):
    subject: str
    topic: str
    question: str
    user_answer: str
    correct_answer: str
    explanation: str


@router.get("/documents")
async def get_study_documents():
    return {"documents": list_study_documents()}


@router.post("/upload")
async def upload_study_document(
    file: UploadFile = File(...),
    subject: str = Form("Computer Science"),
    title: Optional[str] = Form(None),
):
    upload_dir = Path(settings.data_dir) / "study_docs"
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_path = upload_dir / file.filename
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    result = ingest_document(str(file_path), subject=subject, title=title)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to ingest document."))
    return result


@router.post("/ask")
async def ask_study(req: AskStudyRequest):
    return await answer_study_question(req.question, subject=req.subject)


@router.post("/quiz")
async def create_quiz(req: QuizGenerateRequest):
    result = await generate_quiz(subject=req.subject, topic=req.topic, count=req.count)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Quiz generation failed."))
    return result


@router.post("/quiz/record")
async def save_quiz_record(req: QuizAnswerRecordRequest):
    return record_quiz_answer(
        subject=req.subject,
        topic=req.topic,
        question=req.question,
        user_answer=req.user_answer,
        correct_answer=req.correct_answer,
        explanation=req.explanation,
    )


@router.get("/analytics")
async def study_analytics():
    return get_study_analytics()
