"""
O.M.E.G.A — Core Configuration & Environment Settings
"""

import os
import re
from pathlib import Path
from typing import List, Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_ENV_FILE = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(DEFAULT_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # API Keys & Models
    gemini_api_keys: str = Field(
        default="",
        description="Comma-separated Gemini API keys for rotation",
    )
    gemini_model: str = Field(
        default="gemini-3.8-flash",
        description="Default Gemini model to use for orchestration and conversation",
    )

    # Server settings
    host: str = "127.0.0.1"
    port: int = 8000
    environment: str = "development"
    cors_origins: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    # Storage paths
    data_dir: str = str(BACKEND_DIR / "data")
    database_path: str = str(BACKEND_DIR / "data" / "omega.db")

    # Security & Workspaces
    allowed_workspaces: str = str(BACKEND_DIR.parent)
    require_destructive_confirmation: bool = True
    max_file_size_mb: int = 50
    execution_timeout_seconds: int = 60

    def get_api_keys(self) -> List[str]:
        if not self.gemini_api_keys:
            # Check direct GEMINI_API_KEY as fallback
            single = os.getenv("GEMINI_API_KEY", "")
            return [k.strip() for k in single.split(",") if k.strip()]
        return [k.strip() for k in self.gemini_api_keys.split(",") if k.strip()]

    def get_cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    def get_allowed_workspaces(self) -> List[Path]:
        workspaces = [w.strip() for w in self.allowed_workspaces.split(",") if w.strip()]
        resolved = []
        for w in workspaces:
            p = Path(w).resolve()
            resolved.append(p)
        return resolved

    def redact_secrets(self, text: str) -> str:
        """Redacts configured API keys and bearer tokens from strings."""
        if not text:
            return text
        result = text
        for key in self.get_api_keys():
            if len(key) > 6:
                masked = key[:3] + "..." + key[-3:]
                result = result.replace(key, masked)
        # Also redact generic pattern like AQ.Ab8RN... or AIzaSy...
        result = re.sub(r'AQ\.[A-Za-z0-9_-]{20,}', '[REDACTED_API_KEY]', result)
        result = re.sub(r'AIza[0-9A-Za-z-_]{35}', '[REDACTED_API_KEY]', result)
        return result


settings = Settings()

# Ensure data directory exists
os.makedirs(settings.data_dir, exist_ok=True)
os.makedirs(Path(settings.database_path).parent, exist_ok=True)
