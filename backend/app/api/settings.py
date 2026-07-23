"""
API Route: Settings, Key Diagnostics, and System Health
"""

import sqlite3
from fastapi import APIRouter
from typing import Dict, Any

from ..ai.provider_manager import provider_manager
from ..config import settings

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/keys")
async def get_key_status():
    return provider_manager.get_status()


@router.get("/health")
async def get_health():
    db_ok = False
    try:
        conn = sqlite3.connect(settings.database_path)
        conn.execute("SELECT 1")
        conn.close()
        db_ok = True
    except Exception:
        db_ok = False

    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "error",
        "gemini_keys_configured": len(settings.get_api_keys()),
        "model": settings.gemini_model,
        "environment": settings.environment,
    }
