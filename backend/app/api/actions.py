"""
API Route: Security Actions, Approvals, and Audit Logs
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List

from ..security.permissions import permission_engine
from ..security.audit import get_recent_audits

router = APIRouter(prefix="/actions", tags=["actions"])


@router.get("/pending")
async def get_pending_actions():
    return {"pending": permission_engine.get_pending_approvals()}


@router.post("/{action_id}/approve")
async def approve_action(action_id: str):
    success = permission_engine.resolve_approval(action_id, approved=True)
    if not success:
        raise HTTPException(status_code=404, detail=f"Action '{action_id}' not found or already resolved.")
    return {"success": True, "action_id": action_id, "status": "approved"}


@router.post("/{action_id}/reject")
async def reject_action(action_id: str):
    success = permission_engine.resolve_approval(action_id, approved=False)
    if not success:
        raise HTTPException(status_code=404, detail=f"Action '{action_id}' not found or already resolved.")
    return {"success": True, "action_id": action_id, "status": "rejected"}


@router.get("/audit")
async def get_audit_trail(limit: int = 50):
    return {"audit_logs": get_recent_audits(limit)}
