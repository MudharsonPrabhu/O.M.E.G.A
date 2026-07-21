"""
O.M.E.G.A Security & Permission Engine
"""

import enum
import logging
import uuid
import asyncio
from typing import Dict, Any, Optional, Set
from dataclasses import dataclass, field
from datetime import datetime, timezone

from ..config import settings
from ..events.websocket_manager import ws_manager

logger = logging.getLogger("omega.security")


class RiskCategory(str, enum.Enum):
    READ_ONLY = "read_only"
    REVERSIBLE = "reversible"
    DESTRUCTIVE = "destructive"
    SENSITIVE = "sensitive"
    PRIVILEGED = "privileged"


@dataclass
class ApprovalRequest:
    action_id: str
    tool_name: str
    arguments: Dict[str, Any]
    category: RiskCategory
    description: str
    risk_level: str
    status: str = "awaiting_approval"  # awaiting_approval, approved, rejected, timed_out
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    event: asyncio.Event = field(default_factory=asyncio.Event)


class PermissionEngine:
    def __init__(self):
        self._pending_approvals: Dict[str, ApprovalRequest] = {}
        self._tool_policies: Dict[str, RiskCategory] = {}
        self._init_default_policies()

    def _init_default_policies(self):
        # Read-only
        self._tool_policies["list_directory"] = RiskCategory.READ_ONLY
        self._tool_policies["search_files"] = RiskCategory.READ_ONLY
        self._tool_policies["read_file"] = RiskCategory.READ_ONLY
        self._tool_policies["get_file_info"] = RiskCategory.READ_ONLY
        self._tool_policies["find_large_files"] = RiskCategory.READ_ONLY
        self._tool_policies["list_processes"] = RiskCategory.READ_ONLY
        self._tool_policies["get_system_telemetry"] = RiskCategory.READ_ONLY
        self._tool_policies["search_memory"] = RiskCategory.READ_ONLY
        self._tool_policies["get_knowledge_graph"] = RiskCategory.READ_ONLY
        self._tool_policies["query_study_material"] = RiskCategory.READ_ONLY
        self._tool_policies["list_study_documents"] = RiskCategory.READ_ONLY
        self._tool_policies["get_quiz_questions"] = RiskCategory.READ_ONLY

        # Reversible / Mild
        self._tool_policies["open_application"] = RiskCategory.REVERSIBLE
        self._tool_policies["open_url"] = RiskCategory.REVERSIBLE
        self._tool_policies["create_file"] = RiskCategory.REVERSIBLE
        self._tool_policies["write_file"] = RiskCategory.REVERSIBLE
        self._tool_policies["create_directory"] = RiskCategory.REVERSIBLE
        self._tool_policies["save_memory"] = RiskCategory.REVERSIBLE
        self._tool_policies["delete_memory"] = RiskCategory.REVERSIBLE
        self._tool_policies["set_volume"] = RiskCategory.REVERSIBLE

        # Destructive
        self._tool_policies["delete_file"] = RiskCategory.DESTRUCTIVE
        self._tool_policies["delete_directory"] = RiskCategory.DESTRUCTIVE
        self._tool_policies["terminate_process"] = RiskCategory.DESTRUCTIVE

        # Sensitive
        self._tool_policies["execute_terminal_command"] = RiskCategory.SENSITIVE
        self._tool_policies["read_clipboard"] = RiskCategory.SENSITIVE
        self._tool_policies["take_screenshot"] = RiskCategory.SENSITIVE

    def register_tool_policy(self, tool_name: str, category: RiskCategory):
        self._tool_policies[tool_name] = category

    def get_tool_category(self, tool_name: str) -> RiskCategory:
        return self._tool_policies.get(tool_name, RiskCategory.PRIVILEGED)

    def requires_approval(self, tool_name: str) -> bool:
        category = self.get_tool_category(tool_name)
        if category in (RiskCategory.DESTRUCTIVE, RiskCategory.PRIVILEGED, RiskCategory.SENSITIVE):
            return True
        if category == RiskCategory.REVERSIBLE and settings.require_destructive_confirmation:
            return False
        return False

    async def request_approval(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        description: str,
        timeout_seconds: int = 45,
    ) -> bool:
        action_id = f"act_{uuid.uuid4().hex[:10]}"
        category = self.get_tool_category(tool_name)
        req = ApprovalRequest(
            action_id=action_id,
            tool_name=tool_name,
            arguments=arguments,
            category=category,
            description=description,
            risk_level=category.value,
        )
        self._pending_approvals[action_id] = req

        # Emit websocket event for UI modal/banner
        await ws_manager.emit_approval_request({
            "action_id": action_id,
            "tool_name": tool_name,
            "arguments": arguments,
            "category": category.value,
            "description": description,
            "created_at": req.created_at,
            "timeout_seconds": timeout_seconds,
        })

        try:
            await asyncio.wait_for(req.event.wait(), timeout=timeout_seconds)
            return req.status == "approved"
        except asyncio.TimeoutError:
            req.status = "timed_out"
            logger.warning(f"Approval request {action_id} timed out after {timeout_seconds}s")
            return False
        finally:
            self._pending_approvals.pop(action_id, None)

    def resolve_approval(self, action_id: str, approved: bool) -> bool:
        req = self._pending_approvals.get(action_id)
        if not req:
            return False
        req.status = "approved" if approved else "rejected"
        req.event.set()
        return True

    def get_pending_approvals(self) -> list:
        return [
            {
                "action_id": r.action_id,
                "tool_name": r.tool_name,
                "arguments": r.arguments,
                "category": r.category.value,
                "description": r.description,
                "created_at": r.created_at,
            }
            for r in self._pending_approvals.values()
            if r.status == "awaiting_approval"
        ]


permission_engine = PermissionEngine()
