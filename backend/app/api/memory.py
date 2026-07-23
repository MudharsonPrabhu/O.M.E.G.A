"""
API Route: Persistent Personal Memory Management
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, Any, List, Optional

from ..memory.store import save_memory, search_memory, list_memories, delete_memory

router = APIRouter(prefix="/memory", tags=["memory"])


class MemoryCreateRequest(BaseModel):
    title: str
    content: str
    category: str = "note"
    tags: Optional[List[str]] = None
    source_ref: Optional[str] = None


@router.get("")
async def get_memories(limit: int = 50):
    return {"memories": list_memories(limit)}


@router.post("")
async def create_memory(req: MemoryCreateRequest):
    return await save_memory(
        title=req.title,
        content=req.content,
        category=req.category,
        tags=req.tags,
        source_ref=req.source_ref,
    )


@router.get("/search")
async def find_memories(q: str = Query(..., min_length=1), category: Optional[str] = None):
    return search_memory(q, category=category)


@router.delete("/{memory_id}")
async def remove_memory(memory_id: int):
    result = delete_memory(memory_id)
    if not result["success"]:
        raise HTTPException(status_code=404, detail="Memory not found.")
    return result
