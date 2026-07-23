from .chat import router as chat_router
from .system import router as system_router
from .actions import router as actions_router
from .memory import router as memory_router
from .study import router as study_router
from .graph import router as graph_router
from .settings import router as settings_router

__all__ = [
    "chat_router",
    "system_router",
    "actions_router",
    "memory_router",
    "study_router",
    "graph_router",
    "settings_router",
]
