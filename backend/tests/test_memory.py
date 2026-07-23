"""
Automated Tests for Persistent Memory System
"""

import pytest
import asyncio
from app.memory.store import save_memory, search_memory, list_memories, delete_memory


@pytest.mark.asyncio
async def test_memory_lifecycle():
    # 1. Save memory
    saved = await save_memory(
        title="Test Architectural Decision",
        content="Use SQLite for local-first graph and vector storage in OMEGA.",
        category="decision",
        tags=["architecture", "sqlite"],
    )
    assert saved["success"] is True
    mem_id = saved["memory_id"]

    # 2. List memories
    all_mems = list_memories(limit=10)
    found = any(m["id"] == mem_id for m in all_mems)
    assert found is True

    # 3. Search memory
    search_res = search_memory("Architectural Decision")
    assert search_res["success"] is True
    assert len(search_res["memories"]) >= 1

    # 4. Delete memory
    del_res = delete_memory(mem_id)
    assert del_res["success"] is True
    assert del_res["verified"] is True
