"""
OS Control: Developer Terminal & Structured Command Execution
"""

import asyncio
import time
import shutil
import logging
from typing import Dict, Any, List
from pathlib import Path

from ..security.validation import validate_workspace_path, validate_command_safety
from ..config import settings

logger = logging.getLogger("omega.os.term")


async def execute_terminal_command(
    command_binary: str,
    arguments: List[str],
    cwd_path: str = ".",
    timeout_seconds: int = 45,
) -> Dict[str, Any]:
    """
    Executes an approved developer command safely without arbitrary shell interpolation.
    """
    # 1. Validate safety of the command
    safe, msg = validate_command_safety(command_binary, arguments)
    if not safe:
        return {
            "success": False,
            "error": f"Command security validation failed: {msg}",
            "verified": False,
        }

    # 2. Validate working directory
    valid, err, resolved_cwd = validate_workspace_path(cwd_path)
    if not valid or not resolved_cwd:
        return {
            "success": False,
            "error": f"Invalid working directory: {err}",
            "verified": False,
        }

    # 3. Locate binary on system
    bin_path = shutil.which(command_binary)
    if not bin_path:
        # Check npm / npx .cmd on Windows
        bin_path = shutil.which(f"{command_binary}.cmd") or shutil.which(f"{command_binary}.exe")

    if not bin_path:
        return {
            "success": False,
            "error": f"Command binary '{command_binary}' not found on system PATH.",
            "verified": False,
        }

    start_time = time.time()
    try:
        proc = await asyncio.create_subprocess_exec(
            bin_path,
            *arguments,
            cwd=str(resolved_cwd),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                proc.communicate(),
                timeout=timeout_seconds,
            )
        except asyncio.TimeoutError:
            proc.kill()
            return {
                "success": False,
                "error": f"Command execution timed out after {timeout_seconds} seconds.",
                "duration_ms": round((time.time() - start_time) * 1000, 2),
                "verified": False,
            }

        duration_ms = round((time.time() - start_time) * 1000, 2)
        stdout_str = stdout_bytes.decode("utf-8", errors="replace")
        stderr_str = stderr_bytes.decode("utf-8", errors="replace")

        # Redact any accidental tokens/secrets from logs
        stdout_str = settings.redact_secrets(stdout_str)
        stderr_str = settings.redact_secrets(stderr_str)

        exit_code = proc.returncode
        success = exit_code == 0

        return {
            "success": success,
            "exit_code": exit_code,
            "stdout": stdout_str,
            "stderr": stderr_str,
            "duration_ms": duration_ms,
            "command": f"{command_binary} " + " ".join(arguments),
            "cwd": str(resolved_cwd),
            "verified": True,
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to execute command: {e}",
            "duration_ms": round((time.time() - start_time) * 1000, 2),
            "verified": False,
        }
