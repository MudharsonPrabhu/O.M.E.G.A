"""
Gemini Client: Robust Model Interaction with Key Rotation and Resilient Tool Calling
"""

import time
import logging
from typing import List, Dict, Any, Optional, Tuple
from google import genai
from google.genai import types

from .provider_manager import provider_manager
from ..config import settings

logger = logging.getLogger("omega.ai.gemini")


class GeminiService:
    def __init__(self):
        self.default_model = settings.gemini_model

    def _create_client(self, api_key: str) -> genai.Client:
        return genai.Client(api_key=api_key)

    async def generate_response(
        self,
        contents: Any,
        tools: Optional[List[types.Tool]] = None,
        system_instruction: Optional[str] = None,
        model: Optional[str] = None,
        max_retries: int = 3,
    ) -> Tuple[Any, int]:
        """
        Calls Gemini with automatic key rotation and bounded retries.
        Returns (response, key_index_used).
        """
        model_name = model or self.default_model
        total_keys = len(settings.get_api_keys())
        retries = min(max_retries, max(1, total_keys))

        last_error = None
        for attempt in range(retries):
            try:
                key_index, key = provider_manager.get_next_key()
            except Exception as e:
                raise RuntimeError(f"Key acquisition failed: {settings.redact_secrets(str(e))}")

            client = self._create_client(key)

            config = types.GenerateContentConfig(
                temperature=0.2,
                system_instruction=system_instruction,
            )
            if tools:
                config.tools = tools

            try:
                # Synchronous call wrapped in run_in_executor if needed or direct
                response = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=config,
                )
                provider_manager.record_success(key_index)
                return response, key_index

            except Exception as e:
                err_str = str(e)
                is_rate_limit = "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower()
                provider_manager.record_failure(key_index, err_str, is_rate_limit=is_rate_limit)
                last_error = err_str
                logger.warning(
                    f"Gemini call attempt {attempt + 1}/{retries} failed using key #{key_index}: {settings.redact_secrets(err_str)}"
                )
                time.sleep(0.5)

        raise RuntimeError(f"All Gemini retry attempts failed. Last error: {settings.redact_secrets(str(last_error))}")


gemini_service = GeminiService()
