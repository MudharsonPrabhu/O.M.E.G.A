"""
O.M.E.G.A — Core Application Entry Point
FastAPI Application, REST Routers, WebSocket Pipeline, and Telemetry Worker
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .events.websocket_manager import ws_manager
from .os_control.system_info import get_system_telemetry
from .api import (
    chat_router,
    system_router,
    actions_router,
    memory_router,
    study_router,
    graph_router,
    settings_router,
)

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("omega.main")

telemetry_task = None


async def telemetry_background_loop():
    """Background worker sending actual hardware metrics to UI every 1.5 seconds."""
    logger.info("Starting background hardware telemetry loop...")
    while True:
        try:
            if ws_manager.active_connections:
                metrics = get_system_telemetry()
                await ws_manager.emit_telemetry(metrics)
            await asyncio.sleep(1.5)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.warning(f"Telemetry broadcast warning: {e}")
            await asyncio.sleep(2.0)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global telemetry_task
    logger.info("Initializing O.M.E.G.A Core Backend...")
    telemetry_task = asyncio.create_task(telemetry_background_loop())
    yield
    logger.info("Shutting down O.M.E.G.A Core Backend...")
    if telemetry_task:
        telemetry_task.cancel()
        try:
            await telemetry_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="O.M.E.G.A Core System Interface",
    description="Orchestrated Multi-Expert Graph Architecture — AI Operating Environment",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
origins = settings.get_cors_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(chat_router, prefix="/api")
app.include_router(system_router, prefix="/api")
app.include_router(actions_router, prefix="/api")
app.include_router(memory_router, prefix="/api")
app.include_router(study_router, prefix="/api")
app.include_router(graph_router, prefix="/api")
app.include_router(settings_router, prefix="/api")


@app.websocket("/api/events")
async def websocket_events(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Immediately send current hardware telemetry on connect
        initial_telemetry = get_system_telemetry()
        await websocket.send_json({"type": "telemetry", "data": initial_telemetry})

        while True:
            # Keep connection open & handle incoming client messages (e.g. ping/pong)
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket client error: {e}")
        await ws_manager.disconnect(websocket)


@app.get("/")
async def root():
    return {
        "system": "O.M.E.G.A",
        "status": "online",
        "version": "1.0.0",
        "endpoints": {
            "docs": "/docs",
            "chat": "/api/chat",
            "telemetry": "/api/system/telemetry",
            "events_ws": "/api/events",
            "graph": "/api/graph",
            "study": "/api/study/documents",
            "memory": "/api/memory",
            "actions": "/api/actions/pending",
        },
    }
