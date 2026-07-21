"""
API Route: Real System Telemetry & Metrics
"""

from fastapi import APIRouter
from typing import Dict, Any

from ..os_control.system_info import get_system_telemetry, get_detailed_system_info

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/telemetry")
async def telemetry():
    return get_system_telemetry()


@router.get("/info")
async def system_info():
    return get_detailed_system_info()
