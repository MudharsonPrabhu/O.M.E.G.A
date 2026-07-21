"""
Gemini Provider Manager: Multi-Key Deterministic Rotation, Cooldowns, and Health Tracking
"""

import time
import logging
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from ..config import settings

logger = logging.getLogger("omega.ai.provider")


@dataclass
class KeyHealth:
    index: int
    masked_key: str
    is_healthy: bool = True
    cooldown_until: float = 0.0
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    last_error: Optional[str] = None
    last_used: float = 0.0


class ProviderManager:
    def __init__(self, cooldown_duration: float = 60.0):
        self.cooldown_duration = cooldown_duration
        self._current_index = 0
        self._keys: List[str] = settings.get_api_keys()
        self._health: Dict[int, KeyHealth] = {}
        self._init_health()

    def _mask_key(self, key: str) -> str:
        if len(key) <= 8:
            return "***"
        return f"{key[:4]}...{key[-4:]}"

    def _init_health(self):
        self._keys = settings.get_api_keys()
        self._health = {}
        for idx, key in enumerate(self._keys):
            self._health[idx] = KeyHealth(
                index=idx,
                masked_key=self._mask_key(key),
            )

    def reload_keys(self):
        self._init_health()

    def has_keys(self) -> bool:
        return len(self._keys) > 0

    def get_next_key(self) -> Tuple[int, str]:
        """
        Selects the next available key using round-robin over non-cooling keys.
        Raises RuntimeError if no keys configured or all in cooldown.
        """
        if not self._keys:
            raise RuntimeError("No Gemini API keys configured. Set GEMINI_API_KEYS in backend/.env.")

        now = time.time()
        num_keys = len(self._keys)

        # Check round robin starting from _current_index
        for i in range(num_keys):
            idx = (self._current_index + i) % num_keys
            health = self._health[idx]
            if health.cooldown_until <= now:
                self._current_index = (idx + 1) % num_keys
                health.last_used = now
                health.total_requests += 1
                return idx, self._keys[idx]

        # If all keys are in cooldown, pick the one with earliest expiration
        earliest_idx = min(self._health.keys(), key=lambda k: self._health[k].cooldown_until)
        wait_time = max(0.1, self._health[earliest_idx].cooldown_until - now)
        logger.warning(f"All Gemini keys currently in cooldown. Earliest key available in {wait_time:.1f}s")
        # Return earliest key anyway, letting caller handle or retry
        self._current_index = (earliest_idx + 1) % num_keys
        return earliest_idx, self._keys[earliest_idx]

    def record_success(self, key_index: int):
        if key_index in self._health:
            h = self._health[key_index]
            h.successful_requests += 1
            h.is_healthy = True
            h.last_error = None
            h.cooldown_until = 0.0

    def record_failure(self, key_index: int, error_msg: str, is_rate_limit: bool = False):
        if key_index in self._health:
            h = self._health[key_index]
            h.failed_requests += 1
            h.last_error = settings.redact_secrets(error_msg)
            if "401" in error_msg or "UNAUTHENTICATED" in error_msg:
                h.is_healthy = False
                h.cooldown_until = float("inf")  # permanently disable invalid key
                logger.warning(f"Gemini key #{key_index} ({h.masked_key}) is unauthenticated/invalid. Permanently disabled.")
            elif is_rate_limit:
                h.is_healthy = False
                h.cooldown_until = time.time() + self.cooldown_duration
                logger.warning(
                    f"Gemini key #{key_index} ({h.masked_key}) rate-limited. Placed in cooldown for {self.cooldown_duration}s."
                )
            else:
                h.is_healthy = False
                h.cooldown_until = time.time() + 10.0  # short 10s cooldown for transient 503/errors

    def get_status(self) -> Dict:
        now = time.time()
        return {
            "total_keys": len(self._keys),
            "keys": [
                {
                    "index": h.index,
                    "masked_key": h.masked_key,
                    "is_healthy": h.is_healthy and h.cooldown_until <= now,
                    "cooldown_remaining_sec": max(0, round(h.cooldown_until - now, 1)),
                    "total_requests": h.total_requests,
                    "successful_requests": h.successful_requests,
                    "failed_requests": h.failed_requests,
                    "last_error": h.last_error,
                }
                for h in self._health.values()
            ],
        }


provider_manager = ProviderManager()
