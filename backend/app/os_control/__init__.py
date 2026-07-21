from .registry import tool_registry
from .system_info import get_system_telemetry, get_detailed_system_info
from .applications import open_application, open_url
from .filesystem import (
    list_directory,
    search_files,
    get_file_metadata,
    read_file,
    write_file,
    create_directory,
    delete_file,
    find_large_files,
)
from .processes import list_processes, find_processes_by_name, terminate_process
from .terminal import execute_terminal_command
from .media import set_volume, read_clipboard, take_screenshot

__all__ = [
    "tool_registry",
    "get_system_telemetry",
    "get_detailed_system_info",
    "open_application",
    "open_url",
    "list_directory",
    "search_files",
    "get_file_metadata",
    "read_file",
    "write_file",
    "create_directory",
    "delete_file",
    "find_large_files",
    "list_processes",
    "find_processes_by_name",
    "terminate_process",
    "execute_terminal_command",
    "set_volume",
    "read_clipboard",
    "take_screenshot",
]
