"""
Automated Tests for OS Control, Filesystem, Telemetry, and Process Management
"""

import os
import pytest
from pathlib import Path
from app.os_control.filesystem import list_directory, get_file_metadata, read_file, write_file, delete_file
from app.os_control.system_info import get_system_telemetry, get_detailed_system_info
from app.os_control.processes import list_processes, terminate_process, CRITICAL_SYSTEM_PROCESSES


def test_system_telemetry():
    telemetry = get_system_telemetry()
    assert "gpuPct" in telemetry
    assert "ramGb" in telemetry
    assert "mood" in telemetry
    assert telemetry["mood"] in ("nominal", "elevated", "degraded")
    assert telemetry["ramGb"] > 0


def test_detailed_system_info():
    info = get_detailed_system_info()
    assert info["cpu_count_logical"] >= 1
    assert info["ram_total_gb"] > 0


def test_filesystem_operations(tmp_path):
    test_file = Path("backend/data/test_omega_sample.txt")
    test_file.parent.mkdir(parents=True, exist_ok=True)

    # Write
    write_res = write_file(str(test_file), "Hello OMEGA test content", make_backup=False)
    assert write_res["success"] is True
    assert write_res["verified"] is True

    # Metadata
    meta_res = get_file_metadata(str(test_file))
    assert meta_res["success"] is True
    assert meta_res["size_bytes"] > 0

    # Read
    read_res = read_file(str(test_file))
    assert read_res["success"] is True
    assert read_res["content"] == "Hello OMEGA test content"

    # Delete
    del_res = delete_file(str(test_file))
    assert del_res["success"] is True
    assert del_res["verified"] is True


def test_process_inspection():
    procs = list_processes(limit=10)
    assert procs["success"] is True
    assert len(procs["processes"]) > 0


def test_safeguard_against_critical_processes():
    # Attempting to terminate PID for explorer / system must be blocked
    # Mock or pass PID for critical process check
    # Critical processes list includes explorer.exe, system, etc.
    res = terminate_process(4)  # PID 4 is always System on Windows
    assert res["success"] is False or "Refusing" in res.get("error", "") or "Access denied" in res.get("error", "")
