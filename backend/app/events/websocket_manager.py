"""
WebSocket Manager for Real-Time Telemetry and Event Broadcasting
"""

import asyncio
import json
import logging
from typing import Any, Dict, Set
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger("omega.events")


class WebSocketManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total connections: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
        logger.info(f"WebSocket client disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcasts a JSON-serializable message to all connected clients."""
        payload = json.dumps(message)
        async with self._lock:
            connections = list(self.active_connections)

        for connection in connections:
            try:
                await connection.send_text(payload)
            except Exception as e:
                logger.warning(f"Error broadcasting to client: {e}")
                async with self._lock:
                    self.active_connections.discard(connection)

    async def emit_telemetry(self, telemetry: Dict[str, Any]):
        await self.broadcast({"type": "telemetry", "data": telemetry})

    async def emit_thought(self, thought: Dict[str, Any]):
        await self.broadcast({"type": "thought", "data": thought})

    async def emit_agent_update(self, agent: Dict[str, Any]):
        await self.broadcast({"type": "agent_update", "data": agent})

    async def emit_task_state(self, task_data: Dict[str, Any]):
        await self.broadcast({"type": "task_state", "data": task_data})

    async def emit_approval_request(self, approval_data: Dict[str, Any]):
        await self.broadcast({"type": "approval_request", "data": approval_data})

    async def emit_memory_touch(self, memory_data: Dict[str, Any]):
        await self.broadcast({"type": "memory_touch", "data": memory_data})


ws_manager = WebSocketManager()
