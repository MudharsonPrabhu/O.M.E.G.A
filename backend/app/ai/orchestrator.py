"""
Multi-Agent Orchestrator: Intent Routing, Multi-Agent Coordination, and Tool Execution Loop
"""

import time
import uuid
import logging
from typing import Dict, Any, List, Optional
from google.genai import types

from .gemini_client import gemini_service
from ..events.websocket_manager import ws_manager
from ..config import settings

logger = logging.getLogger("omega.ai.orchestrator")

SYSTEM_INSTRUCTION = """You are O.M.E.G.A (Orchestrated Multi-Expert Graph Architecture), an advanced personal AI operating environment.
You operate on the user's computer with actual OS and filesystem tools.
Rules:
1. Always be concise, direct, helpful, and precise.
2. Use tools whenever an action on the computer, filesystem, processes, terminal, memory, or study materials is requested.
3. When asked to open VS Code, run tests, read files, or check system metrics, invoke the appropriate registered tool.
4. Report true verified outcomes. Never hallucinate or pretend an operation succeeded if a tool returned an error.
5. If an operation was rejected or denied by user security permissions, inform the user clearly without complaint.
"""

AGENT_IDS = {
    "orchestrator": "agt-orchestrator",
    "research": "agt-research",
    "coding": "agt-coding",
    "data": "agt-data",
    "security": "agt-security",
    "memory": "agt-memory",
    "ui": "agt-ui",
    "scheduler": "agt-scheduler",
}


class ExecutionOrchestrator:
    def __init__(self):
        self.conversation_history: List[Any] = []

    async def _emit_agent_status(self, agent_type: str, status: str, action: str, confidence: float = 0.95):
        agent_id = AGENT_IDS.get(agent_type, f"agt-{agent_type}")
        now = int(time.time() * 1000)
        await ws_manager.emit_agent_update({
            "id": agent_id,
            "name": agent_type.capitalize(),
            "type": agent_type,
            "status": status,
            "confidence": confidence,
            "lastAction": action,
            "waveform": [0.2, 0.4, 0.7, 0.9, 0.5, 0.3] if status == "active" else [0.1, 0.1, 0.1, 0.1],
            "timestamp": now,
        })

    async def _emit_thought(self, label: str, confidence: float = 0.9, status: str = "exploring", parent_id: Optional[str] = None) -> str:
        thought_id = f"th_{uuid.uuid4().hex[:8]}"
        now = int(time.time() * 1000)
        thought_node = {
            "id": thought_id,
            "parentId": parent_id,
            "label": label,
            "confidence": confidence,
            "status": status,
            "timestamp": now,
        }
        await ws_manager.emit_thought(thought_node)
        return thought_id

    def _determine_target_agent(self, tool_name: str) -> str:
        if any(k in tool_name for k in ["code", "terminal", "file", "directory"]):
            return "coding"
        if any(k in tool_name for k in ["study", "quiz", "search_files"]):
            return "research"
        if any(k in tool_name for k in ["memory", "graph"]):
            return "memory"
        if any(k in tool_name for k in ["telemetry", "process"]):
            return "data"
        return "orchestrator"

    async def process_user_request(self, user_text: str) -> Dict[str, Any]:
        """
        Executes an end-to-end multi-agent conversational loop with tool calling.
        """
        task_id = f"tsk_{uuid.uuid4().hex[:8]}"
        start_time = time.time()

        await ws_manager.emit_task_state({
            "taskId": task_id,
            "status": "planning",
            "prompt": user_text,
        })

        # Step 1: Orchestrator initiates planning
        await self._emit_agent_status("orchestrator", "active", "parsing intent & planning", 0.98)
        th1 = await self._emit_thought(f"parsing intent: '{user_text[:40]}...'", 0.95, "exploring")

        # Step 2: Prepare tool declarations
        from ..os_control.registry import tool_registry
        gemini_tools = tool_registry.get_gemini_tools()

        # Step 3: Call Gemini with user text
        contents = [user_text]

        executed_tools = []
        final_reply_text = ""
        active_sub_agent = None

        try:
            th2 = await self._emit_thought("querying Gemini model with registered tools", 0.9, "exploring", parent_id=th1)
            response, key_idx = await gemini_service.generate_response(
                contents=contents,
                tools=gemini_tools,
                system_instruction=SYSTEM_INSTRUCTION,
            )

            # Check if Gemini wants to call tools
            function_calls = getattr(response, "function_calls", None)

            if function_calls:
                for call in function_calls:
                    tool_name = call.name
                    tool_args = dict(call.args) if call.args else {}

                    # Route to specialized agent
                    active_sub_agent = self._determine_target_agent(tool_name)
                    await self._emit_agent_status(active_sub_agent, "active", f"executing {tool_name}", 0.96)
                    th_tool = await self._emit_thought(f"routing → {active_sub_agent} agent: {tool_name}", 0.92, "exploring", parent_id=th2)

                    # Security Guard evaluates permissions
                    await self._emit_agent_status("security", "active", f"evaluating policy for {tool_name}", 0.99)
                    await ws_manager.emit_task_state({
                        "taskId": task_id,
                        "status": "running",
                        "currentTool": tool_name,
                    })

                    # Execute Tool
                    tool_execution_result = await tool_registry.execute_tool(tool_name, tool_args)
                    executed_tools.append(tool_execution_result)

                    await self._emit_agent_status("security", "idle", "monitoring", 0.95)
                    await self._emit_thought(
                        f"tool {tool_name} {tool_execution_result['status']} ({tool_execution_result['duration_ms']}ms)",
                        0.98,
                        "converged" if tool_execution_result['status'] == "completed" else "discarded",
                        parent_id=th_tool,
                    )

                    # Send function response back to Gemini for final response synthesis
                    func_response_part = types.Part.from_function_response(
                        name=tool_name,
                        response={"result": tool_execution_result.get("result") or tool_execution_result.get("error")},
                    )

                    synthesis_contents = [
                        user_text,
                        response.candidates[0].content,
                        types.Content(role="user", parts=[func_response_part]),
                    ]

                    synth_response, _ = await gemini_service.generate_response(
                        contents=synthesis_contents,
                        system_instruction=SYSTEM_INSTRUCTION,
                    )
                    final_reply_text = synth_response.text or "Action performed."

            else:
                final_reply_text = response.text or "I have processed your request."

            await self._emit_thought("converged on response", 0.99, "converged")
            await ws_manager.emit_task_state({
                "taskId": task_id,
                "status": "completed",
                "result": final_reply_text,
            })

        except Exception as e:
            err_msg = str(e)
            logger.error(f"Orchestration error: {err_msg}")
            final_reply_text = f"System Error: {settings.redact_secrets(err_msg)}"
            await self._emit_thought(f"error encountered: {settings.redact_secrets(err_msg)[:50]}", 0.5, "discarded")
            await ws_manager.emit_task_state({
                "taskId": task_id,
                "status": "failed",
                "error": settings.redact_secrets(err_msg),
            })

        finally:
            # Standby reset for agents
            await self._emit_agent_status("orchestrator", "idle", "standby", 0.95)
            if active_sub_agent:
                await self._emit_agent_status(active_sub_agent, "idle", "idle", 0.95)

        total_duration = round((time.time() - start_time) * 1000, 2)
        return {
            "task_id": task_id,
            "reply": final_reply_text,
            "tools_executed": executed_tools,
            "duration_ms": total_duration,
        }


orchestrator = ExecutionOrchestrator()
