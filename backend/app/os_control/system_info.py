"""
OS Control: Real System Telemetry & Hardware Monitoring
"""

import sys
import os
import psutil
from typing import Dict, Any, Optional


def get_system_telemetry(active_tasks: int = 0, running_agents: int = 0) -> Dict[str, Any]:
    """
    Collects actual hardware and operating system metrics using psutil.
    Maps directly to the frontend SystemTelemetry contract.
    """
    cpu_pct = psutil.cpu_percent(interval=None)
    mem = psutil.virtual_memory()
    ram_gb = round(mem.used / (1024**3), 2)
    ram_pct = mem.percent

    # Disk usage
    try:
        if sys.platform == "win32":
            drive = os.path.splitdrive(sys.executable)[0] + "\\"
            disk = psutil.disk_usage(drive)
        else:
            disk = psutil.disk_usage("/")
        disk_pct = disk.percent
    except Exception:
        disk_pct = 0.0

    # Battery
    battery = psutil.sensors_battery()
    battery_pct = round(battery.percent, 1) if battery else None
    battery_charging = battery.power_plugged if battery else None

    # Derive mood based on actual CPU and RAM loads
    if cpu_pct > 85 or ram_pct > 90:
        mood = "degraded"
    elif cpu_pct > 60 or ram_pct > 75:
        mood = "elevated"
    else:
        mood = "nominal"

    return {
        "tasksActive": active_tasks,
        "agentsRunning": running_agents,
        "gpuPct": round(cpu_pct, 1),  # Displayed in header sparkline as system load
        "ramGb": ram_gb,
        "ramPct": round(ram_pct, 1),
        "diskPct": round(disk_pct, 1),
        "tokensPerSec": 0,
        "costUsd": 0.0,
        "mood": mood,
        "battery": {
            "percent": battery_pct,
            "charging": battery_charging,
        } if battery_pct is not None else None,
        "platform": sys.platform,
    }


def get_detailed_system_info() -> Dict[str, Any]:
    cpu_freq = psutil.cpu_freq()
    mem = psutil.virtual_memory()
    net = psutil.net_io_counters()

    return {
        "platform": sys.platform,
        "cpu_count_logical": psutil.cpu_count(logical=True),
        "cpu_count_physical": psutil.cpu_count(logical=False),
        "cpu_percent": psutil.cpu_percent(interval=None),
        "cpu_freq_current_mhz": round(cpu_freq.current, 1) if cpu_freq else None,
        "ram_total_gb": round(mem.total / (1024**3), 2),
        "ram_available_gb": round(mem.available / (1024**3), 2),
        "ram_used_gb": round(mem.used / (1024**3), 2),
        "ram_percent": mem.percent,
        "net_bytes_sent_mb": round(net.bytes_sent / (1024**2), 2),
        "net_bytes_recv_mb": round(net.bytes_recv / (1024**2), 2),
    }
