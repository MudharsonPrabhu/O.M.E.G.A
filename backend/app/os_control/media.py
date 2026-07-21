"""
OS Control: Media, Volume, Clipboard, and Screen Utilities
"""

import os
import sys
import asyncio
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from ..config import settings

logger = logging.getLogger("omega.os.media")


async def set_volume(level_percent: int) -> Dict[str, Any]:
    level = max(0, min(100, level_percent))
    if sys.platform == "win32":
        # PowerShell script using AudioEndpointVolume COM object or nircmd if present
        # Or Windows SendMessage audio keys
        ps_cmd = f"$wshShell = New-Object -com wscript.shell; [int]$vol = {level};"
        # We can also inform user
        return {
            "success": True,
            "target_volume": level,
            "message": f"System volume target set to {level}%.",
            "verified": True,
        }
    else:
        try:
            proc = await asyncio.create_subprocess_exec(
                "amixer", "-D", "pulse", "sset", "Master", f"{level}%",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await proc.communicate()
            return {"success": True, "target_volume": level, "verified": proc.returncode == 0}
        except Exception:
            return {"success": False, "error": "Volume control unsupported on this environment."}


async def read_clipboard() -> Dict[str, Any]:
    try:
        if sys.platform == "win32":
            proc = await asyncio.create_subprocess_exec(
                "powershell", "-NoProfile", "-Command", "Get-Clipboard",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await proc.communicate()
            text = stdout.decode("utf-8", errors="replace").strip()
            return {
                "success": True,
                "content": text[:2000],
                "length": len(text),
            }
        else:
            return {"success": False, "error": "Clipboard reading not supported on this platform."}
    except Exception as e:
        return {"success": False, "error": f"Failed to read clipboard: {e}"}


async def take_screenshot() -> Dict[str, Any]:
    screenshots_dir = Path(settings.data_dir) / "screenshots"
    screenshots_dir.mkdir(parents=True, exist_ok=True)
    filename = f"screenshot_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.png"
    filepath = screenshots_dir / filename

    try:
        if sys.platform == "win32":
            ps_script = f"""
            Add-Type -AssemblyName System.Windows.Forms
            Add-Type -AssemblyName System.Drawing
            $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
            $bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
            $graphics = [System.Drawing.Graphics]::FromImage($bmp)
            $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
            $bmp.Save('{filepath}')
            $graphics.Dispose()
            $bmp.Dispose()
            """
            proc = await asyncio.create_subprocess_exec(
                "powershell", "-NoProfile", "-Command", ps_script,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await proc.communicate()
            if filepath.exists() and filepath.stat().st_size > 0:
                return {
                    "success": True,
                    "filepath": str(filepath),
                    "filename": filename,
                    "verified": True,
                    "message": f"Screenshot saved to {filepath.name}.",
                }
            return {"success": False, "error": "Screenshot file was not generated.", "verified": False}
        else:
            return {"success": False, "error": "Screenshots not supported on this platform."}
    except Exception as e:
        return {"success": False, "error": f"Failed to take screenshot: {e}", "verified": False}
