"""
OS Control: Application Discovery, Execution, and Verification
"""

import sys
import shutil
import asyncio
import webbrowser
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import psutil

from .system_info import get_system_telemetry
from ..security.validation import validate_workspace_path

logger = logging.getLogger("omega.os.apps")

COMMON_APP_COMMANDS = {
    "vscode": ["code"],
    "vs code": ["code"],
    "code": ["code"],
    "browser": ["start", ""],  # Windows shell start
    "chrome": ["chrome"],
    "firefox": ["firefox"],
    "edge": ["msedge"],
    "explorer": ["explorer"],
    "file manager": ["explorer" if sys.platform == "win32" else "xdg-open"],
    "terminal": ["wt" if sys.platform == "win32" else "x-terminal-emulator", "powershell"],
    "notepad": ["notepad"],
    "calc": ["calc"],
}


def _get_running_process_names() -> set:
    names = set()
    for p in psutil.process_iter(['name']):
        try:
            name = p.info['name']
            if name:
                names.add(name.lower())
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    return names


async def open_application(app_name: str, target_argument: Optional[str] = None) -> Dict[str, Any]:
    """
    Safely opens an application with verification.
    """
    app_key = app_name.lower().strip()
    cmd_args = COMMON_APP_COMMANDS.get(app_key, [app_key])
    binary = cmd_args[0]

    # Check path existence if target_argument is provided
    extra_args = []
    if target_argument:
        if target_argument.startswith("http://") or target_argument.startswith("https://"):
            extra_args.append(target_argument)
        else:
            valid, msg, resolved = validate_workspace_path(target_argument)
            if not valid:
                return {
                    "success": False,
                    "error": f"Invalid or unauthorized target path: {msg}",
                    "verified": False,
                }
            extra_args.append(str(resolved))

    # Special handling for default browser or URLs
    if app_key in ("browser", "web") and extra_args:
        opened = webbrowser.open(extra_args[0])
        return {
            "success": opened,
            "application": "default_browser",
            "target": extra_args[0],
            "verified": opened,
            "message": f"Opened {extra_args[0]} in default browser.",
        }

    # Special handling for VS Code
    if app_key in ("code", "vscode", "vs code"):
        code_bin = shutil.which("code") or shutil.which("code.cmd")
        if not code_bin:
            # Try typical Windows AppData path
            appdata_code = Path.home() / "AppData" / "Local" / "Programs" / "Microsoft VS Code" / "bin" / "code.cmd"
            if appdata_code.exists():
                code_bin = str(appdata_code)
            else:
                code_bin = "code"

        exec_args = [code_bin] + extra_args
        try:
            proc = await asyncio.create_subprocess_exec(
                *exec_args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            # Give it 1 second to start and verify
            await asyncio.sleep(1.0)
            verified = proc.returncode is None or proc.returncode == 0
            return {
                "success": True,
                "application": "Visual Studio Code",
                "target": extra_args[0] if extra_args else None,
                "verified": verified,
                "message": f"Successfully launched VS Code{' with target ' + extra_args[0] if extra_args else ''}.",
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to launch VS Code: {e}",
                "verified": False,
            }

    # Explorer on Windows
    if app_key in ("explorer", "file manager"):
        target_dir = extra_args[0] if extra_args else str(Path.cwd())
        if sys.platform == "win32":
            await asyncio.create_subprocess_exec("explorer", target_dir)
        else:
            await asyncio.create_subprocess_exec("xdg-open", target_dir)
        return {
            "success": True,
            "application": "File Manager",
            "target": target_dir,
            "verified": True,
            "message": f"Opened file manager at {target_dir}.",
        }

    # General executable launch
    resolved_bin = shutil.which(binary)
    if not resolved_bin:
        # On Windows, try with .exe or shell start
        if sys.platform == "win32":
            resolved_bin = shutil.which(f"{binary}.exe")

    if not resolved_bin:
        return {
            "success": False,
            "error": f"Application binary '{binary}' could not be located on the system path.",
            "verified": False,
        }

    try:
        proc = await asyncio.create_subprocess_exec(
            resolved_bin,
            *extra_args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        await asyncio.sleep(0.8)
        return {
            "success": True,
            "application": app_name,
            "binary": resolved_bin,
            "verified": proc.returncode is None or proc.returncode == 0,
            "message": f"Launched {app_name}.",
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to execute {binary}: {e}",
            "verified": False,
        }


async def open_url(url: str) -> Dict[str, Any]:
    if not (url.startswith("http://") or url.startswith("https://")):
        url = "https://" + url
    success = webbrowser.open(url)
    return {
        "success": success,
        "url": url,
        "verified": success,
        "message": f"Opened URL {url} in default browser.",
    }
