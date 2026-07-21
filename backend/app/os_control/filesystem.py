"""
OS Control: Filesystem Inspection, Search, and Safe Operations
"""

import os
import shutil
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from ..security.validation import validate_workspace_path
from ..config import settings

logger = logging.getLogger("omega.os.fs")


def list_directory(path_str: str = ".") -> Dict[str, Any]:
    valid, err, target_path = validate_workspace_path(path_str)
    if not valid or not target_path:
        return {"success": False, "error": err}

    if not target_path.exists():
        return {"success": False, "error": f"Directory '{target_path}' does not exist."}

    if not target_path.is_dir():
        return {"success": False, "error": f"Path '{target_path}' is a file, not a directory."}

    entries = []
    try:
        for entry in target_path.iterdir():
            try:
                stat = entry.stat()
                entries.append({
                    "name": entry.name,
                    "is_dir": entry.is_dir(),
                    "size_bytes": stat.st_size if not entry.is_dir() else None,
                    "modified": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
                })
            except Exception:
                continue
        # Sort directories first, then alphabetical
        entries.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))
        return {
            "success": True,
            "path": str(target_path),
            "count": len(entries),
            "entries": entries[:200],  # cap to 200 items
        }
    except Exception as e:
        return {"success": False, "error": f"Failed to list directory: {e}"}


def search_files(pattern: str, base_path_str: str = ".") -> Dict[str, Any]:
    valid, err, base_path = validate_workspace_path(base_path_str)
    if not valid or not base_path:
        return {"success": False, "error": err}

    matches = []
    try:
        for path in base_path.rglob(f"*{pattern}*"):
            if any(part.startswith(".") for part in path.parts) or "node_modules" in path.parts or ".venv" in path.parts:
                continue
            try:
                matches.append({
                    "path": str(path.relative_to(base_path)),
                    "is_dir": path.is_dir(),
                    "size_bytes": path.stat().st_size if not path.is_dir() else None,
                })
            except Exception:
                continue
            if len(matches) >= 50:
                break
        return {
            "success": True,
            "pattern": pattern,
            "base_path": str(base_path),
            "matches": matches,
            "total_found": len(matches),
        }
    except Exception as e:
        return {"success": False, "error": f"File search failed: {e}"}


def get_file_metadata(path_str: str) -> Dict[str, Any]:
    valid, err, path = validate_workspace_path(path_str)
    if not valid or not path:
        return {"success": False, "error": err}

    if not path.exists():
        return {"success": False, "error": f"Path '{path}' does not exist."}

    stat = path.stat()
    return {
        "success": True,
        "name": path.name,
        "absolute_path": str(path),
        "is_dir": path.is_dir(),
        "is_file": path.is_file(),
        "size_bytes": stat.st_size,
        "size_mb": round(stat.st_size / (1024**2), 3),
        "created": datetime.fromtimestamp(stat.st_ctime, timezone.utc).isoformat(),
        "modified": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
    }


def read_file(path_str: str, max_chars: int = 15000) -> Dict[str, Any]:
    valid, err, path = validate_workspace_path(path_str)
    if not valid or not path:
        return {"success": False, "error": err}

    if not path.is_file():
        return {"success": False, "error": f"Path '{path}' is not a file or does not exist."}

    # Size check
    file_size_mb = path.stat().st_size / (1024**2)
    if file_size_mb > settings.max_file_size_mb:
        return {
            "success": False,
            "error": f"File exceeds maximum size limit of {settings.max_file_size_mb} MB ({file_size_mb:.1f} MB).",
        }

    try:
        content = path.read_text(encoding="utf-8", errors="replace")
        truncated = len(content) > max_chars
        preview = content[:max_chars] if truncated else content
        return {
            "success": True,
            "path": str(path),
            "content": preview,
            "truncated": truncated,
            "total_chars": len(content),
        }
    except Exception as e:
        return {"success": False, "error": f"Failed to read file: {e}"}


def write_file(path_str: str, content: str, make_backup: bool = True) -> Dict[str, Any]:
    valid, err, path = validate_workspace_path(path_str)
    if not valid or not path:
        return {"success": False, "error": err}

    backup_path_str = None
    if path.exists() and make_backup:
        backup_path = path.with_suffix(f"{path.suffix}.bak")
        try:
            shutil.copy2(path, backup_path)
            backup_path_str = str(backup_path)
        except Exception as e:
            logger.warning(f"Could not create backup for {path}: {e}")

    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return {
            "success": True,
            "path": str(path),
            "size_bytes": len(content.encode("utf-8")),
            "backup_created": backup_path_str,
            "verified": path.exists() and path.stat().st_size > 0,
        }
    except Exception as e:
        return {"success": False, "error": f"Failed to write file: {e}"}


def create_directory(path_str: str) -> Dict[str, Any]:
    valid, err, path = validate_workspace_path(path_str)
    if not valid or not path:
        return {"success": False, "error": err}

    try:
        path.mkdir(parents=True, exist_ok=True)
        return {
            "success": True,
            "path": str(path),
            "verified": path.exists() and path.is_dir(),
        }
    except Exception as e:
        return {"success": False, "error": f"Failed to create directory: {e}"}


def delete_file(path_str: str) -> Dict[str, Any]:
    valid, err, path = validate_workspace_path(path_str)
    if not valid or not path:
        return {"success": False, "error": err}

    if not path.exists():
        return {"success": False, "error": f"Path '{path}' does not exist."}

    try:
        if path.is_dir():
            shutil.rmtree(path)
        else:
            path.unlink()
        return {
            "success": True,
            "deleted_path": str(path),
            "verified": not path.exists(),
        }
    except Exception as e:
        return {"success": False, "error": f"Failed to delete path: {e}"}


def find_large_files(base_path_str: str = ".", min_mb: float = 10.0) -> Dict[str, Any]:
    valid, err, base_path = validate_workspace_path(base_path_str)
    if not valid or not base_path:
        return {"success": False, "error": err}

    min_bytes = int(min_mb * 1024 * 1024)
    large_files = []

    try:
        for path in base_path.rglob("*"):
            if any(part.startswith(".") for part in path.parts) or "node_modules" in path.parts:
                continue
            try:
                if path.is_file():
                    size = path.stat().st_size
                    if size >= min_bytes:
                        large_files.append({
                            "path": str(path.relative_to(base_path)),
                            "size_mb": round(size / (1024**2), 2),
                        })
            except Exception:
                continue
            if len(large_files) >= 50:
                break
        large_files.sort(key=lambda x: x["size_mb"], reverse=True)
        return {"success": True, "base_path": str(base_path), "large_files": large_files}
    except Exception as e:
        return {"success": False, "error": f"Failed to find large files: {e}"}
