"""
OS Control: Process Inspection, Resource Usage, and Controlled Termination
"""

import sys
import psutil
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("omega.os.proc")

CRITICAL_SYSTEM_PROCESSES = {
    "system",
    "idle",
    "registry",
    "smss.exe",
    "csrss.exe",
    "wininit.exe",
    "services.exe",
    "lsass.exe",
    "svchost.exe",
    "fontdrvhost.exe",
    "winlogon.exe",
    "explorer.exe",
    "init",
    "systemd",
    "launchd",
}


def list_processes(limit: int = 25, sort_by: str = "cpu") -> Dict[str, Any]:
    processes = []
    for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_info', 'memory_percent']):
        try:
            info = proc.info
            name = info['name'] or "unknown"
            mem_mb = round(info['memory_info'].rss / (1024**2), 1) if info['memory_info'] else 0
            processes.append({
                "pid": info['pid'],
                "name": name,
                "cpu_percent": info['cpu_percent'] or 0.0,
                "memory_mb": mem_mb,
                "memory_percent": round(info['memory_percent'] or 0.0, 1),
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    if sort_by == "memory":
        processes.sort(key=lambda x: x["memory_mb"], reverse=True)
    else:
        processes.sort(key=lambda x: x["cpu_percent"], reverse=True)

    return {
        "success": True,
        "total_running": len(processes),
        "processes": processes[:limit],
    }


def find_processes_by_name(name_query: str) -> Dict[str, Any]:
    matches = []
    q = name_query.lower()
    for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_info']):
        try:
            name = proc.info['name'] or ""
            if q in name.lower():
                mem_mb = round(proc.info['memory_info'].rss / (1024**2), 1) if proc.info['memory_info'] else 0
                matches.append({
                    "pid": proc.info['pid'],
                    "name": name,
                    "cpu_percent": proc.info['cpu_percent'] or 0.0,
                    "memory_mb": mem_mb,
                })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    return {
        "success": True,
        "query": name_query,
        "matches": matches,
    }


def terminate_process(pid: int) -> Dict[str, Any]:
    try:
        proc = psutil.Process(pid)
        proc_name = proc.name().lower()

        if proc_name in CRITICAL_SYSTEM_PROCESSES:
            return {
                "success": False,
                "error": f"Refusing to terminate critical system process '{proc_name}' (PID {pid}).",
                "verified": False,
            }

        proc.terminate()
        try:
            proc.wait(timeout=3)
        except psutil.TimeoutExpired:
            proc.kill()

        verified = not psutil.pid_exists(pid)
        return {
            "success": True,
            "pid": pid,
            "name": proc_name,
            "verified": verified,
            "message": f"Successfully terminated process '{proc_name}' (PID {pid}).",
        }
    except psutil.NoSuchProcess:
        return {"success": True, "message": f"Process {pid} is no longer running.", "verified": True}
    except psutil.AccessDenied:
        return {"success": False, "error": f"Access denied to terminate PID {pid}.", "verified": False}
    except Exception as e:
        return {"success": False, "error": f"Failed to terminate PID {pid}: {e}", "verified": False}
