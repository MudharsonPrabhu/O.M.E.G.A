"""
API Route: Natural Language Chat and Multi-Agent Orchestration
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional

from ..ai.orchestrator import orchestrator

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str = Field(..., description="User prompt or natural language command")


class ChatResponse(BaseModel):
    task_id: str
    reply: str
    tools_executed: List[Dict[str, Any]]
    duration_ms: float


@router.post("", response_model=ChatResponse)
async def handle_chat(request: ChatRequest):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    try:
        result = await orchestrator.process_user_request(request.message)
        return ChatResponse(
            task_id=result["task_id"],
            reply=result["reply"],
            tools_executed=result["tools_executed"],
            duration_ms=result["duration_ms"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
