"""
Security Validation: Path Restrictions, Command Sanitization, and Boundary Enforcement
"""

import os
from pathlib import Path
from typing import List, Tuple, Optional
from ..config import settings

FORBIDDEN_FILES = {
    ".env",
    "id_rsa",
    "id_ed25519",
    "id_dsa",
    "known_hosts",
    "SAM",
    "SYSTEM",
}

FORBIDDEN_COMMAND_PATTERNS = [
    "format ",
    "mkfs",
    "dd if=",
    "rm -rf /",
    "del /s /q c:\\",
    "rd /s /q c:\\",
    ":(){ :|:& };:",
    "shutdown",
    "reboot",
]

APPROVED_COMMAND_BINARIES = {
    "git",
    "npm",
    "npx",
    "node",
    "python",
    "python3",
    "pytest",
    "tsc",
    "oxlint",
    "pip",
    "uv",
    "cargo",
    "go",
}


def validate_workspace_path(path_str: str) -> Tuple[bool, str, Optional[Path]]:
    """
    Validates that a given path is within the allowed workspaces and does not access forbidden files.
    Returns (is_valid, error_message, resolved_path).
    """
    if not path_str or not path_str.strip():
        return False, "Empty path provided.", None

    try:
        candidate = Path(path_str).expanduser().resolve()
    except Exception as e:
        return False, f"Invalid path syntax: {e}", None

    # Check forbidden file names
    if candidate.name in FORBIDDEN_FILES:
        return False, f"Access to sensitive file '{candidate.name}' is strictly denied.", None

    allowed_roots = settings.get_allowed_workspaces()
    is_contained = False
    for root in allowed_roots:
        try:
            # candidate is relative to root or equals root
            if candidate == root or root in candidate.parents:
                is_contained = True
                break
        except Exception:
            continue

    if not is_contained:
        allowed_str = ", ".join(str(r) for r in allowed_roots)
        return False, f"Path '{candidate}' is outside allowed workspaces: [{allowed_str}].", None

    return True, "", candidate


def validate_command_safety(command_binary: str, arguments: List[str]) -> Tuple[bool, str]:
    """
    Validates that a terminal command is approved and does not contain destructive triggers.
    """
    binary_name = Path(command_binary).name.lower().replace(".exe", "")
    if binary_name not in APPROVED_COMMAND_BINARIES:
        return (
            False,
            f"Binary '{command_binary}' is not in the approved developer whitelist: {sorted(list(APPROVED_COMMAND_BINARIES))}.",
        )

    full_cmd_str = f"{binary_name} " + " ".join(arguments).lower()
    for pattern in FORBIDDEN_COMMAND_PATTERNS:
        if pattern in full_cmd_str:
            return False, f"Command contains forbidden destructive pattern '{pattern}'."

    return True, ""
